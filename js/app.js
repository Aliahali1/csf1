/* ============================================================
   واجهة الطالبة — مغامرة المهارات الرقمية
   ============================================================ */
(function () {
  const I = MDQ.icons, B = MDQ.bank, E = MDQ.engine, Tm = MDQ.time;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LICON = { cyber: 'shield', device: 'laptop', db: 'db', query: 'search' };
  const ORD = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة'];
  const FX = MDQ.fx, SFX = MDQ.sfx;
  /** روابط ملفات الدرس (PDF) — للاستعلام والتقارير ملفان */
  function fileLinks(l) {
    return l.pdfs.map((p, j) => `<button class="filelink" data-pdf="${l.id}" data-pi="${j}">${I.book}<span>${l.pdfs.length > 1 ? (j ? 'ملف التقارير' : 'ملف الاستعلام') : 'ملف الدرس'}</span></button>`).join('');
  }
  function bindFiles() { app().querySelectorAll('[data-pdf]').forEach(b => b.onclick = () => openReview(b.dataset.pdf, null, 'pdf' + b.dataset.pi)); }

  let session = MDQ.store.get(MDQ.KEYS.session, null);
  const ui = { view: 'welcome', lesson: null, selected: null, lastResult: null };
  const app = () => $('#app');
  const save = () => { if (session) MDQ.store.set(MDQ.KEYS.session, session); };
  const settings = () => MDQ.settings.get();

  /* ---------------- الشريط العلوي ---------------- */
  const SYNC_TEXT = {
    local: () => 'محفوظ على هذا الجهاز',
    sent: () => 'أُرسلت إلى نموذج Google',
    unconfigured: () => 'الحفظ المركزي يتطلب إكمال الربط — محفوظ مؤقتًا على هذا الجهاز',
    memory: () => 'تعذر الحفظ على الجهاز',
    pending: n => `جارٍ الحفظ… (${n})`,
    synced: () => 'تم الحفظ في السجل المركزي',
    offline: n => `غير متصل — ${n} محفوظة مؤقتًا`,
    error: n => `تعذر الحفظ — إعادة المحاولة تلقائيًا (${n})`
  };
  function renderTop() {
    const st = $('#topStats');
    if (!st) return;
    if (!session) { st.innerHTML = ''; return; }
    const o = E.overall(session);
    st.innerHTML = `
      <span class="chip" title="الطالبة">${I.user}<span>${esc(session.studentName)}</span></span>
      <span class="chip gold num" title="نقاط الخبرة">${I.xp}<span><span class="ltr">${session.xp} XP</span></span></span>
      <span class="chip num" title="الشارات">${I.medal}<span>${session.badges.length} شارة</span></span>
      <span class="chip num" title="التقدم العام">${I.map}<span>${o.done}/${o.total} مراحل</span></span>
      <span class="chip sync" id="syncPill" role="status" aria-live="polite"></span>`;
    paintSync(MDQ.sync.status, MDQ.sync.pendingCount());
  }
  function paintSync(st, n) {
    const p = $('#syncPill'); if (!p) return;
    p.dataset.st = st;
    p.innerHTML = `${st === 'synced' || st === 'sent' ? I.check : I.cloud}<span>${(SYNC_TEXT[st] || SYNC_TEXT.local)(n)}</span>`;
  }
  MDQ.sync.onStatus((st, n) => paintSync(st, n));

  /* ---------------- التنقل ---------------- */
  function go(view, lesson) {
    ui.view = view; if (lesson !== undefined) ui.lesson = lesson;
    ui.selected = null; ui.lastResult = null;
    render();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
  /** خلفية المشهد: الخريطة والبداية بمشهد الرحلة، وكل مرحلة بمشهدها */
  function setScene() {
    const inStage = ['play', 'results', 'mistakes'].includes(ui.view) && ui.lesson;
    document.documentElement.classList.add('scene-on');
    document.body.dataset.scene = inStage ? ui.lesson : 'hero';
  }
  function render() {
    if (!session && ui.view !== 'welcome') ui.view = 'welcome';
    setScene();
    renderTop();
    ({ welcome: renderWelcome, map: renderMap, play: renderPlay, results: renderResults, mistakes: renderMistakes }[ui.view] || renderWelcome)();
  }

  /* ---------------- الصفحة الافتتاحية ---------------- */
  function rulesHtml() {
    const s = settings();
    return `<div class="rules">
      <div><b>قواعد النقاط:</b> <span class="num">${s.xpFirst}</span> نقاط للإجابة الصحيحة من المحاولة الأولى، <span class="num">${s.xpSecond}</span> بعد التلميح الأول، <span class="num">${s.xpLater}</span> بعد التلميحات الإضافية.</div>
      <div>لا تُخصم نقاط عند الخطأ؛ كل محاولة فرصة لتتعلمي.</div>
      <div>النقاط تحفيزية وليست درجات رسمية.</div>
    </div>`;
  }
  function renderWelcome() {
    const s = settings();
    const clsField = s.classField === 'hidden' ? '' : `
      <div class="field">
        <label for="cls">الفصل أو الشعبة ${s.classField === 'required' ? '' : '<span style="font-weight:400;opacity:.8">(اختياري)</span>'}</label>
        ${s.classOptions && s.classOptions.length
          ? `<select id="cls"><option value="">اختاري</option>${s.classOptions.map(c => `<option>${esc(c)}</option>`).join('')}</select>`
          : `<input id="cls" maxlength="20" autocomplete="off" placeholder="مثال: 3/2">`}
        <div class="err" id="clsErr" hidden></div>
      </div>`;
    const nQ = B.LESSONS.reduce((a, l) => a + B.activeFor(l.id, s).length, 0);
    const nBadges = (MDQ.rules && MDQ.rules.BADGES) ? Object.keys(MDQ.rules.BADGES).length : 0;
    app().innerHTML = `
      <section class="hero">
        <div class="hero-card">
          <p class="eyebrow" style="color:var(--gold)">المهارات الرقمية — الصف الثالث المتوسط</p>
          <h1>مغامرة المهارات الرقمية<span>رحلة إتقان الدروس الأربعة</span></h1>
          <p class="lede">استعدي للمغامرة، أتقني المفاهيم، واجمعي شارات المعرفة.</p>
          <div class="mascot-row"><div class="mascot bob">${FX.mascot('happy')}</div><p class="bubble">${FX.line('welcome')}</p></div>
          <form class="form" id="startForm" novalidate>
            <div class="field">
              <label for="sname">اسمكِ</label>
              <input id="sname" maxlength="60" autocomplete="off" required placeholder="اكتبي اسمكِ كما تعرفه المعلمة">
              <div class="err" id="nameErr" hidden></div>
            </div>
            ${clsField}
            ${MDQ.api.enabled || MDQ.sync.mode === 'forms' ? `<details class="code-box" id="codeBox"><summary>سجّلتِ من قبل على جهاز آخر؟ ادخلي برمزكِ</summary>
              ${MDQ.sync.mode === 'forms' ? '<p class="help">اكتبي اسمكِ أعلاه ورمزكِ هنا؛ تُجمع نتائجكِ تحت رمزكِ نفسه عند المعلمة، ويبدأ التقدم من جديد على هذا الجهاز.</p>' : ''}
              <div class="field"><label for="scode">رمز الطالبة (6 خانات)</label><input id="scode" maxlength="8" autocomplete="off" class="ltr-input" placeholder="مثال: K7M4QZ">
              <div class="err" id="codeErr" hidden></div></div></details>` : ''}
            <button class="btn gold" type="submit" id="startBtn">${I.compass.replace('<svg', '<svg style="width:22px;height:22px"')} ابدئي المغامرة</button>
            <p class="privacy">${I.lock}<span>نطلب الاسم والفصل فقط لمتابعة تقدمكِ. لا نطلب رقم هوية أو هاتفًا، ولا تُعرض نتائجكِ لزميلاتكِ.</span></p>
          </form>
        </div>
        <aside class="panel preview" aria-label="خريطة المراحل">
          <div class="row"><h2 class="grow">خريطة المغامرة</h2><span class="chip num" style="background:var(--surface-2);border-color:var(--line)">${I.xp} <span class="ltr">0 XP</span> · ${I.medal} 0</span></div>
          <div class="mini-stages">
            ${B.LESSONS.map((l, i) => `<div class="mini ${l.color}"><span class="ic" style="background:var(--sc)">${I[LICON[l.id]]}</span>
              <div style="min-width:0"><b>${esc(l.stage)}</b><small>المرحلة ${ORD[i]} · ${esc(l.lesson)}</small><div class="files-row">${fileLinks(l)}</div></div>
              <small class="num">${B.activeFor(l.id, s).length} أسئلة</small></div>`).join('')}
          </div>
          <div class="bar" aria-label="التقدم العام 0%"><i style="width:0%"></i></div>
          ${rulesHtml()}
        </aside>
      </section>
      <section class="home-ribbon" aria-label="لمحة عن المغامرة">
        <div><b class="num">${B.LESSONS.length}</b><span>مراحل تعلّم</span></div>
        <div><b class="num">${nQ}</b><span>سؤالًا تفاعليًا</span></div>
        <div><b class="num">${nBadges || '٤+'}</b><span>شارات تجمعينها</span></div>
        <div><b class="num">٣</b><span>فرص لكل سؤال بتلميحات</span></div>
      </section>
      <section class="home-steps" aria-label="كيف تعمل المغامرة">
        <h2>كيف تبدئين؟</h2>
        <ol>
          <li><span class="n">١</span><b>سجّلي اسمكِ</b><small>اسمكِ وفصلكِ فقط، لتتابع المعلمة تقدمكِ.</small></li>
          <li><span class="n">٢</span><b>اختاري مرحلة</b><small>أجيبي عن الأسئلة؛ إن أخطأتِ يساعدكِ تلميح لطيف.</small></li>
          <li><span class="n">٣</span><b>اجمعي الشارات</b><small>أتقني المفاهيم واكسبي نقاط الخبرة والشارات.</small></li>
        </ol>
      </section>
      <details class="home-privacy"><summary>${I.lock}<span>ماذا نحفظ عنكِ؟ ولماذا؟</span></summary>
        <ul>
          <li><b>نحفظ:</b> الاسم، الفصل، رمزكِ، وإجاباتكِ ووقتها لنعرف أين تحتاجين دعمًا.</li>
          <li><b>لا نطلب:</b> رقم هوية، هاتفًا، صورة، أو أي بيانات شخصية أخرى.</li>
          <li><b>من يراها:</b> معلمتكِ فقط. لا تُعرض نتائجكِ لزميلاتكِ.</li>
          <li><b>الغرض:</b> المتابعة التعليمية وتحسين المراجعة، وليس التقييم الرسمي للدرجات.</li>
          <li><b>كيف تُستخدم:</b> تستخدم معلمتكِ أداة رصد بقواعد ثابتة تلخّص أداءكِ في فئات وصفية (مثل «متميزة» أو «تحتاج دعمًا») لتخطيط الدعم. ليست درجات، وليست حكمًا دائمًا، والمعلمة تراجعها وتصحّحها. لا يُستخدم الذكاء الاصطناعي لتقييمكِ.</li>
          <li><b>حقوقكِ:</b> لكِ أو لوليّ أمركِ أن تطلبا من المعلمة تصحيح بياناتكِ أو حذفها.</li>
          ${((window.MDQ_CONFIG || {}).GOVERNANCE || {}).retention ? `<li><b>مدة الحفظ:</b> ${esc(MDQ_CONFIG.GOVERNANCE.retention)}</li>` : ''}
          ${((window.MDQ_CONFIG || {}).GOVERNANCE || {}).guardianNotice ? `<li><b>أولياء الأمور:</b> ${esc(MDQ_CONFIG.GOVERNANCE.guardianNotice)}</li>` : ''}
        </ul>
      </details>`;
    bindFiles();
    $('#startForm').addEventListener('submit', ev => {
      ev.preventDefault();
      const codeEl = $('#scode'), code = codeEl ? codeEl.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
      if (code && MDQ.sync.mode !== 'forms') return resumeByCode(code);
      if (code && !E.CODE_RE.test(code)) { const ce = $('#codeErr'); ce.textContent = 'الرمز 6 خانات من حروف إنجليزية كبيرة وأرقام، مثل K7M4QZ.'; ce.hidden = false; return; }
      const name = $('#sname').value.trim().replace(/\s+/g, ' ');
      const clsEl = $('#cls');
      const cls = clsEl ? clsEl.value.trim() : '';
      let ok = true;
      const ne = $('#nameErr'), ce = $('#clsErr');
      ne.hidden = true; if (ce) ce.hidden = true;
      if (name.length < 2) { ne.textContent = 'اكتبي اسمكِ (حرفان على الأقل).'; ne.hidden = false; ok = false; }
      else if (/^[=+\-@]/.test(name) || /[<>]/.test(name)) { ne.textContent = 'اكتبي الاسم بالحروف فقط.'; ne.hidden = false; ok = false; }
      if (s.classField === 'required' && !cls) { ce.textContent = 'اختاري الفصل أو الشعبة.'; ce.hidden = false; ok = false; }
      if (!ok) return;
      session = E.newSession(name, cls.replace(/^[=+\-@]+/, ''), code || undefined);
      try { sessionStorage.setItem('mdq.sid', session.sessionId); } catch (e) {}
      save();
      SFX.play('levelup');
      go('map');
    });
  }

  /** متابعة طالبة مسجلة من جهاز آخر برمزها: يُسترجع تقدمها من السجل المركزي */
  async function resumeByCode(code) {
    const ce = $('#codeErr'), btn = $('#startBtn');
    ce.hidden = true; btn.disabled = true; btn.textContent = 'جارٍ استرجاع تقدمكِ…';
    try {
      const r = await MDQ.api.studentProgress(code);
      session = E.rebuild({ studentId: r.studentId, code: r.code, name: r.name, className: r.className }, r.events || [], settings());
      try { sessionStorage.setItem('mdq.sid', session.sessionId); } catch (e) {}
      save(); SFX.play('levelup'); go('map');
    } catch (e) {
      ce.textContent = e.code === 'not_found' || e.code === 'bad_code' ? 'لم نجد طالبة بهذا الرمز. تأكدي من الرمز أو اسألي معلمتكِ.' : (e.message || 'تعذر الاسترجاع');
      ce.hidden = false; btn.disabled = false; btn.textContent = 'ابدئي المغامرة';
    }
  }

  /* ---------------- الخريطة ---------------- */
  function stageStatus(lid) { const st = session.stages[lid]; return st ? st.status : 'new'; }
  function renderMap() {
    const o = E.overall(session);
    const s = settings();
    const label = { new: 'لم تبدأ', active: 'جارية', done: 'مكتملة' };
    const owned = session.badges;
    const allBadges = Object.values(MDQ.rules.BADGES);
    app().innerHTML = `
      <div class="map-head">
        <div>
          <p class="eyebrow">مرحبًا ${esc(session.studentName)}${session.className ? ' · ' + esc(session.className) : ''}</p>
          ${session.code ? `<p class="code-chip">رمزكِ: <b class="ltr">${esc(session.code)}</b> <span class="muted">— احفظيه للدخول من جهاز آخر</span></p>` : ''}
          <h1>خريطة المغامرة</h1>
          <p class="muted">اختاري المرحلة التي تريدين البدء بها. تقدّمكِ محفوظ، ويمكنكِ العودة إلى الخريطة في أي وقت.</p>
        </div>
        <div class="overall">
          <div class="row" style="justify-content:space-between"><b>التقدم العام</b><span class="num">${o.pct}%</span></div>
          <div class="bar" role="progressbar" aria-valuenow="${o.pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${o.pct}%"></i></div>
          <small class="muted num">${o.done} من ${o.total} مراحل مكتملة · <span class="ltr">${session.xp} XP</span></small>
        </div>
      </div>
      <div class="guide-banner"><div class="mascot bob">${FX.mascot('happy')}</div><p class="bubble">${FX.line('welcome')}</p></div>
      <section class="stages">
        ${B.LESSONS.map((l, i) => {
          const st = stageStatus(l.id);
          const total = st === 'new' ? B.activeFor(l.id, s).length : session.stages[l.id].order.length;
          const stats = st === 'new' ? null : E.stageStats(session, l.id);
          const pct = stats ? Math.round(stats.answered / Math.max(stats.total, 1) * 100) : 0;
          return `<article class="stage ${l.color} ${st === 'done' ? 'is-done' : ''}" style="--i:${i}">
            <div class="cover"><img src="img/thumb-${l.id}.webp" alt="" width="640" height="360" loading="lazy" decoding="async"></div>
            <div class="node">${I[LICON[l.id]]}${st === 'done' ? `<span class="done-mark">${I.check}</span>` : ''}</div>
            <div class="lvl">المرحلة ${ORD[i]}</div>
            <h3>${esc(l.stage)}</h3>
            <div class="lesson">${esc(l.lesson)}</div>
            <p class="story">${esc(l.story)}</p>
            <p class="mission"><b>المهمة:</b> ${esc(l.mission)}</p>
            <div class="foot">
              <div class="row" style="justify-content:space-between"><span class="status ${st}">${label[st]}</span><small class="muted num">${stats ? stats.answered : 0}/${total} سؤال</small></div>
              <div class="bar"><i style="width:${pct}%"></i></div>
              ${st === 'done'
                ? `<div class="row"><button class="btn small grow" data-res="${l.id}">النتائج</button><button class="btn ghost small grow" data-mis="${l.id}">راجعي أخطائي</button></div>`
                : `<button class="btn" data-play="${l.id}">${st === 'active' ? 'تابعي المرحلة' : 'ابدئي المرحلة'}</button>`}
              <div class="files-row center">${fileLinks(l)}<button class="filelink alt" data-rev="${l.id}">${I.bulb}<span>ملخص سريع</span></button></div>
            </div>
          </article>`;
        }).join('')}
      </section>
      <section class="panel badges-shelf" aria-labelledby="shelfH">
        <h2 id="shelfH">شاراتكِ</h2>
        <div class="shelf">
          ${allBadges.map(b => {
            const n = owned.filter(x => x.id === b.id).length;
            return `<div class="medal ${n ? '' : 'locked'}"><span class="disc">${FX.badge(b.id)}</span><div style="min-width:0"><b>${esc(b.name)}${n > 1 ? ` <span class="num">×${n}</span>` : ''}</b><small>${esc(b.desc)}</small></div></div>`;
          }).join('')}
        </div>
      </section>
      <section class="panel" style="padding:16px;margin-top:16px" id="sessBox">
        <div class="row"><p class="grow muted" style="font-size:.9rem">لستِ ${esc(session.studentName)}؟ أو انتهيتِ وتريد زميلتكِ استخدام الجهاز؟</p>
        <button class="btn ghost small" id="newSess">بدء جلسة لطالبة أخرى</button></div>
      </section>`;
    app().querySelectorAll('[data-play]').forEach(b => b.onclick = () => { SFX.play('open'); ui.line = FX.stageLine(b.dataset.play); E.startStage(session, b.dataset.play, settings()); save(); go('play', b.dataset.play); });
    app().querySelectorAll('[data-res]').forEach(b => b.onclick = () => go('results', b.dataset.res));
    app().querySelectorAll('[data-mis]').forEach(b => b.onclick = () => go('mistakes', b.dataset.mis));
    app().querySelectorAll('[data-rev]').forEach(b => b.onclick = () => openReview(b.dataset.rev, null, 'sum'));
    bindFiles();
    $('#newSess').onclick = () => {
      const box = $('#sessBox');
      const pend = MDQ.sync.mode === 'remote' ? MDQ.sync.pendingCount() : 0;
      box.innerHTML = `<div class="confirm"><b>إنهاء جلسة ${esc(session.studentName)} وبدء جلسة جديدة؟</b>
        <span style="font-size:.9rem">سجل المحاولات يبقى محفوظًا لدى المعلمة، لكن خريطة هذه الطالبة ستُغلق على هذا الجهاز.${pend ? ` <b>تنبيه: ${pend} محاولة لم تصل للخادم بعد وستبقى في انتظار الإرسال.</b>` : ''}</span>
        <div class="row"><button class="btn small" id="yesNew">نعم، جلسة جديدة</button><button class="btn ghost small" id="noNew">إلغاء</button></div></div>`;
      $('#yesNew').onclick = () => { endSession(); MDQ.store.del(MDQ.KEYS.session); try { sessionStorage.removeItem('mdq.sid'); } catch (e) {} session = null; go('welcome'); };
      $('#noNew').onclick = () => renderMap();
    };
  }

  /* ---------------- شاشة السؤال ---------------- */
  function renderPlay() {
    const lid = ui.lesson, L = B.lesson(lid), st = E.stage(session, lid);
    if (!st.cur) { if (st.status !== 'done') return finishStage(); return go('results', lid); }
    const qid = st.cur, q = B.question(qid);
    E.markShown(session, lid, qid); save();
    const qs = st.q[qid];
    const stats = E.stageStats(session, lid);
    const idx = st.order.indexOf(qid) + 1;
    const last = qs.attempts[qs.attempts.length - 1];
    const done = qs.state === 'done';
    const tried = new Set(qs.attempts.filter(a => !a.ok).map(a => a.c));
    const wrongN = qs.attempts.filter(a => !a.ok).length;
    const level = done ? null : (last && !last.ok ? MDQ.rules.supportAfterWrong(wrongN) : null);
    const letters = B.LETTERS;
    const answeredPct = Math.round(stats.answered / Math.max(stats.total, 1) * 100);

    app().innerHTML = `
      <div class="play-head ${L.color}">
        <button class="btn ghost small" id="toMap">${I.back} خريطة المغامرة</button>
        <h1 class="grow">${esc(L.stage)} <small class="muted" style="font-family:var(--f-body);font-size:.9rem;font-weight:400">· ${esc(L.lesson)}</small></h1>
        ${(session.streak || 0) >= 2 ? `<span class="combo num">كومبو ×${session.streak} 🔥</span>` : ''}
        <button class="btn gold small mobile-only" id="revBtn2">${I.book} ملف الدرس</button>
      </div>
      <div class="play ${L.color}">
        <div>
          <article class="panel qcard" id="qcard">
            <div class="qmeta">
              <span class="tag num">السؤال ${idx} من ${st.order.length}</span>
              <span class="tag">${q.type === 'tf' ? 'صواب أو خطأ' : 'اختيار من متعدد'}</span>
              <span class="tag concept">${esc(q.concept)}</span>
              ${qs.retry ? '<span class="tag retry">عودة لسؤال مؤجل</span>' : ''}
              ${q.source === 'suggested' ? '<span class="tag">سؤال إضافي</span>' : ''}
            </div>
            <p class="qtext" id="qtext">${esc(q.text)}</p>
            <div class="opts ${q.type === 'tf' ? 'tf' : ''}" role="radiogroup" aria-labelledby="qtext">
              ${q.options.map(o => {
                const isTried = tried.has(o.k), isRight = done && o.k === q.answer;
                const dis = done || isTried;
                return `<button class="opt ${isTried ? 'tried' : ''} ${isRight ? 'right' : ''}" role="radio" aria-checked="${isRight ? 'true' : 'false'}" data-k="${o.k}" ${dis ? 'disabled' : ''}>
                  <span class="l">${letters[o.k]}</span><span>${esc(o.text)}</span>${isTried ? '<span class="note">جرّبتِه</span>' : ''}</button>`;
              }).join('')}
            </div>
            <div class="actions" id="actions">
              ${done
                ? `<button class="btn gold" id="nextBtn">${nextLabel(st)} ${I.arrow}</button>`
                : `<button class="btn" id="submitBtn" disabled>تحقّقي من الإجابة</button>`}
              ${!done && level === 'teach' ? `<button class="btn ghost" id="deferBtn">${qs.retry ? 'إنهاء السؤال والانتقال' : 'أجّلي السؤال وعودي إليه لاحقًا'}</button>` : ''}
            </div>
            <div id="fb">${feedbackHtml(q, qs, done, level)}</div>
          </article>
        </div>
        <aside class="side">
          <div class="panel mascot-box"><div class="mascot ${done ? 'jump' : 'bob'}">${FX.mascot(done ? 'cheer' : level === 'hint1' ? 'encourage' : level ? 'think' : 'happy')}</div><p class="bubble" id="bubble">${esc(ui.line || FX.line('start'))}</p></div>
          <button class="reviewbtn" id="revBtn"><span class="ic">${I.book}</span><span><b>ملف الدرس | تعلّمي قبل أن تجيبي</b><small>ملخص ومصطلحات وأمثلة — لن تفقدي سؤالكِ</small></span></button>
          <div class="panel">
            <div class="row" style="justify-content:space-between"><b>تقدم المرحلة</b><span class="num">${answeredPct}%</span></div>
            <div class="bar" style="margin:8px 0 12px"><i style="width:${answeredPct}%"></i></div>
            <dl class="kv num">
              <dt>أُجيب عنها</dt><dd>${stats.answered}</dd>
              <dt>المتبقية</dt><dd>${stats.remaining}</dd>
              <dt>صحيحة من المحاولة الأولى</dt><dd>${stats.answered ? stats.firstTryPct + '%' : '—'}</dd>
              <dt>نقاط المرحلة</dt><dd><span class="ltr">${stats.xp} XP</span></dd>
            </dl>
          </div>
          <div class="panel">
            <b style="display:block;margin-bottom:6px">مكافأة هذا السؤال</b>
            <div class="ladder num">
              <div class="${!done && wrongN === 0 ? 'on' : ''}"><span>من المحاولة الأولى</span><span><span class="ltr">${settings().xpFirst} XP</span></span></div>
              <div class="${!done && wrongN === 1 ? 'on' : ''}"><span>بعد التلميح الأول</span><span><span class="ltr">${settings().xpSecond} XP</span></span></div>
              <div class="${!done && wrongN >= 2 ? 'on' : ''}"><span>بعد تلميحات إضافية</span><span><span class="ltr">${settings().xpLater} XP</span></span></div>
            </div>
          </div>
        </aside>
      </div>`;

    $('#toMap').onclick = () => go('map');
    $('#revBtn').onclick = () => openReview(lid, q.concept, 'pdf0');
    $('#revBtn2').onclick = () => openReview(lid, q.concept, 'pdf0');
    app().querySelectorAll('.opt:not([disabled])').forEach(b => b.onclick = () => {
      ui.selected = b.dataset.k; SFX.play('select');
      app().querySelectorAll('.opt').forEach(x => { if (!x.classList.contains('right')) x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
      const sb = $('#submitBtn'); if (sb) sb.disabled = false;
    });
    const sb = $('#submitBtn');
    if (sb) sb.onclick = () => onSubmit(lid, qid);
    const nb = $('#nextBtn');
    if (nb) { nb.onclick = () => { SFX.play('tap'); ui.line = FX.line('start'); const n = E.advance(session, lid); save(); if (n) renderPlay(); else finishStage(); }; nb.focus(); }
    const db = $('#deferBtn');
    if (db) db.onclick = () => { E.defer(session, lid, qid); const n = E.advance(session, lid); save(); renderTop(); if (n) renderPlay(); else finishStage(); };
    const tb = $('#teachRev');
    if (tb) tb.onclick = () => openReview(lid, q.concept, 'sum');
    const tp = $('#teachPdf');
    if (tp) tp.onclick = () => openReview(lid, q.concept, 'pdf0');
  }
  function nextLabel(st) {
    const remaining = st.order.filter(id => !st.q[id] || ['open', 'deferred'].includes(st.q[id].state)).length;
    return remaining ? 'السؤال التالي' : 'إنهاء المرحلة';
  }
  function feedbackHtml(q, qs, done, level) {
    const last = qs.attempts[qs.attempts.length - 1];
    if (done) {
      const n = qs.attempts.length;
      const praise = n === 1 ? 'إجابة صحيحة، أحسنتِ!' : n === 2 ? 'إجابة صحيحة! استفدتِ من التلميح بذكاء.' : 'إجابة صحيحة! مثابرتكِ أوصلتكِ.';
      return `<div class="fb ok" role="status"><h3>${I.check} ${praise}</h3>
        <p>${esc(q.why)}</p>
        ${q.correction ? `<p class="corr"><b>التصويب:</b> ${esc(q.correction)}</p>` : ''}
        <p class="xp num"><span class="ltr">+${qs.xp} XP</span></p></div>`;
    }
    if (!last || last.ok) return '';
    if (level === 'hint1') return `<div class="fb hint" role="status"><h3>${I.bulb} ليست هذه الإجابة، لكنكِ تقتربين. تلميح أول:</h3><p>${esc(q.hint1)}</p><p class="muted" style="font-size:.88rem">اختاري إجابة أخرى ثم تحقّقي منها.</p></div>`;
    if (level === 'hint2') return `<div class="fb hint" role="status"><h3>${I.bulb} محاولة جيدة. تلميح أدق:</h3><p>${esc(q.hint2)}</p></div>`;
    return `<div class="fb teach" role="status"><h3>${I.book} لنتعلّم المفهوم معًا</h3><p>${esc(q.teach)}</p>
      <div class="row"><button class="btn small gold" id="teachRev">ملخص المفهوم</button><button class="btn small" id="teachPdf">ملف الدرس</button><span class="muted" style="font-size:.86rem">ثم عودي وأعيدي المحاولة.</span></div></div>`;
  }
  function onSubmit(lid, qid) {
    if (!ui.selected) return;
    const res = E.submit(session, lid, qid, ui.selected, settings());
    ui.selected = null;
    if (res.correct) {
      session.streak = res.attemptNo === 1 ? (session.streak || 0) + 1 : 0;
      ui.line = session.streak >= 3 ? FX.line('combo') : FX.line('correct');
    } else {
      session.streak = 0;
      ui.line = res.support === 'teach' ? FX.line('teach') : res.support === 'hint2' ? FX.line('hint') : FX.line('wrong');
    }
    save(); renderTop(); renderPlay();
    if (res.correct) {
      SFX.play('correct');
      FX.burst($('#qcard'));
      FX.floatText($('#nextBtn') || $('#qcard'), `+${res.xp} XP`, 'xp');
      const chip = document.querySelector('.chip.gold'); if (chip) { chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop'); }
      if (session.streak >= 2) setTimeout(() => { SFX.play('combo', session.streak); FX.floatText($('#qcard'), `كومبو ×${session.streak}!`, 'combo-f'); }, 380);
    } else {
      SFX.play('wrong'); setTimeout(() => SFX.play('hint'), 320);
      const c = $('#qcard'); if (c) { c.classList.add('shake'); setTimeout(() => c.classList.remove('shake'), 400); }
    }
    const fb = $('#fb'); if (fb && fb.firstElementChild) fb.firstElementChild.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function finishStage() {
    const lid = ui.lesson;
    const r = E.complete(session, lid, settings());
    save();
    ui.lastResult = r;
    ui.view = 'results'; renderTop(); renderResults();
    celebrate();
    SFX.play('levelup');
    r.newBadges.forEach((b, i) => setTimeout(() => { toast(b); SFX.play('badge'); }, 1100 + i * 2600));
  }

  /* ---------------- النتائج ---------------- */
  function renderResults() {
    const lid = ui.lesson, L = B.lesson(lid), st = E.stage(session, lid);
    if (st.status !== 'done') return go('map');
    const s = E.stageStats(session, lid);
    const stageBadges = session.badges.filter(b => b.stage === lid || (b.id === 'explorer'));
    const nextL = B.LESSONS.find(l => stageStatus(l.id) !== 'done');
    const pctBar = (v, cls) => `<div class="bar"><i class="${cls || ''}" style="width:${v}%"></i></div>`;
    app().innerHTML = `
      <section class="result-hero ${L.color}">
        <div class="hero-mascots"><div class="big-badge">${FX.badge(L.badge)}</div><div class="mascot jump">${FX.mascot('cheer')}</div></div>
        <div>
          <p class="eyebrow" style="color:var(--gold)">اكتملت المرحلة</p>
          <h1>أنجزتِ «${esc(L.stage)}»</h1>
          <p style="opacity:.9">${esc(L.lesson)} · <span class="num">${Tm.duration(s.durationSec)}</span></p>
          <p class="bubble light">${FX.line('done')}</p>
        </div>
      </section>
      <div class="stats num">
        <div class="stat"><b>${s.answered}</b><small>أسئلة أُجيب عنها</small></div>
        <div class="stat"><b>${s.correct}</b><small>إجابات صحيحة</small></div>
        <div class="stat"><b>${s.attempts}</b><small>عدد المحاولات</small></div>
        <div class="stat"><b>${s.hints}</b><small>تلميحات وشروح استخدمتِها</small></div>
        <div class="stat key"><b>${s.xp} <small>/ ${s.maxXp}</small></b><small>النقاط المكتسبة XP</small></div>
        <div class="stat"><b>${Tm.duration(s.durationSec)}</b><small>الوقت المستغرق</small></div>
        <div class="stat"><b>${s.unsolved}</b><small>أسئلة لم تُحل</small></div>
        <div class="stat"><b>${stageBadges.length}</b><small>شارات هذه المرحلة</small></div>
      </div>
      <div class="twin">
        <div class="panel meter"><div class="row" style="justify-content:space-between"><b>دقة المحاولة الأولى</b><span class="num">${s.firstTryPct}%</span></div>
          ${pctBar(s.firstTryPct)}<small class="muted">الأسئلة التي أصبتِ فيها من أول محاولة — الإتقان الفوري.</small></div>
        <div class="panel meter"><div class="row" style="justify-content:space-between"><b>النسبة النهائية للإجابات الصحيحة</b><span class="num">${s.finalPct}%</span></div>
          ${pctBar(s.finalPct, 'ok')}<small class="muted">بعد التلميحات والمحاولات — الإتقان بعد المساعدة.</small></div>
      </div>
      <div class="grid2" style="margin-top:16px">
        <section class="panel card"><h2>مفاهيم تحتاج إلى مراجعة</h2>
          ${s.weakConcepts.length ? `<ul class="list plain">${s.weakConcepts.map(c => `<li class="row"><span class="tag concept ${L.color}">${esc(c)}</span></li>`).join('')}</ul>
            <p class="muted" style="font-size:.88rem;margin-top:8px">افتحي ملف الدرس وراجعي هذه المفاهيم.</p>`
            : '<p>أجبتِ عن جميع الأسئلة من المحاولة الأولى. إتقان رائع!</p>'}
        </section>
        <section class="panel card"><h2>الشارات المكتسبة</h2>
          <div class="shelf">${stageBadges.map(b => { const d = MDQ.rules.BADGES[b.id]; return `<div class="medal"><span class="disc">${FX.badge(b.id)}</span><div><b>${esc(d.name)}</b><small>${esc(d.desc)}</small></div></div>`; }).join('') || '<p class="muted">—</p>'}</div>
        </section>
      </div>
      <div class="actions" style="margin-top:20px">
        <button class="btn ghost" id="mis">راجعي أخطائي</button>
        ${nextL ? `<button class="btn gold" id="nextStage">انتقلي إلى المرحلة التالية: ${esc(nextL.stage)} ${I.arrow}</button>` : '<span class="status done" style="font-size:.95rem;padding:6px 14px">أكملتِ المراحل الأربع!</span>'}
        <button class="btn ghost" id="toMap2">العودة إلى خريطة المغامرة</button>
      </div>`;
    $('#mis').onclick = () => go('mistakes', lid);
    $('#toMap2').onclick = () => go('map');
    const ns = $('#nextStage');
    if (ns) ns.onclick = () => { E.startStage(session, nextL.id, settings()); save(); go('play', nextL.id); };
  }

  /* ---------------- مراجعة الأخطاء ---------------- */
  function renderMistakes() {
    const lid = ui.lesson, L = B.lesson(lid), st = E.stage(session, lid);
    const items = st.order.map(id => ({ id, q: B.question(id), s: st.q[id] })).filter(x => x.s && x.s.attempts.length && (!x.s.attempts[0].ok));
    app().innerHTML = `
      <div class="play-head ${L.color}"><button class="btn ghost small" id="back">${I.back} النتائج</button>
        <h1 class="grow">راجعي أخطائي · ${esc(L.lesson)}</h1>
        <button class="btn small gold" id="rv">${I.book} ملف الدرس</button></div>
      ${items.length ? '' : '<div class="banner info">لا توجد أخطاء في هذه المرحلة. أحسنتِ!</div>'}
      <div class="list ${L.color}">
        ${items.map(x => {
          const wrong = x.s.attempts.filter(a => !a.ok).map(a => B.optionText(x.q, a.c));
          return `<article class="panel mist">
            <div class="qmeta"><span class="tag">${esc(x.q.no)}</span><span class="tag concept">${esc(x.q.concept)}</span><span class="tag num">${x.s.attempts.length} محاولات</span>
              ${x.s.state === 'unsolved' ? '<span class="tag retry">لم يُحل</span>' : ''}</div>
            <p style="font-weight:600">${esc(x.q.text)}</p>
            <p class="yours">${I.x.replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"')} إجاباتكِ غير الصحيحة: ${wrong.map(esc).join(' — ')}</p>
            <p class="right">${I.check.replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px"')} الإجابة الصحيحة: ${esc(B.optionText(x.q, x.q.answer))}</p>
            <p>${esc(x.q.why)}</p>
            ${x.q.correction ? `<p class="muted" style="font-size:.9rem"><b>التصويب:</b> ${esc(x.q.correction)}</p>` : ''}
          </article>`;
        }).join('')}
      </div>
      <div class="actions"><button class="btn ghost" id="toMap3">العودة إلى خريطة المغامرة</button></div>`;
    $('#back').onclick = () => go('results', lid);
    $('#toMap3').onclick = () => go('map');
    $('#rv').onclick = () => openReview(lid, null);
  }

  /* ---------------- ملف الدرس (لوحة جانبية) ---------------- */
  const DIAGRAMS = {
    cia: `<svg viewBox="0 0 320 210" role="img" aria-label="مثلث الحماية: السرية والتكامل والتوافر">
      <polygon points="160,20 290,185 30,185" style="fill:var(--surface-2);stroke:var(--gold);stroke-width:3"/>
      <text x="160" y="125" text-anchor="middle" style="fill:var(--ink);font:600 15px var(--f-display)">مثلث الحماية CIA</text>
      <circle cx="160" cy="20" r="16" style="fill:var(--c1)"/><circle cx="290" cy="185" r="16" style="fill:var(--c3)"/><circle cx="30" cy="185" r="16" style="fill:var(--c4)"/>
      <text x="160" y="58" text-anchor="middle" style="fill:var(--ink);font:600 13px var(--f-body)">السرية</text>
      <text x="252" y="172" text-anchor="middle" style="fill:var(--ink);font:600 13px var(--f-body)">التكامل</text>
      <text x="70" y="172" text-anchor="middle" style="fill:var(--ink);font:600 13px var(--f-body)">التوافر</text>
      <text x="160" y="205" text-anchor="middle" style="fill:var(--muted);font:12px var(--f-body)">Confidentiality · Integrity · Availability</text></svg>`,
    table: `<svg viewBox="0 0 320 150" role="img" aria-label="جدول يوضح الحقل عمودًا والسجل صفًّا">
      ${[0, 1, 2, 3].map(r => [0, 1, 2].map(c => `<rect x="${220 - c * 100}" y="${20 + r * 30}" width="100" height="30" style="fill:${r === 2 ? 'color-mix(in srgb, var(--c1) 30%, var(--surface))' : c === 1 && r > 0 ? 'color-mix(in srgb, var(--gold) 35%, var(--surface))' : r === 0 ? 'var(--surface-2)' : 'var(--surface)'};stroke:var(--line)"/>`).join('')).join('')}
      ${['الرقم', 'الاسم', 'الفصل'].map((t, c) => `<text x="${270 - c * 100}" y="40" text-anchor="middle" style="fill:var(--ink);font:700 12px var(--f-body)">${t}</text>`).join('')}
      ${[['1', 'سارة', '3/1'], ['2', 'نورة', '3/2'], ['3', 'ريم', '3/1']].map((row, r) => row.map((t, c) => `<text x="${270 - c * 100}" y="${70 + r * 30}" text-anchor="middle" style="fill:var(--ink);font:12px var(--f-body)">${t}</text>`).join('')).join('')}
      <text x="170" y="145" text-anchor="middle" style="fill:var(--muted);font:11px var(--f-body)">عمود «الاسم» = حقل · صف «نورة» = سجل</text></svg>`,
    relations: `<svg viewBox="0 0 320 190" role="img" aria-label="أنواع العلاقات الثلاثة">
      ${[['الطالب', 'البيانات الطبية', '1', '1', 'رأس برأس'], ['المدرسة', 'المعلمون', '1', '∞', 'رأس بأطراف'], ['الطلاب', 'الدورات', '∞', '∞', 'أطراف بأطراف']].map((r, i) => {
        const y = 15 + i * 60;
        return `<rect x="200" y="${y}" width="105" height="34" rx="7" style="fill:var(--surface-2);stroke:var(--c3)"/>
          <rect x="15" y="${y}" width="105" height="34" rx="7" style="fill:var(--surface-2);stroke:var(--c3)"/>
          <text x="252" y="${y + 22}" text-anchor="middle" style="fill:var(--ink);font:600 12px var(--f-body)">${r[0]}</text>
          <text x="67" y="${y + 22}" text-anchor="middle" style="fill:var(--ink);font:600 12px var(--f-body)">${r[1]}</text>
          <line x1="200" y1="${y + 17}" x2="120" y2="${y + 17}" style="stroke:var(--gold);stroke-width:2.5"/>
          <text x="190" y="${y + 12}" text-anchor="middle" style="fill:var(--gold-ink);font:700 12px var(--f-body)">${r[2]}</text>
          <text x="130" y="${y + 12}" text-anchor="middle" style="fill:var(--gold-ink);font:700 12px var(--f-body)">${r[3]}</text>
          <text x="160" y="${y + 48}" text-anchor="middle" style="fill:var(--muted);font:11px var(--f-body)">${r[4]}</text>`;
      }).join('')}</svg>`
  };
  function sectionHtml(sec, focus) {
    let inner = '';
    switch (sec.kind) {
      case 'text': inner = `<p>${esc(sec.body)}</p>`; break;
      case 'list': inner = `<ul>${sec.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`; break;
      case 'steps': inner = `<ol>${sec.items.map(i => `<li>${esc(i)}</li>`).join('')}</ol>`; break;
      case 'terms': inner = `<dl class="terms">${sec.items.map(t => `<div><dt>${esc(t[0])}</dt><dd>${esc(t[1])}</dd></div>`).join('')}</dl>`; break;
      case 'table': inner = `<div class="tbl-wrap"><table class="tbl"><thead><tr>${sec.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${sec.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; break;
      case 'compare': inner = `<div class="vs"><div><b>${esc(sec.a.t)}</b>${esc(sec.a.d)}</div><span>مقابل</span><div><b>${esc(sec.b.t)}</b>${esc(sec.b.d)}</div></div>`; break;
      case 'diagram': inner = `<figure class="diagram" style="margin:0">${DIAGRAMS[sec.diagram] || ''}<figcaption>${esc(sec.caption || '')}</figcaption></figure>`; break;
    }
    return `<section class="rsec ${focus ? 'focus' : ''}">${focus ? '<span class="here">مرتبط بسؤالكِ الحالي — ابدئي من هنا</span>' : ''}<h3>${esc(sec.title)}</h3>${inner}</section>`;
  }
  let lastFocus = null;
  function openReview(lid, concept, tab) {
    const L = B.lesson(lid), R = MDQ.review[lid], res = (settings().resources || {})[lid] || [];
    tab = tab || 'pdf0';
    lastFocus = document.activeElement;
    const dr = $('#drawer'), bg = $('#drawerBg');
    const ordered = concept ? [...R.sections.filter(s => s.concepts.includes(concept)), ...R.sections.filter(s => !s.concepts.includes(concept))] : R.sections;
    const tabs = L.pdfs.map((p, j) => [`pdf${j}`, L.pdfs.length > 1 ? (j ? 'ملف التقارير' : 'ملف الاستعلام') : 'ملف الدرس']).concat([['sum', 'ملخص سريع']]);
    dr.innerHTML = `
      <header><span class="dr-ic">${I.book}</span>
        <div class="grow"><h2 id="drTitle">ملف الدرس | تعلّمي قبل أن تجيبي</h2><small class="muted">${esc(L.lesson)}</small></div>
        <button class="btn ghost small" id="drClose" aria-label="إغلاق">${I.x}</button></header>
      <div class="dr-tabs" role="tablist">${tabs.map(t => `<button role="tab" data-dt="${t[0]}" aria-selected="${t[0] === tab}">${t[1]}</button>`).join('')}</div>
      <div class="body" id="drBody"></div>
      <footer><button class="btn" id="drBack" style="width:100%">${I.back} العودة إلى السؤال</button></footer>`;
    const body = $('#drBody');
    const show = t => {
      dr.querySelectorAll('[data-dt]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.dt === t)));
      dr.classList.toggle('wide', t !== 'sum');
      body.scrollTop = 0;
      if (t === 'sum') {
        body.innerHTML = `<p class="muted" style="font-size:.88rem">${esc(R.note)} هذه البطاقات ليست تلخيصًا شاملًا للكتاب المدرسي.</p>
          ${ordered.map(s => sectionHtml(s, concept && s.concepts.includes(concept))).join('')}
          <section class="extra"><b>مواد شرح إضافية من المعلمة</b>
            ${res.length ? `<ul style="margin:6px 0 0;padding-inline-start:20px">${res.map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title || r.url)}</a></li>`).join('')}</ul>`
              : '<p class="muted" style="font-size:.85rem">لم تُضف المعلمة موادًا إضافية لهذا الدرس بعد.</p>'}
          </section>`;
      } else {
        const pd = L.pdfs[+t.slice(3)] || L.pdfs[0];
        body.innerHTML = '<div class="pdf-host"></div>';
        MDQ.lessonViewer.render(body.firstElementChild, pd.file, pd.title);
      }
    };
    dr.querySelectorAll('[data-dt]').forEach(b => b.onclick = () => { SFX.play('tap'); show(b.dataset.dt); });
    dr.setAttribute('aria-labelledby', 'drTitle');
    dr.hidden = false; bg.hidden = false;
    show(tab);
    requestAnimationFrame(() => { dr.classList.add('open'); bg.classList.add('open'); });
    SFX.play('open');
    $('#drBack').textContent = ui.view === 'play' ? 'العودة إلى السؤال' : 'إغلاق الملف';
    $('#drClose').onclick = closeReview; $('#drBack').onclick = closeReview; bg.onclick = closeReview;
    setTimeout(() => $('#drClose').focus(), 50);
    if (session) { MDQ.tracker.emit(session, 'review_open', { lessonId: lid, questionId: ui.view === 'play' ? (E.stage(session, lid).cur || '') : '', concept: concept || '' }); save(); }
  }
  function closeReview() {
    const dr = $('#drawer'), bg = $('#drawerBg');
    dr.classList.remove('open'); bg.classList.remove('open');
    setTimeout(() => { dr.hidden = true; bg.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#drawer').hidden) closeReview(); });

  /* ---------------- الاحتفال والإشعارات ---------------- */
  function toast(b) {
    const d = MDQ.rules.BADGES[b.id];
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = `<span class="disc">${FX.badge(b.id)}</span><div><b>شارة جديدة: ${esc(d.name)}</b><div style="font-size:.85rem;opacity:.85">${esc(d.desc)}</div></div>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }
  function celebrate() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas'); c.id = 'confetti'; document.body.appendChild(c);
    const ctx = c.getContext('2d'); const W = c.width = innerWidth, H = c.height = innerHeight;
    const cols = ['#FF6FB5', '#7A5CFF', '#4CC9F0', '#FFD23F', '#3DDC97', '#FF9F43'];
    const P = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * 200, y: H * .35, vx: (Math.random() - .5) * 9, vy: -Math.random() * 9 - 3, r: Math.random() * 5 + 3, c: cols[Math.floor(Math.random() * cols.length)], a: Math.random() * 6, star: Math.random() < .4 }));
    let f = 0;
    (function tick() {
      ctx.clearRect(0, 0, W, H);
      P.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += .25; p.a += .1;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c;
        if (p.star) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? p.r * .45 : p.r * 1.2, an = i * Math.PI / 5; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); } ctx.fill(); }
        else ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      });
      if (++f < 150) requestAnimationFrame(tick); else c.remove();
    })();
  }

  /* ---------------- الإقلاع ---------------- */
  MDQ.ui = { esc, go, render, renderTop, openReview };
  let ended = false;
  function endSession() {
    if (!session || ended) return;
    ended = true;
    const evt = MDQ.tracker.emit(session, 'session_end', {});
    save();
    // أفضل جهد عند إغلاق الصفحة؛ ويبقى الحدث في صندوق الإرسال (مع منع التكرار في الخادم)
    MDQ.api.beacon(evt);
    try { const ob = MDQ.store.get(MDQ.KEYS.outbox, []); ob.forEach(x => { if (x.eventId === evt.eventId) x._tries = 1; }); MDQ.store.set(MDQ.KEYS.outbox, ob); } catch (e) {}
  }
  window.addEventListener('pagehide', endSession);
  /** هوية ثابتة: ترقية بيانات قديمة، ودخول جديد عند كل فتح للموقع */
  function initIdentity() {
    if (!session) return;
    if (!session.studentId) {
      session.studentId = MDQ.tracker.uid('ST').slice(0, 39); session.code = E.makeCode();
      MDQ.tracker.emit(session, 'student_register', { studentCode: session.code });
    }
    let sid = null; try { sid = sessionStorage.getItem('mdq.sid'); } catch (e) {}
    if (sid && sid === session.sessionId) return; // تحديث الصفحة داخل الجلسة نفسها
    E.resumeSession(session);
    try { sessionStorage.setItem('mdq.sid', session.sessionId); } catch (e) {}
    save();
  }
  async function boot() {
    if (!MDQ.store.persistent) {
      const w = document.createElement('div');
      w.className = 'wrap'; w.style.paddingBlock = '12px 0';
      w.innerHTML = '<div class="banner bad">المتصفح يمنع الحفظ على هذا الجهاز (ربما وضع التصفح الخاص). ستعمل اللعبة، لكن لا تحدّثي الصفحة حتى لا يضيع تقدمكِ.</div>';
      document.querySelector('main').prepend(w);
    }
    initIdentity();
    if (session) ui.view = 'map';
    FX.petals();
    const tb = document.getElementById('teacherBtn'); if (tb) tb.onclick = () => MDQ.auth.open();
    const sbtn = document.getElementById('soundBtn');
    if (sbtn) {
      const paint = () => { sbtn.textContent = SFX.enabled ? '🔊' : '🔇'; sbtn.setAttribute('aria-label', SFX.enabled ? 'كتم الأصوات' : 'تشغيل الأصوات'); sbtn.setAttribute('aria-pressed', String(SFX.enabled)); };
      paint(); sbtn.onclick = () => { SFX.toggle(); paint(); };
    }
    render();
    await MDQ.settings.loadRemote();
    if (MDQ.sync.mode === 'remote') MDQ.sync.flush();
    if (ui.view === 'welcome' || ui.view === 'map') render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
