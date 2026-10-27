/* ============================================================
   بوابة دخول المعلمة
   - لا يوجد الرقم السري ولا منطق التحقق منه في هذا الملف.
   - يُرسل الرقم إلى الخادم (Apps Script) الذي يقارنه بالقيمة المحفوظة في Script Properties،
     ويعيد رمز جلسة مؤقتًا. كل طلبات بيانات الطالبات تتطلب هذا الرمز.
   ============================================================ */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let lastFocus = null;

  function goTeacher(demo) {
    if (window.MDQ_BUNDLE) { MDQ.teacher.mount(document.getElementById('app'), { demo }); return; }
    location.href = 'teacher.html' + (demo ? '#demo' : '');
  }

  function close() {
    const m = document.getElementById('authModal');
    if (m) m.remove();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /** نافذة الرقم السري. onDone(token) تُستدعى بعد نجاح التحقق في الخادم */
  function open(opts) {
    opts = opts || {};
    lastFocus = document.activeElement;
    close();
    const wrap = document.createElement('div');
    wrap.id = 'authModal';
    wrap.className = 'modal-bg';
    const forms = MDQ.sync.mode === 'forms';
    const configured = MDQ.api.enabled || forms;
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <div class="modal-head"><span class="lock-ic">🔐</span><h2 id="authTitle">دخول المعلمة</h2>
          ${opts.noCancel ? '' : '<button class="btn ghost small" id="authX" aria-label="إغلاق">✕</button>'}</div>
        ${configured ? `
        <form id="authForm" class="auth-form" novalidate>
          <label for="pin">الرقم السري</label>
          <input id="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" required placeholder="••••">
          <p class="auth-msg" id="authMsg" role="alert" ${opts.message ? '' : 'hidden'}>${esc(opts.message || '')}</p>
          <button class="btn" type="submit" id="authGo">دخول</button>
          <p class="muted small-print">${forms ? 'الرقم السري بوابة أولية لهذه اللوحة. بيانات الطالبات لا تُخزَّن في الموقع؛ تبقى في جدول ردود النموذج في Google Drive المحمي بحسابكِ، ولا تظهر هنا إلا بعد أن تستورديها بنفسكِ.' : 'يتحقق خادم المدرسة من الرقم السري؛ لا تُعرض بيانات الطالبات قبل التحقق. تنتهي الجلسة تلقائيًا بعد مدة محددة.'}</p>
        </form>` : `
        <div class="auth-form">
          <div class="banner"><b>يتطلب إكمال إعداد الربط.</b>&nbsp;لم يُربط الموقع بعد بنموذج Google. افتحي اللوحة لإعداد النموذج من تبويب «إعداد نموذج Google»، أو لمعاينتها ببيانات تجريبية.</div>
          <button class="btn gold" id="authDemo" type="button">فتح اللوحة: الإعداد والمعاينة</button>
          <p class="muted small-print">خطوات الربط في ملف README.md المرفق مع المشروع.</p>
        </div>`}
      </div>`;
    document.body.appendChild(wrap);
    const x = document.getElementById('authX');
    if (x) x.onclick = close;
    wrap.addEventListener('click', e => { if (e.target === wrap && !opts.noCancel) close(); });
    wrap.addEventListener('keydown', e => { if (e.key === 'Escape' && !opts.noCancel) close(); });
    const demo = document.getElementById('authDemo');
    if (demo) { demo.onclick = () => { close(); goTeacher(true); }; demo.focus(); return; }
    const pin = document.getElementById('pin'); pin.focus();
    document.getElementById('authForm').onsubmit = async ev => {
      ev.preventDefault();
      const msg = document.getElementById('authMsg'), go = document.getElementById('authGo');
      const v = pin.value.trim();
      if (!v) { msg.textContent = 'أدخلي الرقم السري.'; msg.hidden = false; return; }
      go.disabled = true; go.textContent = 'جارٍ التحقق…'; msg.hidden = true;
      try {
        if (forms) {
          const h = await MDQ.forms.pinHash(v);
          if (h !== MDQ.forms.cfg.pinHash) { const e = new Error('auth'); e.code = 'auth'; throw e; }
          const exp = Date.now() + (+(MDQ.forms.cfg.teacherSessionMin) || 60) * 60000;
          MDQ.teacherSession.set('local', exp);
          close();
          if (opts.onDone) opts.onDone({ token: 'local', expiresAt: exp }); else goTeacher(false);
          return;
        }
        const r = await MDQ.api.login(v);
        MDQ.teacherSession.set(r.token, r.expiresAt);
        close();
        if (opts.onDone) opts.onDone(r); else goTeacher(false);
      } catch (e) {
        msg.textContent = e.code === 'auth' ? 'الرقم السري غير صحيح، حاولي مرة أخرى' : (e.message || 'تعذر الدخول');
        msg.hidden = false; pin.value = ''; pin.focus();
        const m = wrap.querySelector('.modal'); m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
      } finally { go.disabled = false; go.textContent = 'دخول'; }
    };
  }

  async function logout() {
    const t = MDQ.teacherSession.get();
    MDQ.teacherSession.clear();
    if (t && MDQ.api.enabled) { try { await MDQ.api.logout(t.token); } catch (e) {} }
    if (window.MDQ_BUNDLE) { location.hash = ''; location.reload(); return; }
    location.href = 'index.html';
  }

  window.MDQ = window.MDQ || {};
  MDQ.auth = { open, close, logout, goTeacher };
})();
