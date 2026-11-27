/* ============================================================
   وكيل الخطط العلاجية (للمعلمة فقط) — مستوى الاستقلالية 1: يحلّل ويقترح ولا ينفّذ، والقرار للمعلمة.
   - المثير: زر «إرسال المحددات إلى وكيل الخطط العلاجية» في قسم «طالبات يُقترح دعمهن في هذا الناتج» بوكيل الأهداف.
   - يأخذ الطالبات المحدَّدات ويحلّل نواتجهن المخفقة في البعدي كلها، ويصمّم لكل طالبة خطة (حتى 3 خطوات لكل ناتج)
     من الكتاب المدرسي (remedial-data.js)، مع الرجوع إلى دليل المعلم الصادر عن وزارة التعليم لإرشاد المعلمة (تنبيهات «نقاط مهمة» وصفحات خطوات التنفيذ وحلول التدريبات) دون أن يضيف أنشطة منه. لا يخترع محتوى: إن لم يجد في الكتاب ما يخدم الناتج يقول ذلك.
   - الخطة قابلة للتعديل قبل الاعتماد؛ الاعتماد يقفلها ويُسجَّل، وإعادة الفتح تُسجَّل.
   - بعد المعالجة: ترفع المعلمة ملف إجابات الطالبات، فيطابق الأسماء بقواعد وكيل الأهداف نفسها (ويتوقف عند المشتبه)،
     ثم يقارن بنتيجة البعدي ويحسب التحسّن والتوصيات.
   - الذاكرة: ملف لكل طالبة (مستوياتها وخططها وحالاتها) في localStorage بالمفتاح mdq.agent.remedial.v1.
   - كل شيء يجري داخل المتصفح؛ لا يُرسل شيء لأي جهة، ولا يعدّل بيانات الطالبات أو الأسئلة أو درجات الموقع.
   - المقارنة وصفية لا سببية: الطالبات اللواتي اختيرن لإخفاقهن في البعدي سيرتفعن غالبًا بحكم الارتداد نحو المتوسط.
   ============================================================ */
