/* ============================================================
   خدمة حفظ البيانات
   - الحفظ المحلي فوري (يحمي من تحديث الصفحة)، ويعمل مخزنًا مؤقتًا فقط.
   - في الوضع المركزي: صندوق إرسال (outbox) يُرسل للخادم ويُعاد إرساله تلقائيًا
     عند الفشل، ولا تُعلن «تم الحفظ» إلا بعد تأكيد الخادم.
   ============================================================ */
(function () {
  const CFG = window.MDQ_CONFIG || {};
  const URL = (CFG.BACKEND_URL || '').trim();
  const K = { session: 'mdq.session.v1', log: 'mdq.log.v1', outbox: 'mdq.outbox.v1', settings: 'mdq.settings.v1', demo: 'mdq.demo.v1', token: 'mdq.tkn.v1' };

  /* ---------- مخزن آمن (يتحمل تعطل localStorage) ---------- */
  const mem = {};
  let persistent = true;
  try { const t = '__mdq'; localStorage.setItem(t, '1'); localStorage.removeItem(t); } catch (e) { persistent = false; }
  const store = {
    persistent,
    get(key, def) {
      try {
        const raw = persistent ? localStorage.getItem(key) : mem[key];
        return raw == null ? def : JSON.parse(raw);
      } catch (e) { return def; }
    },
    set(key, val) {
      const raw = JSON.stringify(val);
      try { if (persistent) localStorage.setItem(key, raw); else mem[key] = raw; return true; }
      catch (e) { mem[key] = raw; return false; }
    },
    del(key) { try { if (persistent) localStorage.removeItem(key); delete mem[key]; } catch (e) {} }
  };

  /* ---------- الإعدادات ---------- */
  const settings = {
    _remote: null,
    get() {
      const base = JSON.parse(JSON.stringify(CFG.DEFAULT_SETTINGS || {}));
      const saved = this._remote || store.get(K.settings, {});
      const out = Object.assign({}, base, saved || {});
      if (!out.classOptions || !out.classOptions.length) out.classOptions = base.classOptions; // قائمة الفصول الثابتة لا تُلغى بإعداد قديم فارغ
      return out;
    },
    saveLocal(obj) { store.set(K.settings, obj); },
    async loadRemote() {
      if (!URL) return;
      try {
        const r = await fetch(URL + '?action=config', { method: 'GET' });
        const j = await r.json();
        if (j && j.ok && j.settings) { this._remote = j.settings; store.set(K.settings, j.settings); }
      } catch (e) { /* تُستخدم آخر إعدادات محفوظة */ this._remote = store.get(K.settings, null); }
    }
  };

  /* ---------- المزامنة ---------- */
  const listeners = [];
  const sync = {
    mode: (MDQ.forms && MDQ.forms.configured) ? 'forms' : URL ? 'remote' : 'local',
    status: (MDQ.forms && MDQ.forms.configured) || URL ? 'pending' : 'unconfigured',
    lastError: '',
    onStatus(fn) { listeners.push(fn); fn(this.status, this.pendingCount()); },
    _set(st, err) { this.status = st; this.lastError = err || ''; listeners.forEach(f => f(st, this.pendingCount(), err)); },
    pendingCount() { return (store.get(K.outbox, []) || []).length; },

    record(evt) {
      const log = store.get(K.log, []); log.push(evt); store.set(K.log, log);
      if (this.mode === 'remote' || this.mode === 'forms') {
        const ob = store.get(K.outbox, []); ob.push(evt); store.set(K.outbox, ob);
        this._set('pending');
        this.flushSoon();
      } else {
        this._set(store.persistent ? 'unconfigured' : 'memory');
      }
    },
    _timer: null, _busy: false, _backoff: 4000,
    flushSoon(ms) { clearTimeout(this._timer); this._timer = setTimeout(() => this.flush(), ms == null ? 300 : ms); },
    async flush() {
      if (this.mode === 'forms') return this.flushForms();
      if (this.mode !== 'remote' || this._busy) return;
      const ob = store.get(K.outbox, []);
      if (!ob.length) { this._set('synced'); return; }
      if (navigator.onLine === false) { this._set('offline'); return; }
      this._busy = true;
      const batch = ob.slice(0, 25);
      try {
        const retry = batch.some(e => e._tries);
        const r = await fetch(URL, { method: 'POST', body: JSON.stringify({ action: 'log', retry, events: batch.map(e => { const c = Object.assign({}, e); delete c._tries; return c; }) }) });
        const j = await r.json();
        if (!j || !j.ok) throw new Error((j && j.error) || 'رد غير متوقع من الخادم');
        const done = new Set([...(j.accepted || []), ...((j.rejected || []).map(x => x.id))]);
        if ((j.rejected || []).length) {
          const rej = store.get('mdq.rejected.v1', []); rej.push(...j.rejected); store.set('mdq.rejected.v1', rej);
        }
        const rest = store.get(K.outbox, []).filter(e => !done.has(e.eventId));
        store.set(K.outbox, rest);
        this._backoff = 4000;
        this._busy = false;
        if (rest.length) this.flushSoon(200); else this._set('synced');
      } catch (e) {
        this._busy = false;
        const ob2 = store.get(K.outbox, []); const ids = new Set(batch.map(x => x.eventId));
        ob2.forEach(x => { if (ids.has(x.eventId)) x._tries = (x._tries || 0) + 1; }); store.set(K.outbox, ob2);
        this._set(navigator.onLine === false ? 'offline' : 'error', String(e.message || e));
        this._backoff = Math.min(this._backoff * 2, 60000);
        this.flushSoon(this._backoff);
      }
    }
  };
  /** نماذج Google: رد مستقل لكل حدث. لا يمكن قراءة رد Google (no-cors)،
      لذلك تُعرض «أُرسلت» بعد نجاح الإرسال، ويبقى الحدث في صندوق الإرسال إن فشل الاتصال. */
  sync.flushForms = async function () {
    if (this._busy) return;
    const ob = store.get(K.outbox, []);
    if (!ob.length) { this._set('sent'); return; }
    if (navigator.onLine === false) { this._set('offline'); return; }
    this._busy = true;
    try {
      for (const e of ob.slice(0, 10)) {
        const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 15000);
        try {
          const c = Object.assign({}, e); delete c._tries;
          await fetch(MDQ.forms.cfg.formUrl, { method: 'POST', mode: 'no-cors', body: MDQ.forms.encode(c), signal: ctl.signal });
        } finally { clearTimeout(tm); }
        store.set(K.outbox, store.get(K.outbox, []).filter(x => x.eventId !== e.eventId));
        await new Promise(r => setTimeout(r, 250));
      }
      this._busy = false; this._backoff = 4000;
      if (this.pendingCount()) this.flushSoon(200); else this._set('sent');
    } catch (err) {
      this._busy = false;
      this._set(navigator.onLine === false ? 'offline' : 'error', String(err.message || err));
      this._backoff = Math.min(this._backoff * 2, 60000);
      this.flushSoon(this._backoff);
    }
  };
  window.addEventListener('online', () => sync.flushSoon(100));
  window.addEventListener('offline', () => { if (sync.mode !== 'local') sync._set('offline'); });
  if (sync.mode !== 'local') setInterval(() => { if (sync.pendingCount()) sync.flush(); }, 20000);

  /* ---------- الاتصال بالخادم (التحقق من الرقم السري يتم في الخادم فقط) ---------- */
  const api = {
    enabled: !!URL && sync.mode === 'remote',
    async call(payload) {
      let r;
      try { r = await fetch(URL, { method: 'POST', body: JSON.stringify(payload) }); }
      catch (e) { const err = new Error('تعذر الاتصال بالخادم. تحققي من الإنترنت ثم أعيدي المحاولة.'); err.code = 'network'; throw err; }
      let j; try { j = await r.json(); } catch (e) { const err = new Error('رد غير متوقع من الخادم'); err.code = 'bad_response'; throw err; }
      if (!j.ok) { const err = new Error(j.error || 'تعذر تنفيذ الطلب'); err.code = j.code; throw err; }
      return j;
    },
    login(pin) { return this.call({ action: 'login', pin }); },
    whoami(token) { return this.call({ action: 'whoami', token }); },
    logout(token) { return this.call({ action: 'logout', token }); },
    teacherData(token) { return this.call({ action: 'teacherData', token }); },
    saveSettings(token, s) { return this.call({ action: 'saveSettings', token, settings: s }); },
    studentProgress(code) { return this.call({ action: 'studentProgress', code }); },
    /** إشعار نهاية الجلسة عند إغلاق الصفحة (أفضل جهد) */
    beacon(evt) { if (sync.mode === 'forms') return MDQ.forms.beacon(evt); try { if (URL && navigator.sendBeacon) navigator.sendBeacon(URL, JSON.stringify({ action: 'log', events: [evt] })); } catch (e) {} }
  };

  /* ---------- جلسة المعلمة (رمز مؤقت يصدره الخادم؛ في sessionStorage فقط) ---------- */
  const teacherSession = {
    get() { try { const t = JSON.parse(sessionStorage.getItem(K.token) || 'null'); if (t && t.exp > Date.now()) return t; sessionStorage.removeItem(K.token); } catch (e) {} return null; },
    set(token, exp) { try { sessionStorage.setItem(K.token, JSON.stringify({ token, exp })); } catch (e) {} },
    clear() { try { sessionStorage.removeItem(K.token); } catch (e) {} }
  };

  /* ---------- حفظ ملف للمستخدم ---------- */
  async function saveFile(filename, blob) {
    // داخل بيئة Claude Artifacts: قدرة التنزيل الرسمية
    if (window.claude && typeof window.claude.use === 'function') {
      try {
        const dl = await Promise.race([window.claude.use('downloads'), new Promise(r => setTimeout(() => r(null), 4000))]);
        if (dl) { await dl.save({ filename, data: blob }); return 'saved'; }
      } catch (e) {
        if (e && e.code === 'declined') return 'declined';
        if (e && e.code && e.code !== 'unavailable') throw e;
      }
    }
    const a = document.createElement('a');
    a.href = URL_.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL_.revokeObjectURL(a.href); a.remove(); }, 2000);
    return 'saved';
  }
  const URL_ = window.URL;

  window.MDQ = window.MDQ || {};
  Object.assign(MDQ, { store, settings, sync, api, teacherSession, saveFile, KEYS: K });
})();
