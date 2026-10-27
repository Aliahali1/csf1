/* أدوات إمكانية الوصول: حجم الخط، القراءة بصوت عالٍ، تباعد، تباين، إيقاف الحركة. تُحفظ في متصفح المستخدمة فقط. */
(function () {
  const KEY = 'mdq.a11y.v1', root = document.documentElement;
  const DEF = { scale: 1, spacing: 'normal', contrast: 'normal', motion: 'on' };
  let S = Object.assign({}, DEF);
  try { S = Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const clamp = v => Math.min(1.6, Math.max(0.85, Math.round(v * 100) / 100));
  function apply() {
    S.scale = clamp(+S.scale || 1);
    root.style.setProperty('--a11y-scale', S.scale);
    root.dataset.spacing = S.spacing === 'wide' ? 'wide' : 'normal';
    root.dataset.contrast = S.contrast === 'high' ? 'high' : 'normal';
    root.dataset.motion = S.motion === 'off' ? 'off' : 'on';
  }
  apply();

  const synth = window.speechSynthesis;
  let reading = false, queue = [];
  function chunks(text) {
    const parts = text.replace(/\s+/g, ' ').split(/(?<=[.!؟?،:؛])\s+/), out = []; let cur = '';
    parts.forEach(p => { if ((cur + ' ' + p).length > 180) { if (cur) out.push(cur); cur = p; } else cur = (cur + ' ' + p).trim(); });
    if (cur) out.push(cur); return out;
  }
  function stop() { reading = false; queue = []; try { synth && synth.cancel(); } catch (e) {} setBtn(); }
  function speakNext() {
    if (!reading || !queue.length) { reading = false; setBtn(); return; }
    const u = new SpeechSynthesisUtterance(queue.shift()); u.lang = 'ar-SA'; u.rate = 0.9;
    const v = (synth.getVoices() || []).find(x => /^ar/i.test(x.lang)); if (v) u.voice = v;
    u.onend = speakNext; u.onerror = () => { reading = false; setBtn(); };
    synth.speak(u);
  }
  function readAloud() {
    if (!synth) return note('المتصفح لا يدعم القراءة الصوتية.');
    if (reading) return stop();
    const sel = String(window.getSelection ? window.getSelection() : '').trim();
    const src = sel || (document.querySelector('main') || document.body).innerText.replace(/[\u{1F300}-\u{1FAFF}]/gu, '');
    queue = chunks(src.slice(0, 6000)); if (!queue.length) return;
    if (!(synth.getVoices() || []).some(x => /^ar/i.test(x.lang))) note('لم يتوفر صوت عربي على هذا الجهاز؛ قد تُنطق الكلمات بصوت آخر.');
    reading = true; setBtn(); synth.cancel(); speakNext();
  }

  let panel, fab, readBtn, msg;
  function note(t) { if (msg) msg.textContent = t; }
  function setBtn() { if (readBtn) { readBtn.textContent = reading ? '⏹ إيقاف القراءة' : '🔊 اقرئي لي'; readBtn.setAttribute('aria-pressed', String(reading)); } }
  function refresh() {
    panel.querySelector('.a11y-val').textContent = Math.round(S.scale * 100) + '٪'.replace('٪', '%');
    panel.querySelector('[data-a="dec"]').disabled = S.scale <= 0.85;
    panel.querySelector('[data-a="inc"]').disabled = S.scale >= 1.6;
    [['spacing', 'wide'], ['contrast', 'high'], ['motion', 'off']].forEach(([k, v]) => panel.querySelector(`[data-t="${k}"]`).setAttribute('aria-pressed', String(S[k] === v)));
  }
  function build() {
    fab = document.createElement('button'); fab.className = 'a11y-fab'; fab.type = 'button';
    fab.setAttribute('aria-label', 'أدوات إمكانية الوصول'); fab.setAttribute('aria-expanded', 'false'); fab.innerHTML = '<span aria-hidden="true">♿</span>';
    panel = document.createElement('div'); panel.className = 'a11y-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'أدوات إمكانية الوصول');
    panel.innerHTML = `<h2>إمكانية الوصول</h2>
      <div class="a11y-row"><span>حجم الخط</span><button class="ab" data-a="dec" type="button" aria-label="تصغير الخط">أ−</button><b class="a11y-val" aria-live="polite"></b><button class="ab" data-a="inc" type="button" aria-label="تكبير الخط">أ+</button><button class="ab" data-a="reset" type="button">الأصل</button></div>
      <div class="a11y-row"><span>القراءة</span><button class="ab" data-a="read" type="button" aria-pressed="false">🔊 اقرئي لي</button></div>
      <div class="a11y-row"><span>العرض</span><button class="ab" data-t="spacing" type="button">تباعد أوسع</button><button class="ab" data-t="contrast" type="button">تباين عالٍ</button><button class="ab" data-t="motion" type="button">إيقاف الحركة</button></div>
      <p class="a11y-note">القراءة: تقرأ النص المحدَّد، أو الصفحة إن لم تحدّدي شيئًا. تُحفظ اختياراتكِ على هذا الجهاز فقط.</p><p class="a11y-note" role="status" id="a11yMsg"></p>`;
    document.body.append(fab, panel);
    readBtn = panel.querySelector('[data-a="read"]'); msg = panel.querySelector('#a11yMsg');
    fab.onclick = () => { panel.hidden = !panel.hidden; fab.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) panel.querySelector('button.ab').focus(); };
    panel.onclick = e => {
      const b = e.target.closest('button.ab'); if (!b) return;
      if (b.dataset.a === 'inc') S.scale = clamp(S.scale + 0.1);
      else if (b.dataset.a === 'dec') S.scale = clamp(S.scale - 0.1);
      else if (b.dataset.a === 'reset') S = Object.assign({}, DEF);
      else if (b.dataset.a === 'read') return readAloud();
      else if (b.dataset.t) { const k = b.dataset.t, on = { spacing: 'wide', contrast: 'high', motion: 'off' }[k], off = DEF[k]; S[k] = S[k] === on ? off : on; }
      apply(); save(); refresh();
    };
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; fab.setAttribute('aria-expanded', 'false'); fab.focus(); } });
    window.addEventListener('pagehide', stop);
    refresh(); setBtn();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  window.MDQ = window.MDQ || {}; MDQ.a11y = { get: () => Object.assign({}, S) };
})();
