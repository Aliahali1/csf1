/* ============================================================
   وكيل الأهداف (للمعلمة فقط) — دورة: هدف تحدّدينه ← تشخيص ← خطة ← مراجعة وتعديل.
   - استقلالية 1: يقترح ويسأل ولا ينفّذ شيئًا. لا يرسل شيئًا للطالبات ولا لأي خدمة خارجية.
   - محرّك القرار قواعد ثابتة معلنة (ليس نموذجًا لغويًا). العتبات إرشادية غير مُعايَرة إحصائيًا.
   - لا يعدّل الأسئلة ولا الدروس ولا بيانات الطالبات. الخطط مبنية على محتوى الدروس القائم فقط.
   - كل مادة دعم مسودة حتى تعتمدها المعلمة بعد قائمة تحقق بشرية.
   - يُخزَّن كل شيء في متصفح المعلمة فقط (الأهداف، السجل، المواد).
   ============================================================ */
(function () {
  const GK = 'mdq.agent.goals.v1', LK = 'mdq.agent.goallog.v1', MK = 'mdq.agent.materials.v1';
  const VERSION = '1.1.0';
  const B = () => MDQ.bank;
  const bool = v => v === true || v === 1 || v === '1' || (typeof v === 'string' && v.trim().toLowerCase() === 'true');
  const pctOf = (a, b) => b ? Math.round(a / b * 100) : null;
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const uid = () => 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  /** توحيد أسماء الفصول: «٣/٣» و«3/3» و«3\3» تصبح «3/3» */
  const WORDS = { 'ثالث': '3', 'الثالث': '3', 'واحد': '1', 'اول': '1', 'أول': '1', 'اثنين': '2', 'اثنان': '2', 'ثاني': '2', 'ثلاثة': '3', 'اربعة': '4', 'أربعة': '4', 'رابع': '4', 'خمسة': '5', 'ستة': '6' };
  const normCls = c => {
    let t = String(c || '').replace(/[\u200e\u200f\u202a-\u202e]/g, '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/(الفصل|الصف|فصل|شعبة)/g, ' ')
      .replace(/[\p{L}]+/gu, w => WORDS[w] || w).replace(/[\\\-.\/\s]+/g, '/').replace(/^\/+|\/+$/g, '');
    if (/^3\d$/.test(t)) t = '3/' + t[1];
    return t || '—';
  };
  const reverseCls = c => /^3\/\d$/.test(c) ? c[2] + '/3' : '';
  const normName = n => String(n || '').replace(/\s+/g, ' ').trim();

  const CAUSES = {
    concept: 'ضعف في فهم المفهوم',
    wording: 'صياغة السؤال (غموض أو صعوبة لغوية)',
    hint: 'حاجة إلى تلميح أو تغذية راجعة سريعة',
    random: 'نقر عشوائي أو إجابة متسرعة',
    group: 'عمل مجموعة (إجابات غير فردية)'
  };
  const MIN_N = 8;

  /* ---------- الطالبات ضمن نطاق الهدف (مع حل التكرار حسب إجابات المعلمة) ---------- */
  function scope(model, cls, answers) {
    const rev = (answers || {}).clsmerge === 'yes' ? reverseCls(cls) : '';
    let list = model.students.filter(s => !cls || normCls(s.className) === cls || (rev && normCls(s.className) === rev));
    const byName = {};
    list.forEach(s => { const k = normName(s.name); if (k) (byName[k] = byName[k] || []).push(s); });
    const unresolved = [];
    Object.entries(byName).forEach(([name, arr]) => {
      if (arr.length < 2) return;
      const a = (answers || {})['dupes:' + name];
      if (a === 'same') { const keep = arr.slice().sort((x, y) => (y.attempts || 0) - (x.attempts || 0))[0]; list = list.filter(s => !arr.includes(s) || s === keep); }
      else if (a !== 'different') unresolved.push({ name, count: arr.length });
    });
    return { students: list, unresolved };
  }

  /** معطيات سؤال واحد لمجموعة طالبات */
  function qStats(students, qid) {
    const out = [];
    students.forEach(s => {
      const q = s.q && s.q.get(qid);
      if (!q || !q.attempts.length) return;
      const at = q.attempts.slice().sort((a, b) => String(a.clientTime).localeCompare(String(b.clientTime)));
      const i = at.findIndex(a => bool(a.isCorrect));
      out.push({ s, at, tries: i < 0 ? Infinity : i + 1 });
    });
    return out;
  }
  const share = (arr, f) => arr.length ? arr.filter(f).length / arr.length : 0;
  const P = x => Math.round(x * 100);

  /** معدل الإجابات الخاطئة السريعة في كل البيانات (خط الأساس للنقر العشوائي) */
  function globalFastWrong(model) {
    const w = model.attemptRows.filter(a => !a.isCorrect && a.durationSec > 0);
    return w.length ? share(w, a => a.durationSec < 2) : 0.08;
  }

  /* ---------- التشخيص ---------- */
  function diagnose(model, goal) {
    const sc = scope(model, goal.cls, goal.answers);
    const def = B().question(goal.qid);
    const st = qStats(sc.students, goal.qid);
    const n = st.length;
    const res = { n, p: [null, null, null], causes: [], clarify: [], note: '', scopeCount: sc.students.length };
    if (!def) { res.note = 'السؤال غير موجود في بنك الأسئلة.'; return res; }
    const ok = k => st.filter(x => x.tries <= k).length;
    res.p = [1, 2, 3].map(k => n ? ok(k) / n : null);
    const [p1, p2, p3] = res.p;

    // ---- أسئلة توضيحية (يتوقف الوكيل ولا يفترض) ----
    const ans = goal.answers || {};
    sc.unresolved.forEach(u => res.clarify.push({ id: 'dupes:' + u.name, blocking: true,
      text: `يوجد ${u.count} سجلات بالاسم «${u.name}» في هذا النطاق برموز مختلفة. هل هي طالبة واحدة سجّلت أكثر من مرة؟`,
      options: [{ k: 'same', label: 'طالبة واحدة (احسبيها مرة واحدة)' }, { k: 'different', label: 'طالبات مختلفات' }] }));
    const rv = reverseCls(goal.cls || '');
    if (rv && ans.clsmerge == null && model.students.some(s => normCls(s.className) === rv)) res.clarify.push({ id: 'clsmerge', blocking: false,
      text: `يوجد طالبات مسجّلات في فصل «${rv}»، وقد يقصدن «${goal.cls}» (ترتيب الرقمين معكوس). هل أدمجهن في هذا الهدف؟`,
      options: [{ k: 'yes', label: `نعم، ادمجي «${rv}» مع «${goal.cls}»` }, { k: 'no', label: 'لا، فصل مختلف' }] });
    if (n < MIN_N) res.clarify.push({ id: 'small', blocking: true,
      text: `عدد الطالبات اللاتي حاولن هذا السؤال في النطاق ${n} فقط (أقل من ${MIN_N})، فالتشخيص هنا ضعيف الدلالة. هل أتابع بتحليل تمهيدي؟`,
      options: [{ k: 'go', label: 'تابعي كتحليل تمهيدي' }, { k: 'stop', label: 'أوقفي حتى تتوفر بيانات أكثر' }] });
    if (!n) { res.note = 'لا توجد محاولات على هذا السؤال في النطاق المحدد.'; return res; }
    if (ans.small === 'stop') { res.note = 'أوقفتِ التحليل لقلة البيانات.'; return res; }

    // ---- معطيات مساعدة ----
    const opts = def.options.length;
    const firstWrong = st.filter(x => !bool(x.at[0].isCorrect));
    const dist = {}; firstWrong.forEach(x => { const k = x.at[0].choice; dist[k] = (dist[k] || 0) + 1; });
    const domShare = firstWrong.length ? Math.max(...Object.values(dist)) / firstWrong.length : 0;
    // بقية أسئلة المفهوم نفسه
    const sibs = B().QUESTIONS.filter(q => q.id !== goal.qid && q.lesson === def.lesson && q.concept === def.concept && q.source === 'file');
    let sib = 0, sibOk = 0;
    sibs.forEach(q => qStats(sc.students, q.id).forEach(x => { sib++; if (x.tries <= 1) sibOk++; }));
    const pSib = sib >= MIN_N ? sibOk / sib : null;
    // الفئة العليا عامةً
    const scoreOf = s => (MDQ.agent && MDQ.agent.score) ? MDQ.agent.score(s) : null;
    const topIds = new Set(model.students.filter(s => (scoreOf(s) || 0) >= 85).map(s => s.studentId));
    const top = st.filter(x => topIds.has(x.s.studentId));
    const pTop = top.length >= 5 ? share(top, x => x.tries <= 1) : null;
    // السرعة
    const wrongAt = st.flatMap(x => x.at.filter(a => !bool(a.isCorrect)));
    const fastW = wrongAt.filter(a => +a.durationSec > 0).length >= 8 ? share(wrongAt.filter(a => +a.durationSec > 0), a => +a.durationSec < 2) : null;
    const gFast = globalFastWrong(model);
    // التزامن (عمل مجموعة): إجابة أولى متطابقة لطالبتين مختلفتين خلال 120 ثانية في الفصل نفسه
    const firsts = st.map(x => ({ id: x.s.studentId, cls: normCls(x.s.className), t: Date.parse(x.at[0].clientTime) || 0, c: x.at[0].choice })).sort((a, b) => a.t - b.t);
    const sync = new Set();
    for (let i = 0; i < firsts.length; i++) for (let j = i + 1; j < firsts.length && firsts[j].t - firsts[i].t <= 120000; j++)
      if (firsts[i].cls === firsts[j].cls && firsts[i].id !== firsts[j].id && firsts[i].c === firsts[j].c) { sync.add(firsts[i].id); sync.add(firsts[j].id); }
    const syncShare = n ? sync.size / n : 0;

    if (p1 >= 0.8) { res.note = `${P(p1)}٪ تحققن من الأولى؛ لا إخفاق واسع يستدعي تدخلًا لهذا الناتج في هذا النطاق.`; }
    // ---- قواعد الأسباب (كل قاعدة تحقّقت = دليل) ----
    const add = (key, hits, ev) => { if (hits > 0) res.causes.push({ key, label: CAUSES[key], hits, ev }); };
    const H = () => ({ h: 0, e: [] }); const hit = (o, c, t) => { if (c) { o.h++; o.e.push(t); } };
    if (p1 < 0.8) {
      let o = H();
      hit(o, p1 < 0.6, `${P(p1)}٪ فقط أصبن من أول محاولة`);
      hit(o, pSib != null && pSib < 0.65, `بقية أسئلة المفهوم نفسه ضعيفة أيضًا (${pSib == null ? '' : P(pSib)}٪)`);
      hit(o, opts >= 3 && firstWrong.length >= 5 && domShare >= 0.6, `${P(domShare)}٪ من الخاطئات اخترن الخيار نفسه (فهم خاطئ شائع)`);
      hit(o, p3 < 0.9, `${P(p3)}٪ فقط تحققن حتى الثالثة (الإخفاق يستمر مع التلميح)`);
      add('concept', o.h, o.e);
      o = H();
      hit(o, pTop != null && pTop < 0.5, `حتى الطالبات المتميزات أخطأن فيه (${P(pTop || 0)}٪ من الأولى)`);
      hit(o, pSib != null && pSib >= 0.75 && p1 < 0.6, `بقية أسئلة المفهوم نفسه جيدة (${pSib == null ? '' : P(pSib)}٪) بينما هذا السؤال ضعيف`);
      hit(o, opts >= 3 && firstWrong.length >= 6 && domShare <= 0.45, 'الإجابات الخاطئة موزعة على الخيارات (لا فهم خاطئ واحد)');
      add('wording', o.h, o.e);
      o = H();
      const rec = p1 < 1 ? (p2 - p1) / (1 - p1) : 0;
      hit(o, p1 < 0.75 && rec >= 0.6, `${P(rec)}٪ ممن أخطأن في الأولى أصبن بعد التلميح`);
      hit(o, p3 >= 0.9, `${P(p3)}٪ تحققن حتى الثالثة`);
      add('hint', o.h, o.e);
      o = H();
      hit(o, fastW != null && fastW >= Math.min(0.8, Math.max(0.25, 2 * gFast)), `${P(fastW || 0)}٪ من الإجابات الخاطئة أقل من ثانيتين (المعدل العام ${P(gFast)}٪)`);
      add('random', o.h, o.e);
      o = H();
      hit(o, sync.size >= 3 && syncShare >= 0.3, `${sync.size} طالبات أجبن إجابة أولى متطابقة مع زميلة خلال دقيقتين`);
      hit(o, sync.size >= 3 && syncShare >= 0.5, 'نسبة التزامن مرتفعة');
      add('group', o.h, o.e);
    }
    // ---- أثر إجابات المعلمة ----
    if (ans.devices === 'no') res.causes = res.causes.filter(c => c.key !== 'group');
    if (ans.devices === 'yes' && p1 < 0.8) {
      const g = res.causes.find(c => c.key === 'group');
      if (g) { g.hits++; g.ev.push('أفدتِ أن الطالبات يعملن بجهاز مشترك'); } else res.causes.push({ key: 'group', label: CAUSES.group, hits: 1, ev: ['أفدتِ أن الطالبات يعملن بجهاز مشترك (لا مؤشر زمني مباشر)'] });
    }
    if (ans.tie) { const t = res.causes.find(c => c.key === ans.tie); if (t) { t.hits += 2; t.ev.push('اخترتِ هذا الاحتمال'); } }
    res.causes.sort((a, b) => b.hits - a.hits);
    res.causes.forEach(c => c.strength = c.hits >= 3 ? 'قوي' : c.hits === 2 ? 'متوسط' : 'ضعيف');
    // ---- تعادل بين أقوى احتمالين ----
    if (!ans.tie && res.causes.length > 1 && res.causes[0].hits === res.causes[1].hits)
      res.clarify.push({ id: 'tie', blocking: true, text: 'احتمالان متساويان في قوة الدليل. أيّهما أقرب لما تلاحظينه في الفصل؟',
        options: [res.causes[0], res.causes[1]].map(c => ({ k: c.key, label: c.label })) });
    if (ans.devices == null && (p1 < 0.8)) res.clarify.push({ id: 'devices', blocking: false,
      text: 'هل تعمل طالبات هذا الفصل بجهاز واحد لكل مجموعة؟ (لا يمكنني كشف ذلك من البيانات، وهو يغيّر تفسير الإجابات الفردية)',
      options: [{ k: 'yes', label: 'نعم' }, { k: 'no', label: 'لا، لكل طالبة جهاز' }, { k: 'mixed', label: 'مختلط' }] });
    res.failing = st.filter(x => x.tries > (goal.metric === 'first' ? 1 : 3)).map(x => ({ id: x.s.studentId, name: x.s.name }));
    return res;
  }

  /* ---------- الخطة: خطوات من محتوى الدروس القائم فقط ---------- */
  function planStep(goal, diag) {
    const def = B().question(goal.qid); if (!def) return null;
    const L = B().lesson(def.lesson), tried = new Set((goal.cycles || []).filter(c => c.verdict === 'no').map(c => c.cause));
    const cause = diag.causes.find(c => !tried.has(c.key));
    if (!cause) return { exhausted: true, tried: [...tried] };
    const rem = (MDQ.analytics.REMEDY || {})[def.concept] || '';
    const file = L && L.pdfs && L.pdfs[0] ? L.pdfs[0].title : 'ملف الدرس';
    const A = {
      concept: [`اعرضي مفهوم «${def.concept}» من ${file} على الشاشة، واطلبي من كل مجموعة صياغته بكلماتها.`,
        `اقرئي مع الطالبات شرح الدرس: «${def.teach}»`, rem ? `نشاط علاجي من الدرس: ${rem}` : '', 'أعيدي السؤال نفسه بعد النشاط وراجعي النتيجة هنا.'],
      wording: [`راجعي صياغة السؤال قبل الحكم على الطالبات: «${def.text}»`, 'اقرئيه بصوت عالٍ مع الطالبات واسأليهن ماذا يطلب بكلماتهن (ميزة «اقرئي لي» متاحة).',
        `إن اتضح غموضه فصحّحيه في ملف الأسئلة من عندكِ؛ الأداة لا تعدّل الأسئلة. (التصويب الحالي في بنك الأسئلة: ${def.why || 'لا يوجد'})`, 'أعيدي الاستيراد بعد التعديل وقارني النسبة.'],
      hint: [`ذكّري الطالبات بالتلميح الأول: «${def.hint1}»`, `ثم الثاني عند الحاجة: «${def.hint2}»`, 'اطلبي من الطالبة أن تشرح لماذا غيّرت إجابتها بعد التلميح.', 'فعّلي مراجعة قصيرة للتلميحات قبل المحاولة التالية.'],
      random: ['ذكّري الفصل بقاعدة: اقرئي الخيارات كلها قبل الاختيار (يمكن تفعيل «اقرئي لي»).', 'اطلبي من المجموعة تبرير الاختيار شفهيًا قبل الضغط.',
        `اعرضي السؤال على الشاشة مع شرح الإجابة الصحيحة: «${def.why || def.teach}»`, 'راقبي الزمن عند إعادة المحاولة.'],
      group: ['نفّذي إعادة المحاولة بجهاز لكل طالبة أو بأدوار (قارئة، كاتبة، مراجعة) مسجّلة بأسمائها.', 'لا تحكمي على الطالبة الفردية من هذه الإجابات قبل إعادة المحاولة الفردية.',
        'قارني نتيجة الإعادة الفردية بالأولى.']
    };
    return { cause: cause.key, label: cause.label, strength: cause.strength, evidence: cause.ev, actions: A[cause.key].filter(Boolean),
      source: { concept: def.concept, file, qid: def.id } };
  }

  /* ---------- التقييم والمراجعة ---------- */
  function evaluate(goal, model) {
    const sc = scope(model, goal.cls, goal.answers), st = qStats(sc.students, goal.qid), k = goal.metric === 'first' ? 1 : 3;
    const n = st.length, cur = n ? pctOf(st.filter(x => x.tries <= k).length, n) : null;
    const since = Date.parse(goal.createdAt) || 0;
    const fresh = st.filter(x => (Date.parse(x.at[0].clientTime) || 0) > since);
    const newPct = fresh.length ? pctOf(fresh.filter(x => x.tries <= k).length, fresh.length) : null;
    let status = 'بانتظار بيانات بعد التدخل';
    if (n < MIN_N) status = 'بيانات قليلة';
    else if (cur >= goal.target) status = 'تحقق الهدف';
    else if (goal.metric === 'by3' ? cur >= goal.baseline.pct + 5 : (newPct != null && fresh.length >= 5 && newPct >= goal.baseline.pct + 5)) status = 'تحسّن';
    else if (goal.metric === 'by3' ? cur != null : (newPct != null && fresh.length >= 5)) status = 'لم يتحسن';
    return { n, cur, newN: fresh.length, newPct, status };
  }
  const log = (goalId, event, detail) => { const a = rd(LK, []); a.push({ at: new Date().toISOString(), goalId, event, detail: detail || '', v: VERSION }); wr(LK, a.slice(-1000)); };
  function create(model, o) {
    const goal = { id: uid(), createdAt: new Date().toISOString(), qid: o.qid, outcome: o.outcome, cls: o.cls || '', metric: o.metric, target: +o.target, due: o.due || '', note: o.note || '',
      answers: {}, cycles: [], paused: false, v: VERSION };
    const ev = evaluate(Object.assign({}, goal, { baseline: { pct: 0 } }), model);
    goal.baseline = { pct: ev.cur == null ? 0 : ev.cur, n: ev.n };
    const gs = rd(GK, []); gs.push(goal); wr(GK, gs);
    log(goal.id, 'أُنشئ الهدف', `${o.outcome} · ${goal.cls || 'كل الفصول'} · ${goal.metric === 'first' ? 'الأولى' : 'حتى الثالثة'} ← ${goal.target}٪ (الأساس ${goal.baseline.pct}٪، ن=${goal.baseline.n})`);
    return goal;
  }
  function update(goal) { const gs = rd(GK, []).map(g => g.id === goal.id ? goal : g); wr(GK, gs); }
  function answer(goal, id, k, label) { goal.answers = goal.answers || {}; goal.answers[id] = k; update(goal); log(goal.id, 'أجابت المعلمة', `${id} = ${label || k}`); }
  /** مراجعة بعد استيراد بيانات جديدة: يقيّم الأثر ويعدّل المسار */
  function review(goal, model, executed) {
    const diag = diagnose(model, goal), step = planStep(goal, diag), ev = evaluate(goal, model);
    const last = (goal.cycles || []).slice(-1)[0], before = last ? last.after : goal.baseline.pct;
    const cause = step && step.cause ? step.cause : (last ? last.cause : '');
    let verdict = ev.cur != null && ev.cur >= goal.target ? 'done' : (ev.cur != null && before != null && ev.cur >= before + 5 ? 'improved' : 'no');
    goal.cycles = goal.cycles || []; goal.cycles.push({ at: new Date().toISOString(), cause, before, after: ev.cur, n: ev.n, verdict, executed: !!executed });
    update(goal);
    log(goal.id, 'مراجعة', `${before}٪ ← ${ev.cur}٪ (ن=${ev.n}) · الحكم: ${{ done: 'تحقق الهدف', improved: 'تحسّن فيُستمر', no: 'لم يتحسن فيُجرَّب سبب آخر' }[verdict]}`);
    return verdict;
  }

  /* ---------- مواد الدعم (مسودات تعتمدها المعلمة) ---------- */
  function cardDraft(goal, step) {
    const def = B().question(goal.qid), L = B().lesson(def.lesson);
    return [`بطاقة نشاط علاجي — ${L.lesson}`, `ناتج التعلم: ${goal.outcome}`, `المفهوم: ${def.concept}`, `السبب المرجّح: ${step.label}`, '',
      'الخطوات:', ...step.actions.map((a, i) => `${i + 1}. ${a}`), '',
      `سؤال التحقق (من بنك الأسئلة): ${def.text}`, ...def.options.map(o => `   - ${o.text}`), '',
      '(مسودة آلية من محتوى الدروس القائم؛ لا تُستخدم قبل اعتمادكِ.)'].join('\n');
  }
  function promptPack(goal, step) {
    const def = B().question(goal.qid), L = B().lesson(def.lesson);
    return `أنتِ مساعد لمعلمة مهارات رقمية للصف الثالث المتوسط. اكتبي بالعربية الفصحى المبسّطة.
المهمة: أعدّي بطاقة نشاط علاجي قصيرة (5 دقائق) و3 أسئلة تدريب جديدة تقيس **نفس ناتج التعلم** وبنفس المستوى المعرفي.
قيود صارمة:
- استخدمي **فقط** المعلومات في «النص المصدر» أدناه. لا تضيفي معلومة أو مثالًا من خارجه. إن لم يكفِ النص فقولي ذلك صراحة.
- لا تذكري أسماء طالبات ولا بيانات شخصية.
- لكل سؤال: 4 خيارات (أو صواب/خطأ)، الإجابة الصحيحة، وتلميحان متدرجان، وسطر يشرح الصواب من النص المصدر.
- اذكري في النهاية أيّ جملة لم تستندي فيها مباشرة إلى النص المصدر.
المستوى: ${def.level || 'غير محدد'}
الدرس: ${L.lesson}
ناتج التعلم: ${goal.outcome}
المفهوم: ${def.concept}
السبب المرجّح للتعثر: ${step.label}
النص المصدر:
- السؤال الحالي: ${def.text}
- الخيارات: ${def.options.map(o => o.text).join(' | ')}
- الإجابة الصحيحة: ${B().optionText(def, def.answer)}
- شرح الدرس: ${def.teach}
- التلميح 1: ${def.hint1}
- التلميح 2: ${def.hint2}
- التفسير: ${def.why || ''}`;
  }
  const mats = () => rd(MK, []);
  function saveMaterial(m) { const a = mats(); const i = a.findIndex(x => x.id === m.id); if (i >= 0) a[i] = m; else a.push(m); wr(MK, a); }
  function addMaterial(goalId, kind, text) { const m = { id: uid(), goalId, kind, text, status: 'مسودة', createdAt: new Date().toISOString() }; saveMaterial(m); log(goalId, 'مسودة مادة', kind); return m; }
  function approveMaterial(m, checks) {
    if (!checks || checks.length !== 3 || !checks.every(Boolean)) return false;
    m.status = 'معتمدة'; m.approvedAt = new Date().toISOString(); saveMaterial(m); log(m.goalId, 'اعتُمدت مادة', m.kind); return true;
  }
  function removeGoal(id) { wr(GK, rd(GK, []).filter(g => g.id !== id)); wr(MK, mats().filter(m => m.goalId !== id)); log(id, 'حُذف الهدف', ''); }

  MDQ.goals = { VERSION, CAUSES, normCls, scope, diagnose, planStep, evaluate, create, update, answer, review, cardDraft, promptPack,
    list: () => rd(GK, []), log: () => rd(LK, []), logEvent: log, mats, addMaterial, approveMaterial, saveMaterial, removeGoal,
    classes: model => [...new Set(model.students.map(s => normCls(s.className)))].sort() };
})();