(function () {
  window.MDQ = window.MDQ || {};
  const KEY = 'mdq.agent.remedial.v1', VERSION = '1.0.0', MAXOPEN = 4, MINPAIRS = 8, STEP_MIN = [5, 7, 3];
  const LESSON_ORDER = ['cyber', 'device', 'db', 'query'];
  const G = () => MDQ.goals, P = () => MDQ.post;
  let mem = null, memOnly = false;

  /* ---------- الذاكرة ---------- */
  const blank = () => ({ v: 1, plans: {}, profiles: {}, after: null });
  function load() {
    if (mem) return mem;
    try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); mem = v && v.v === 1 ? v : blank(); } catch (e) { mem = blank(); }
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); memOnly = false; return true; } catch (e) { memOnly = true; return false; } }
  function wipe() { mem = blank(); try { localStorage.removeItem(KEY); } catch (e) {} memOnly = false; log('مُسحت بيانات وكيل الخطط العلاجية', ''); }
  function reset() { mem = null; }
  const log = (ev, d) => { try { if (G()) G().logEvent('remedial', ev, d || ''); } catch (e) {} };
  const now = () => new Date().toISOString();

  /* ---------- أدوات ---------- */
  const rowOf = qid => ((MDQ.outcomes || {}).ROWS || []).find(r => r.qid === qid) || null;
  const kindOf = qid => { const r = rowOf(qid); return r && /التطبيق|التحليل|التقويم|الإبداع/.test(r.bloom || '') ? 'procedure' : 'concept'; };
  const lessonTitle = k => (MDQ.textbook && MDQ.textbook.LESSONS[k] ? MDQ.textbook.LESSONS[k].title : k);
  const attemptsOf = (s, qid) => { const q = s && s.q && s.q.get && s.q.get(qid); return q && q.attempts ? q.attempts : []; };
  const isOk = a => a.isCorrect === true || a.isCorrect === 1 || String(a.isCorrect).toLowerCase() === 'true';
  const pct = (a, b) => b ? Math.round(a / b * 100) : null;
  const key = (id, qid, n) => id + '|' + qid + '|' + (n || 0);
  const plansOf = id => Object.values(load().plans).filter(p => p.studentId === id);
  const latest = (id, qid) => Object.values(load().plans).filter(p => p.studentId === id && p.qid === qid).sort((a, b) => a.attempt - b.attempt).pop() || null;

  /** لقطة أداء الطالبة في الموقع على سؤال الناتج (تُحفظ مع الخطة لتبقى الذاكرة متسقة) */
  function gameOf(s, qid) {
    const at = attemptsOf(s, qid).slice().sort((a, b) => String(a.clientTime).localeCompare(String(b.clientTime)));
    const i = at.findIndex(isOk), ok = at.filter(isOk).length;
    return { attempts: at.length, correct: ok, share: pct(ok, at.length), tries: i < 0 ? null : i + 1 };
  }
  /** تشخيص احتمالي من بيانات اللعبة وحدها (وسم «احتمال» لا «حكم») */
  function diagnose(g, base) {
    if (!g || !g.attempts) return 'احتمال: لا محاولات للطالبة على هذا السؤال في الموقع، فالتشخيص غير ممكن.';
    if (g.tries == null) return 'احتمال: لم تصل إلى الإجابة الصحيحة في الموقع حتى بعد التلميحات، فالمفهوم غير مستقر.';
    if (g.tries >= 3) return 'احتمال: احتاجت إلى ' + g.tries + ' محاولات في الموقع قبل الإصابة، فالفهم هشّ.';
    if (base) return 'احتمال: أصابت من المحاولة الأولى في الموقع ثم لم تتحقق في البعدي: تراجع أو اختلاف صياغة (راجعي تكافؤ الصياغة).';
    return 'احتمال: أصابت بعد تلميح في الموقع ثم لم تتحقق في البعدي: تحتاج إلى تثبيت المفهوم.';
  }

  /* ---------- تصميم الخطة من الكتاب ---------- */
  function designSteps(qid, attempt) {
    const e = MDQ.textbook && MDQ.textbook.get(qid);
    if (!e) return { book: null, steps: [], note: 'لا يوجد في الكتاب ما يخدم هذا الناتج؛ لا أقترح من خارجه.' };
    const L = MDQ.textbook.LESSONS[e.file] || {}, acts = e.activity || [], a = acts.length ? acts[attempt % acts.length] : null;
    const alt = attempt > 0 ? 'بأسلوب مختلف عن المحاولة السابقة: ' : '';
    const steps = [
      { t: 'راجعي في الكتاب «' + (L.title || e.file) + '» (' + MDQ.textbook.pg(e) + ') موضع «' + e.section + '»: ' + e.points, min: STEP_MIN[0] },
      { t: alt + (a ? 'نفّذي ' + a.n + ' (ص' + a.p + (a.what ? ': ' + a.what : '') + ').' : 'نفّذي مثالًا تطبيقيًا قصيرًا على الناتج من الكتاب.'), min: STEP_MIN[1] },
      { t: e.check, min: STEP_MIN[2] }
    ];
    const note = attempt > 0 && acts.length <= 1 ? 'لا يتوفر في الكتاب نشاط بديل لهذا الناتج؛ غيّري طريقة الشرح (نظيرة أو مجموعة صغيرة) بدل تكرار النشاط نفسه.' : '';
    return { book: { file: e.file, title: L.title || e.file, unit: L.unit || '', pages: e.pages, section: e.section }, guide: MDQ.textbook.guideFor(qid), steps, note };
  }

  /** يبني خطة طالبة لناتج؛ attempt = رقم المحاولة العلاجية (0 للأولى) */
  function buildPlan(stu, o, attempt, week) {
    const d = designSteps(o.qid, attempt), r = rowOf(o.qid);
    return { key: key(stu.studentId, o.qid, attempt), studentId: stu.studentId, name: stu.name, cls: stu.className || '', qid: o.qid, outcome: o.outcome || (r && r.outcome) || o.qid,
      lesson: o.lesson || (r && r.lesson) || '', kind: kindOf(o.qid), week, attempt, game: o.game, base: !!o.base, post: false, diagnosis: diagnose(o.game, o.base),
      book: d.book, guide: d.guide, steps: d.steps, note: d.note, status: 'draft', createdAt: now(), editedAt: null, approvedAt: null, afterPass: null };
  }

  /** ترتيب أولويات النواتج لطالبة: المختار أولًا، ثم الضعف المستمر، ثم المفهوم قبل الإجراء، ثم ترتيب الدروس */
  function prioritize(list, firstQid) {
    return list.slice().sort((a, b) => (b.qid === firstQid) - (a.qid === firstQid) || (a.base ? 1 : 0) - (b.base ? 1 : 0)
      || (a.kind === 'procedure' ? 1 : 0) - (b.kind === 'procedure' ? 1 : 0) || LESSON_ORDER.indexOf(a.lesson) - LESSON_ORDER.indexOf(b.lesson));
  }

  /** الطالبات الأكثر إخفاقًا في نواتج البعدي كلها (وصفي): يرتّب بعدد النواتج المخفقة ثم بنسبتها من المُختبَر */
  function topFailing(A) {
    if (!A || !A.rows) return [];
    const m = {};
    A.rows.forEach(r => { if (r.counted === false) return; (r.per || []).forEach(p => { const id = p.s.studentId, e = m[id] = m[id] || { s: p.s, name: p.name || p.s.name, tested: 0, fails: [] }; e.tested++; if (!p.post) e.fails.push(r.outcome); }); });
    return Object.values(m).filter(e => e.fails.length).sort((a, b) => b.fails.length - a.fails.length || (b.fails.length / b.tested) - (a.fails.length / a.tested) || String(a.name).localeCompare(String(b.name), 'ar'));
  }

  /**
   * المثير: يستقبل نتيجة تحليل البعدي A ومعرّف الناتج والطالبات المحددات، ويُنشئ خطط كل نواتجهن المخفقة (حتى MAXOPEN مفتوحة).
   * لا يبدأ قبل اكتمال مطابقة الأسماء.
   */
  function send(A, qid, ids) {
    if (!A || !A.rows) return { ok: false, msg: 'ارفعي ملف الاختبار البعدي أولًا.' };
    if (A.tally && A.tally.pending) return { ok: false, msg: 'توقّفتُ: ' + A.tally.pending + ' اسمًا في الاختبار البعدي لم تُحسم مطابقته. أكملي القرارات أولًا ثم أعيدي الإرسال.' };
    if (!ids || !ids.length) return { ok: false, msg: 'حدّدي طالبة واحدة على الأقل.' };
    const d = load(); let made = 0, kept = 0, deferred = 0, studs = 0;
    ids.forEach(id => {
      const lv = [];
      A.rows.forEach(r => { if (r.counted === false) return; const p = (r.per || []).find(x => x.s.studentId === id); if (p) lv.push({ qid: r.qid, outcome: r.outcome, lesson: r.lesson, base: !!p.base, post: !!p.post, tries: p.tries, s: p.s, game: gameOf(p.s, r.qid), kind: kindOf(r.qid) }); });
      if (!lv.length) return;
      const s = lv[0].s; studs++;
      d.profiles[id] = { name: s.name, cls: s.className || '', levels: lv.reduce((m, x) => { m[x.qid] = { outcome: x.outcome, lesson: x.lesson, base: x.base, post: x.post, tries: x.game.tries, attempts: x.game.attempts }; return m; }, {}),
        skills: lv.filter(x => !x.post).map(x => x.outcome), updatedAt: now() };
      const failed = prioritize(lv.filter(x => !x.post), qid);
      let open = plansOf(id).filter(p => p.status !== 'approved').length;
      failed.forEach(x => {
        const last = latest(id, x.qid);
        let attempt = 0;
        if (last) {
          if (last.status !== 'approved' || last.afterPass !== false) { kept++; return; }
          attempt = last.attempt + 1;
        }
        if (open >= MAXOPEN) { deferred++; return; }
        const p = buildPlan(s, x, attempt, plansOf(id).length + 1);
        d.plans[p.key] = p; open++; made++;
      });
    });
    save();
    log('أُنشئت خطط علاجية', made + ' خطة لـ ' + studs + ' طالبة' + (deferred ? ' · مؤجَّل ' + deferred : '') + (kept ? ' · قائم ' + kept : ''));
    return { ok: true, made, kept, deferred, studs, msg: 'أُنشئت ' + made + ' خطة مسودة لـ ' + studs + ' طالبة' + (kept ? ' (' + kept + ' قائمة سابقًا لم تُكرَّر)' : '') + (deferred ? ' · ' + deferred + ' ناتجًا مؤجَّلًا (يكفي ' + MAXOPEN + ' خطط مفتوحة للطالبة)' : '') + '.' };
  }

  /* ---------- التعديل والاعتماد ---------- */
  function setSteps(k, steps) {
    const p = load().plans[k]; if (!p || p.status === 'approved') return false;
    const clean = steps.map(s => ({ t: String(s.t || '').trim(), min: Math.max(1, Math.min(60, Math.round(+s.min || 0) || 5)) })).filter(s => s.t);
    p.steps = clean; p.status = 'edited'; p.editedAt = now(); save(); log('عُدّلت خطة', p.name + ' · ' + p.outcome.slice(0, 40)); return true;
  }
  function approve(k) {
    const p = load().plans[k]; if (!p) return { ok: false, msg: 'الخطة غير موجودة.' };
    if (!p.steps.length) return { ok: false, msg: 'لا يمكن اعتماد خطة بلا خطوات.' };
    if (p.status === 'approved') return { ok: true, msg: 'الخطة معتمدة سابقًا.' };
    p.status = 'approved'; p.approvedAt = now(); const ok = save();
    log('تم اعتماد الخطة', p.name + ' · ' + p.outcome.slice(0, 40));
    return { ok: true, saved: ok, msg: ok ? 'تم اعتماد الخطة.' : 'تم اعتماد الخطة في هذه الجلسة فقط (تعذّر حفظها في المتصفح).' };
  }
  function reopen(k) {
    const p = load().plans[k]; if (!p || p.status !== 'approved') return false;
    p.status = 'edited'; p.approvedAt = null; p.afterPass = null; p.reopenedAt = now(); save(); log('أُعيد فتح خطة للتعديل', p.name + ' · ' + p.outcome.slice(0, 40)); return true;
  }
  function remove(k) { const d = load(); if (!d.plans[k] || d.plans[k].status === 'approved') return false; delete d.plans[k]; save(); return true; }

  /* ---------- ما بعد المعالجة ---------- */
  const QRX = /\b(db|qr|dv|cy)-\d{2}\b/i;
  function ingestAfter(table, fileName) {
    const sh = P().shape(table), d = load(), q = {};
    sh.headers.forEach((h, j) => { const m = String(h).match(QRX); if (m && j !== sh.nameCol) q[j] = m[0].toLowerCase(); });
    d.after = { file: fileName, at: now(), headers: sh.headers, rows: sh.rows.map(r => ({ key: r.key, name: r.cells[sh.nameCol] || '', cls: sh.clsCol >= 0 ? r.cells[sh.clsCol] : '', cells: r.cells })), nameCol: sh.nameCol, colMap: q, mode: 'auto', max: 1, pass: 100, reworded: false, decisions: {} };
    save(); log('رُفع ملف ما بعد المعالجة', fileName + ' · ' + sh.rows.length + ' صفًا'); return d.after;
  }
  /** يطابق الأسماء ويصحّح الخلايا: يعيد {ms, pending, byId:{studentId:{qid:true|false|null}}} ويحدّث afterPass للخطط المعتمدة */
  function computeAfter(model, B) {
    const d = load(), af = d.after; if (!af) return null;
    const rows = af.rows.map(r => ({ key: r.key, cells: [r.name], cls: r.cls })), ms = P().match(rows, 0, model.students, af.decisions || {});
    const approvedIds = new Set(Object.values(d.plans).filter(p => p.status === 'approved').map(p => p.studentId));
    const byId = {}, cols = Object.keys(af.colMap || {}).filter(j => af.colMap[j]);
    const modes = {};
    cols.forEach(j => { const qid = af.colMap[j], def = B && B.question ? B.question(qid) : null, vals = af.rows.map(r => r.cells[j]);
      modes[j] = af.mode === 'auto' ? (def ? P().detectMode(vals, def) : 'score') : af.mode; });
    ms.forEach((m, i) => { if (!m.final || m.needs) return; const out = byId[m.final.studentId] = byId[m.final.studentId] || {};
      cols.forEach(j => { const qid = af.colMap[j], def = B && B.question ? B.question(qid) : null, v = af.rows[i].cells[j];
        out[qid] = P().grade(v, def || { options: [], answer: null }, { mode: modes[j], max: af.max, pass: af.pass }); }); });
    let changed = false;
    Object.values(d.plans).forEach(p => { if (p.status !== 'approved') return; const v = byId[p.studentId] && byId[p.studentId][p.qid]; const nv = v === undefined ? null : v; if (p.afterPass !== nv) { p.afterPass = nv; p.afterAt = nv == null ? null : now(); changed = true; } });
    if (changed) save();
    return { ms, pending: ms.filter(m => m.needs).length, byId, matched: ms.filter(m => m.final && !m.needs).length, approvedIds, notPlanned: ms.filter(m => m.final && !m.needs && !approvedIds.has(m.final.studentId)).length };
  }

  /** ملخص التحسّن (دالة نقية). rows: [{qid, outcome, afterPass}] للخطط المعتمدة. جميعهن أخفقن في البعدي بحكم الاختيار. */
  function summarize(rows, opt) {
    opt = opt || {}; const target = opt.target || 90, by = {};
    rows.forEach(r => { const o = by[r.qid] = by[r.qid] || { qid: r.qid, outcome: r.outcome, n: 0, ok: 0, waiting: 0 }; if (r.afterPass == null) o.waiting++; else { o.n++; if (r.afterPass) o.ok++; } });
    const list = Object.values(by).map(o => { const rate = pct(o.ok, o.n); return Object.assign(o, { rate, gain: rate, hake: rate, recs: recsFor(o, rate, target, opt) }); });
    const n = list.reduce((s, o) => s + o.n, 0), ok = list.reduce((s, o) => s + o.ok, 0), rate = pct(ok, n);
    const recs = [];
    if (!n) recs.push('لم تصل نتائج ما بعد المعالجة بعد؛ ارفعي الملف.');
    else {
      recs.push('تحقق ' + ok + ' من ' + n + ' مقارنة (' + rate + '٪) بعد الخطة، من طالبات أخفقن جميعًا في البعدي (أساس 0٪ بحكم الاختيار).');
      if (n < MINPAIRS) recs.push('العدد قليل (' + n + ' < ' + MINPAIRS + ' مقارنات): لا تعمّمي النتيجة.');
      if (!opt.reworded) recs.push('تنبيه التذكّر: إن كان سؤال ما بعد المعالجة هو سؤال الموقع أو البعدي نفسه فجزء من التحسّن قد يكون تذكّرًا للإجابة. الأفضل صياغة معادة.');
      recs.push('المقارنة وصفية: اختيار الطالبات لإخفاقهن في البعدي يُضخّم التحسّن بحكم الارتداد نحو المتوسط، ولا يثبت أن الخطة وحدها هي السبب.');
    }
    return { byQ: list, total: { n, ok, rate }, recs };
  }
  function recsFor(o, rate, target, opt) {
    if (!o.n) return ['بانتظار نتائج هذا الناتج.'];
    const r = [];
    if (rate >= target) r.push('بلغ الهدف (' + rate + '٪ من ' + target + '٪): ثبّتي ما نفّذتِه ووثّقيه، وانتقلي لناتج آخر.');
    else if (rate > 0) r.push('تحسّن جزئي (' + rate + '٪): كرّري الخطة على من لم تتحقق مع نشاط مختلف من الكتاب، ثم أعيدي القياس.');
    else r.push('لم يظهر تحسّن: غيّري أسلوب المعالجة (نشاط آخر أو مجموعة صغيرة) بدل تكرار الخطوة نفسها.');
    if (o.n - o.ok) r.push((o.n - o.ok) + ' طالبة لم تتحققن: يُنشئ الوكيل لهن خطة جديدة بنشاط مختلف عند إعادة الإرسال.');
    if (o.waiting) r.push(o.waiting + ' خطة معتمدة بلا نتيجة بعد.');
    return r;
  }

  /* ---------- العرض ---------- */
  const STAT = { draft: ['مسودة', 'mid'], edited: ['معدّلة', 'mid'], approved: ['تم اعتماد الخطة', 'ok'] };
  const wkOrder = (a, b) => a.week - b.week || a.qid.localeCompare(b.qid);
  const fmtT = (T, iso) => { try { return T ? T(iso) : new Date(iso).toLocaleString('ar-SA-u-nu-latn'); } catch (e) { return iso || ''; } };
  const gameTxt = g => !g || !g.attempts ? 'لا محاولات' : (g.share == null ? '—' : g.share + '٪') + ' · ' + g.correct + '/' + g.attempts + (g.tries == null ? ' · لم تُصب' : ' · أصابت في المحاولة ' + g.tries);
  const bookTxt = p => p.book ? p.book.title + ' ' + (p.book.pages.length > 1 ? 'ص' + p.book.pages[0] + '–' + p.book.pages[p.book.pages.length - 1] : 'ص' + p.book.pages[0]) : 'لا موضع في الكتاب';
  const OKSVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-7"/></svg>';

  function view(body, ctx) {
    const { esc, pill, T, I, B, model } = ctx, d = load(), plans = Object.values(d.plans).sort(wkOrder);
    const Pp = P(), PQ = Pp.postQids(), goals = G().list().filter(x => PQ.includes(x.qid)), set = Pp.getSet(), A = set ? Pp.analyze(set, model, goals) : null;
    const af = d.after, AF = af ? computeAfter(model, B) : null;
    const planIds = [...new Set(plans.map(p => p.studentId))].sort((a, b) => String((d.profiles[a] || {}).name).localeCompare(String((d.profiles[b] || {}).name), 'ar'));
    const approved = plans.filter(p => p.status === 'approved');
    const qByStu = id => plansOf(id).sort(wkOrder);
    let h = `<section class="panel card rm" id="rmTop"><h2>وكيل الخطط العلاجية</h2>
      <div class="banner info" style="margin:6px 0"><div><b>بطاقة الوكيل:</b> وكيل محدود بمحرك قواعد لا نموذج لغوي · استقلالية 1: يقترح ولا ينفّذ والقرار للمعلمة · مصدره الكتاب المدرسي لمادة المهارات الرقمية (الصف الثالث المتوسط، الفصل الأول، الوحدتان 1 و2) ودليل المعلم الصادر عن وزارة التعليم (للإرشاد، لا لأنشطة من خارج الكتاب) · البيانات تبقى في هذا المتصفح ولا تُرسل لأي جهة · لا يعدّل درجات الموقع.</div></div>
      ${memOnly ? '<div class="banner bad" style="margin:6px 0"><div>تعذّر الحفظ في المتصفح: ما تفعلينه محفوظ في هذه الجلسة فقط؛ نزّلي الجدول قبل إغلاق الصفحة.</div></div>' : ''}
      <details><summary class="muted small-print">كيف يعمل الوكيل؟</summary><ol class="small-print"><li><b>المثير:</b> تحدّدين طالبات في «طالبات يُقترح دعمهن في هذا الناتج» بوكيل الأهداف ثم «إرسال المحددات».</li>
        <li><b>التحليل:</b> يقارن لكل طالبة نتيجتها في اللعبة بالبعدي في كل النواتج ويستخرج المخفقة.</li>
        <li><b>التصميم:</b> خطة من 3 خطوات (شرح من الكتاب، نشاط تطبيقي، تحقق ذاتي) في نحو 15 دقيقة، وبما لا يزيد على ${MAXOPEN} خطط مفتوحة للطالبة وخطة واحدة في الأسبوع.</li>
        <li><b>الاعتماد:</b> تعدّلين ثم تعتمدين بأيقونة الصح؛ الخطة المعتمدة تُقفل ويمكن إعادة فتحها.</li>
        <li><b>بعد المعالجة:</b> ترفعين ملف إجابات الطالبات فيطابق الأسماء ويحسب التحسّن ويكتب التوصيات.</li></ol></details></section>`;
    if (!plans.length) {
      h += `<section class="panel card rm"><p>لا خطط بعد. ${A ? 'اذهبي إلى «وكيل الأهداف» ← «طالبات يُقترح دعمهن في هذا الناتج»، حدّدي الطالبات ثم اضغطي «إرسال المحددات إلى وكيل الخطط العلاجية».' : 'ارفعي أولًا ملف الاختبار البعدي في «وكيل الأهداف».'}</p></section>`;
    } else {
      h += `<section class="panel card rm"><div class="row"><h2 class="grow" style="margin:0">خطط الطالبات (${planIds.length} طالبة · ${plans.length} خطة · ${approved.length} معتمدة)</h2>
        <button class="btn small" data-rm="cards">${I.download} بطاقات الخطط المعتمدة (Word)</button><button class="btn small" data-rm="tpl">${I.download} قالب ملف ما بعد المعالجة</button></div>`;
      planIds.forEach(id => {
        const pr = d.profiles[id] || {}, ps = qByStu(id), lv = Object.values(pr.levels || {}), failN = lv.filter(x => !x.post).length;
        h += `<div class="rm-stu"><div class="row"><b class="grow">${esc(pr.name || '')}</b><span class="muted small-print">${esc(pr.cls || '')}</span><span class="pill ${failN > 2 ? 'low' : 'mid'}">${failN} نواتج مخفقة من ${lv.length}</span></div>
          <p class="muted small-print" style="margin:2px 0">ملف الطالبة: المهارات المستهدفة: ${esc((pr.skills || []).slice(0, 5).map(x => x.slice(0, 45)).join(' · ') || '—')}</p>`;
        ps.forEach(p => {
          const st = STAT[p.status], ed = !!(this_edit[p.key]), group = plans.filter(x => x.qid === p.qid && x.status !== 'approved' && x.studentId !== p.studentId).length;
          h += `<div class="rm-plan" data-pk="${esc(p.key)}"><div class="row"><b class="grow">${esc(p.outcome)}</b><span class="pill na">الأسبوع ${p.week}</span>${p.attempt ? `<span class="pill mid">محاولة علاجية ${p.attempt + 1}</span>` : ''}${group ? `<span class="pill ok">مجموعة صغيرة (${group + 1})</span>` : ''}<span class="pill ${st[1]}" id="rs-${esc(p.key)}">${st[0]}</span>
              <button class="rm-ok" data-rm="ok" aria-pressed="${p.status === 'approved'}" title="${p.status === 'approved' ? 'تم اعتماد الخطة' : 'اعتماد الخطة'}" aria-label="${p.status === 'approved' ? 'تم اعتماد الخطة' : 'اعتماد الخطة'}" ${p.status === 'approved' ? 'disabled' : ''}>${OKSVG}</button></div>
            <p class="small-print" style="margin:2px 0">${esc(p.diagnosis)}</p>
            ${p.steps.length ? (ed && p.status !== 'approved' ? `<ol class="rm-steps">${p.steps.map((s, i) => `<li><textarea class="t-input" data-rms="${i}" rows="2" style="width:100%">${esc(s.t)}</textarea><label class="small-print">الدقائق<input class="t-input" data-rmm="${i}" type="number" min="1" max="60" value="${s.min}" style="width:70px"></label><button class="btn ghost small" data-rm="delstep" data-i="${i}">حذف الخطوة</button></li>`).join('')}</ol>
              <div class="row"><button class="btn gold small" data-rm="savestep">احفظي التعديل</button><button class="btn ghost small" data-rm="canceledit">إلغاء</button></div>`
              : `<ol class="rm-steps">${p.steps.map(s => `<li>${esc(s.t)} <span class="muted small-print">(${s.min} د)</span></li>`).join('')}</ol>`) : `<div class="banner info" style="margin:4px 0"><div>${esc(p.note)}</div></div>`}
            ${p.note && p.steps.length ? `<p class="small-print muted">${esc(p.note)}</p>` : ''}
            ${(() => { const g = p.guide || (MDQ.textbook && MDQ.textbook.guideFor(p.qid)); return g ? `<p class="small-print" style="margin:2px 0"><b>من دليل المعلم:</b> ${g.tip ? esc(g.tip) + ' · ' : ''}<span class="muted">${esc(MDQ.textbook.guideTxt(g))}</span></p>` : ''; })()}
            <p class="muted small-print" style="margin:2px 0">الموضع: ${esc(bookTxt(p))} · المدة: ${p.steps.reduce((s, x) => s + x.min, 0)} دقيقة${p.status === 'approved' ? ' · اعتُمدت ' + esc(fmtT(T, p.approvedAt)) : ''}</p>
            <div class="row">${p.status === 'approved' ? '<button class="btn ghost small" data-rm="reopen">إعادة فتح للتعديل</button>' : `<button class="btn small" data-rm="edit">تعديل الخطة</button><button class="btn ghost small" data-rm="del">حذف المسودة</button>`}</div></div>`;
        });
        h += '</div>';
      });
      h += '</section>';
      /* ---- ما بعد المعالجة ---- */
      h += `<section class="panel card rm"><h2>ما بعد المعالجة</h2>`;
      if (!approved.length) h += '<p class="muted small-print">اعتمدي خطة واحدة على الأقل ثم نزّلي قالب الملف وارفعيه بعد التنفيذ.</p>';
      else {
        h += `<p class="muted small-print">بعد تنفيذ الخطط اجمعي إجابات الطالبات المعتمدة خططهن في ملف Excel/CSV (اسم الطالبة + عمود لكل ناتج؛ يحمل رأس العمود رمز الناتج مثل db-03)، ثم ارفعيه. يبقى الملف في متصفحكِ.</p>
          <div class="row"><input type="file" accept=".xlsx,.csv" id="rmFile"><button class="btn gold" data-rm="load">ارفعي وقارني</button>${af ? '<button class="btn ghost small" data-rm="delafter">حذف الملف</button>' : ''}</div>`;
        if (af) {
          const qids = [...new Set(approved.map(p => p.qid))], opts = c => `<option value="">— تجاهل —</option>${qids.map(q => `<option value="${esc(q)}" ${af.colMap[c] === q ? 'selected' : ''}>${esc(q)} · ${esc((rowOf(q) || {}).outcome ? rowOf(q).outcome.slice(0, 40) : '')}</option>`).join('')}`;
          h += `<p class="muted small-print">${esc(af.file)} · ${esc(fmtT(T, af.at))} · ${af.rows.length} صفًا</p>
            <div class="row" style="flex-wrap:wrap;gap:10px"><label>طريقة التصحيح<select class="t-input" id="rmMode"><option value="auto" ${af.mode === 'auto' ? 'selected' : ''}>تلقائي</option><option value="score" ${af.mode === 'score' ? 'selected' : ''}>صح/خطأ أو 0/1 أو درجة</option><option value="choice" ${af.mode === 'choice' ? 'selected' : ''}>الخيار المختار</option></select></label>
              <label>الدرجة العظمى<input class="t-input" id="rmMax" type="number" min="1" value="${af.max}" style="width:80px"></label><label>النجاح عند ٪<input class="t-input" id="rmPass" type="number" min="1" max="100" value="${af.pass}" style="width:80px"></label>
              <label><input type="checkbox" id="rmRe" ${af.reworded ? 'checked' : ''}> أسئلة ما بعد المعالجة بصياغة معادة (ليست سؤال الموقع نفسه)</label></div>
            <details ${Object.keys(af.colMap).length ? '' : 'open'}><summary class="small-print">أعمدة الملف ← النواتج</summary><div class="row" style="flex-wrap:wrap">${af.headers.map((x, c) => c === af.nameCol ? '' : `<label class="small-print">${esc(x || 'عمود ' + (c + 1))}<select class="t-input" data-rmcol="${c}">${opts(c)}</select></label>`).join('')}</div></details>`;
          const need = AF ? AF.ms.filter(m => m.needs) : [];
          if (need.length) {
            const cand = id => (d.profiles[id] || {}).name;
            h += `<div class="banner bad" style="margin:8px 0"><div><b>توقفتُ وأحتاج قراركِ:</b> الأسماء التالية في ملف ما بعد المعالجة غير مطابقة تمامًا لطالبات الموقع (أو مكررة). لن تدخل في الحساب حتى تقرّري.</div></div>
              <div class="t-scroll" style="max-height:260px"><table class="t-table"><thead><tr><th>الاسم في الملف</th><th>الحالة</th><th>قراركِ</th></tr></thead><tbody>${need.map(m => `<tr data-rmk="${esc(m.row.key)}"><td>${esc(m.name)}</td><td>${esc(m.multi ? 'صفّان لطالبة واحدة' : ({ similar: 'اسم مشابه', none: 'لا مطابق', dupe: 'اسم مكرر', empty: 'فارغ' }[m.status] || m.status))}</td>
                <td><select class="t-input" data-rmdec><option value="">— اختاري —</option><option value="x">استبعاد</option>${m.cands.map(c => `<option value="${esc(c.s.studentId)}">${esc(c.s.name)}</option>`).join('')}${planIds.filter(id => !m.cands.some(c => c.s.studentId === id)).map(id => `<option value="${esc(id)}">${esc(cand(id))}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>`;
          }
          if (AF && AF.notPlanned) h += `<p class="muted small-print">${AF.notPlanned} صفًا لطالبات بلا خطة معتمدة: لا يدخل في الحساب.</p>`;
        }
      }
      h += '</section>';
      /* ---- جدول المتابعة ---- */
      const rowsT = plans.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar') || a.week - b.week);
      const afterTxt = p => p.status !== 'approved' ? '<span class="muted">الخطة غير معتمدة</span>' : !af ? '<span class="muted">بانتظار الملف</span>' : p.afterPass == null ? '<span class="muted">' + (AF && AF.pending ? 'بانتظار حسم الأسماء' : 'لا نتيجة في الملف') + '</span>' : p.afterPass ? '<span class="pill ok">تحققت</span>' : '<span class="pill low">لم تتحقق</span>';
      h += `<section class="panel card rm"><div class="row"><h2 class="grow" style="margin:0">جدول المتابعة</h2><button class="btn gold small" data-rm="csv">${I.download} تنزيل الجدول (CSV)</button><button class="btn gold small" data-rm="rec">سجّلي النتائج في سجل الوكيل</button></div>
        <div class="t-scroll" style="max-height:480px"><table class="t-table"><thead><tr><th>اسم الطالبة</th><th>درجة إتقانها داخل اللعبة</th><th>درجة إتقانها في الاختبار البعدي</th><th>الخطة المعتمدة</th><th>درجة إتقانها بعد الخطة</th></tr></thead><tbody>
        ${rowsT.map(p => `<tr><td>${esc(p.name)}<br><small class="muted">${esc(p.outcome.slice(0, 60))}</small></td><td class="num">${esc(gameTxt(p.game))}</td><td><span class="pill low">لم تتحقق</span></td>
          <td><span class="pill ${STAT[p.status][1]}">${STAT[p.status][0]}</span> <small class="muted">${p.steps.length} خطوات · ${esc(bookTxt(p))}</small></td><td>${afterTxt(p)}</td></tr>`).join('')}</tbody></table></div>`;
      const S = summarize(approved.map(p => ({ qid: p.qid, outcome: p.outcome, afterPass: p.afterPass })), { target: (set && set.target) || 90, reworded: !!(af && af.reworded) });
      h += `<h3 style="margin:10px 0 4px">ملخص التحسّن</h3><div class="kpis num"><div class="panel kpi"><b>${S.total.n ? S.total.ok + ' من ' + S.total.n : '—'}</b><small>تحققن بعد الخطة من اللواتي أخفقن في البعدي</small></div><div class="panel kpi"><b>${S.total.rate == null ? '—' : '+' + S.total.rate + ' نقطة'}</b><small>تحسّن نسبة التحقق عن أساس 0٪ في البعدي (بحكم اختيار المخفقات فقط)</small></div></div>`;
      if (S.byQ.length) h += `<div class="t-scroll"><table class="t-table"><thead><tr><th>الناتج</th><th>ن</th><th>تحققن</th><th>النسبة</th><th>التوصيات</th></tr></thead><tbody>${S.byQ.map(o => `<tr><td>${esc(o.outcome)}</td><td class="num">${o.n}</td><td class="num">${o.ok}</td><td class="num">${o.rate == null ? '—' : o.rate + '٪'}</td><td><ul style="margin:0;padding-inline-start:16px">${o.recs.map(r => `<li>${esc(r)}</li>`).join('')}</ul></td></tr>`).join('')}</tbody></table></div>`;
      h += `<h3 style="margin:10px 0 4px">التوصيات</h3><ul>${S.recs.map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>`;
    }
    h += `<section class="panel card rm"><div class="row"><button class="btn ghost small" data-rm="wipe">مسح بيانات هذا الوكيل (الخطط والذاكرة)</button></div></section>`;
    body.innerHTML = h;
    bind(body, ctx, plans, A, AF);
  }
  const this_edit = {};

  function bind(body, ctx, plans, A, AF) {
    const { esc, msg, render, I } = ctx, d = load(), Q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const pk = el => { const r = el.closest('[data-pk]'); return r ? r.dataset.pk : null; };
    const save$ = async (name, text, type) => { await MDQ.saveFile(name, new Blob([text], { type })); };
    body.onclick = async e => {
      const b = e.target.closest('[data-rm]'); if (!b) return; const a = b.dataset.rm, k = pk(b);
      try {
        if (a === 'ok') { const r = approve(k); msg(r.msg); render(); return; }
        if (a === 'edit') { this_edit[k] = true; render(); return; }
        if (a === 'canceledit') { delete this_edit[k]; render(); return; }
        if (a === 'delstep') { const li = b.closest('li'); li.remove(); return; }
        if (a === 'savestep') { const root = b.closest('[data-pk]'), tx = [...root.querySelectorAll('[data-rms]')], steps = tx.map(t => ({ t: t.value, min: root.querySelector('[data-rmm="' + t.dataset.rms + '"]').value })); if (!steps.some(s => s.t.trim())) { msg('اتركي خطوة واحدة على الأقل.'); return; } setSteps(k, steps); delete this_edit[k]; render(); return; }
        if (a === 'reopen') { reopen(k); msg('أُعيد فتح الخطة للتعديل.'); render(); return; }
        if (a === 'del') { remove(k); render(); return; }
        if (a === 'wipe') { if (confirm('مسح كل الخطط وذاكرة الوكيل؟ لا يمكن التراجع.')) { wipe(); Object.keys(this_edit).forEach(x => delete this_edit[x]); render(); } return; }
        if (a === 'load') {
          const f = (body.querySelector('#rmFile') || {}).files; if (!f || !f[0]) { msg('اختاري ملف Excel أو CSV.'); return; }
          ingestAfter(await P().readFile(f[0]), f[0].name); render(); return;
        }
        if (a === 'delafter') { d.after = null; plans.forEach(p => { p.afterPass = null; }); save(); render(); return; }
        if (a === 'rec') { const S = summarize(plans.filter(p => p.status === 'approved').map(p => ({ qid: p.qid, outcome: p.outcome, afterPass: p.afterPass })), {}); S.byQ.forEach(o => log('نتيجة ما بعد المعالجة: ' + o.qid, 'ن=' + o.n + ' · تحققن ' + o.ok + ' · ' + (o.rate == null ? '—' : o.rate + '٪'))); msg('سُجّلت نتائج ' + S.byQ.length + ' ناتجًا في سجل الوكيل.'); return; }
        if (a === 'tpl') {
          const ap = plans.filter(p => p.status === 'approved'); if (!ap.length) { msg('اعتمدي خطة واحدة على الأقل أولًا.'); return; }
          const qids = [...new Set(ap.map(p => p.qid))], ids = [...new Set(ap.map(p => p.studentId))];
          const rows = [['الطالبة', 'الفصل'].concat(qids.map(q => q + ' · ' + ((rowOf(q) || {}).outcome || '').slice(0, 45)))].concat(ids.map(id => { const pr = d.profiles[id] || {}; return [pr.name, pr.cls].concat(qids.map(() => '')); }));
          await save$('قالب_ما_بعد_المعالجة.csv', '﻿' + rows.map(r => r.map(Q).join(',')).join('\r\n'), 'text/csv;charset=utf-8'); return;
        }
        if (a === 'csv') {
          const head = ['الطالبة', 'الفصل', 'الناتج', 'الأسبوع', 'إتقان اللعبة', 'إتقان البعدي', 'حالة الخطة', 'الخطة', 'الموضع في الكتاب', 'بعد الخطة'];
          const rs = plans.map(p => [p.name, p.cls, p.outcome, p.week, gameTxt(p.game), 'لم تتحقق', STAT[p.status][0], p.steps.map(s => s.t + ' (' + s.min + ' د)').join(' | '), bookTxt(p), p.status !== 'approved' ? 'الخطة غير معتمدة' : p.afterPass == null ? 'بانتظار الملف' : p.afterPass ? 'تحققت' : 'لم تتحقق']);
          await save$('جدول_متابعة_الخطط_العلاجية.csv', '﻿' + [head].concat(rs).map(r => r.map(Q).join(',')).join('\r\n'), 'text/csv;charset=utf-8'); return;
        }
        if (a === 'cards') {
          const ap = plans.filter(p => p.status === 'approved'); if (!ap.length) { msg('اعتمدي خطة واحدة على الأقل.'); return; }
          const by = {}; ap.forEach(p => (by[p.studentId] = by[p.studentId] || []).push(p));
          const html = Object.keys(by).map(id => { const pr = d.profiles[id] || {}; return '<div style="page-break-after:always"><h2>خطة علاجية — ' + esc(pr.name) + ' <small>(' + esc(pr.cls) + ')</small></h2>' + by[id].sort(wkOrder).map(p => '<h3>الأسبوع ' + p.week + ': ' + esc(p.outcome) + '</h3><p><i>' + esc(p.diagnosis) + '</i></p><ol>' + p.steps.map(s => '<li>' + esc(s.t) + ' (' + s.min + ' د) ☐</li>').join('') + '</ol><p>الموضع: ' + esc(bookTxt(p)) + '</p>').join('') + '</div>'; }).join('');
          await save$('بطاقات_الخطط_العلاجية.doc', '﻿<html dir="rtl"><head><meta charset="utf-8"></head><body style="font-family:Times New Roman;font-size:13pt">' + html + '</body></html>', 'application/msword'); log('طُبعت بطاقات الخطط', ap.length + ' خطة'); return;
        }
      } catch (err) { msg(err && err.message ? err.message : 'تعذّر تنفيذ الأمر.'); }
    };
    const af = d.after;
    const on = (sel, fn) => { const el = body.querySelector(sel); if (el) el.onchange = fn; };
    on('#rmMode', e => { af.mode = e.target.value; save(); render(); }); on('#rmMax', e => { af.max = Math.max(1, +e.target.value || 1); save(); render(); });
    on('#rmPass', e => { af.pass = Math.max(1, Math.min(100, +e.target.value || 100)); save(); render(); }); on('#rmRe', e => { af.reworded = e.target.checked; save(); render(); });
    body.querySelectorAll('[data-rmcol]').forEach(s => s.onchange = () => { if (s.value) af.colMap[s.dataset.rmcol] = s.value; else delete af.colMap[s.dataset.rmcol]; save(); render(); });
    body.querySelectorAll('[data-rmdec]').forEach(s => s.onchange = () => { if (!s.value) return; af.decisions[s.closest('tr').dataset.rmk] = s.value; save(); log('قرار مطابقة اسم في ملف ما بعد المعالجة', s.value === 'x' ? 'استبعاد' : 'إقرار'); render(); });
  }

  /** زر وكيل الأهداف: يُستدعى من goals-view */
  function sendFromGoals(A, qid, ids) { return send(A, qid, ids); }

  MDQ.remedial = { topFailing, VERSION, KEY, MAXOPEN, load, save, wipe, reset, send, sendFromGoals, buildPlan, designSteps, diagnose, prioritize, gameOf, setSteps, approve, reopen, remove, ingestAfter, computeAfter, summarize, view, kindOf };
})();
