/* ============================================================
   اتساق التشخيص بين اللعبة والاختبار البعدي (وكيل الأهداف — للمعلمة فقط)
   السؤال: هل يتفق ما تُظهره اللعبة عن تحقق الناتج مع ما يُظهره الاختبار البعدي؟
   - وحدة التحليل: الطالبة (زوج: طالبة × ناتج). المقارنة لنفس الطالبات المطابقة أسماؤهن فقط.
   - قياس اللعبة للاتساق = «آخر ما وصلت إليه الطالبة» (أصابت في أي محاولة)، أو «حتى الثالثة» بقرار المعلمة.
     المحاولة الأولى تُستخدم لقياس التحسّن (جدول الانتقال) لا لقياس الاتساق، لأنها تسبق التعلّم.
   - العتبات (فرق الاتفاق، حد الإتقان، أقل عدد أزواج) تُعلَن وتُعتمد قبل ظهور النتائج؛ وأي تعديل بعدها يُسجَّل ويُعلَّم.
   - الأسئلة في المهمتين مختلفة (أو معادة الصياغة): الاتساق هنا مؤشر لا يُثبت صدق اللعبة، وقد يعود الفرق لصعوبة الأسئلة.
   - كل شيء يُحسب داخل المتصفح؛ لا يُرسل شيء لأي جهة. لا يغيّر بيانات الطالبات ولا الأسئلة.
   ============================================================ */
(function () {
  window.MDQ = window.MDQ || {};
  const CK = 'mdq.agent.consist.v1', VERSION = '1.0.0';
  const DEFAULTS = { tol: 10, mastery: 80, minPairs: 8, minOutcomes: 5, site: 'best', k: 8, B: 1000 };
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const log = (ev, d) => { try { if (MDQ.goals) MDQ.goals.logEvent('consistency', ev, d || ''); } catch (e) {} };
  const pc = (a, b) => b ? a / b * 100 : null;
  const r1 = x => x == null || !isFinite(x) ? null : Math.round(x * 10) / 10;
  const r2 = x => x == null || !isFinite(x) ? null : Math.round(x * 100) / 100;

  /* ---------- الإعلان المسبق للعتبات ---------- */
  const getCfg = () => rd(CK, null);
  const putCfg = c => wr(CK, c);
  const clean = o => {
    const c = Object.assign({}, DEFAULTS, o || {});
    c.tol = Math.max(1, Math.min(50, +c.tol || DEFAULTS.tol)); c.mastery = Math.max(1, Math.min(100, +c.mastery || DEFAULTS.mastery));
    c.minPairs = Math.max(3, Math.min(60, Math.round(+c.minPairs || DEFAULTS.minPairs))); c.minOutcomes = Math.max(3, Math.round(+c.minOutcomes || DEFAULTS.minOutcomes));
    c.k = Math.max(2, Math.min(12, Math.round(+c.k || DEFAULTS.k))); c.site = c.site === 'by3' ? 'by3' : 'best'; c.B = DEFAULTS.B; return c;
  };
  const describe = c => `فرق الاتفاق ≤ ${c.tol} نقاط · حد الإتقان ${c.mastery}٪ · أقل ${c.minPairs} أزواج · قياس اللعبة النهائي: ${c.site === 'by3' ? 'حتى الثالثة' : 'آخر ما وصلت إليه'} · أضعف ${c.k || DEFAULTS.k} نواتج للتداخل`;
  /** يعتمد العتبات قبل رؤية النتائج. forSet = وقت رفع ملف البعدي الذي تخصه. */
  function lock(values, forSet) {
    const c = Object.assign(clean(values), { declaredAt: new Date().toISOString(), forSet: forSet || '', viewedAt: null, changedAfterView: false, history: [] });
    putCfg(c); log('اعتُمدت عتبات الاتساق قبل الحساب', describe(c)); return c;
  }
  /** تعديل بعد الاعتماد: مسموح لكنه يُسجَّل، ويُعلَّم دائمًا إن حدث بعد رؤية النتائج */
  function change(values) {
    const old = getCfg(); if (!old) return null;
    const c = Object.assign({}, old, clean(Object.assign({}, old, values)));
    const after = !!old.viewedAt; c.history = (old.history || []).concat([{ at: new Date().toISOString(), after, from: describe(old), to: describe(c) }]);
    if (after) c.changedAfterView = true; putCfg(c);
    log(after ? 'عُدّلت عتبات الاتساق بعد رؤية النتائج' : 'عُدّلت عتبات الاتساق قبل رؤية النتائج', `${describe(old)} ← ${describe(c)}`); return c;
  }
  const markViewed = c => { if (c && !c.viewedAt) { c.viewedAt = new Date().toISOString(); putCfg(c); } };

  /* ---------- إحصاءات أساسية ---------- */
  function table2(pairs, siteK) { // a: كلاهما أتقن، b: اللعبة نعم/البعدي لا، c: اللعبة لا/البعدي نعم، d: كلاهما لا
    let a = 0, b = 0, c = 0, d = 0;
    pairs.forEach(p => { const s = p[siteK], q = p.post; if (s && q) a++; else if (s && !q) b++; else if (!s && q) c++; else d++; });
    return { a, b, c, d, n: a + b + c + d };
  }
  function kappa(t) {
    const n = t.n; if (!n) return null;
    const po = (t.a + t.d) / n, pe = ((t.a + t.b) * (t.a + t.c) + (t.c + t.d) * (t.b + t.d)) / (n * n);
    return pe >= 1 ? null : (po - pe) / (1 - pe);
  }
  /** ماكنمار الدقيق (ثنائي الطرف) على الأزواج المتخالفة */
  function mcnemar(b, c) {
    const n = b + c; if (!n) return 1; const k = Math.min(b, c);
    const lc = x => { let r = 0; for (let i = 2; i <= x; i++) r += Math.log(i); return r; };
    let p = 0; for (let i = 0; i <= k; i++) p += Math.exp(lc(n) - lc(i) - lc(n - i) - n * Math.log(2));
    return Math.min(1, 2 * p);
  }
  /** فرق نسبتين مزدوجتين (بعدي − لعبة) وفترة الثقة 95٪ (تقريب ولد على الأزواج المتخالفة) */
  function pairedDiff(t) {
    const n = t.n; if (!n) return null; const d = (t.c - t.b) / n;
    const v = Math.max(0, (t.b + t.c) - (t.b - t.c) * (t.b - t.c) / n) / (n * n), se = Math.sqrt(v);
    return { d: d * 100, lo: (d - 1.96 * se) * 100, hi: (d + 1.96 * se) * 100 };
  }
  function ranks(a) {
    const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]), r = new Array(a.length);
    for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = m; i = j + 1; }
    return r;
  }
  function pearson(x, y) {
    const n = x.length; if (n < 3) return null; const mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
    let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }
  const spearman = (x, y) => x.length < 3 ? null : pearson(ranks(x), ranks(y));
  /** معامل التوافق للين: يعاقب الانحياز المنتظم (فروق المتوسط) إضافةً إلى ضعف الارتباط */
  function ccc(x, y) {
    const n = x.length; if (n < 3) return null; const mx = x.reduce((s, v) => s + v, 0) / n, my = y.reduce((s, v) => s + v, 0) / n;
    let sxy = 0, sxx = 0, syy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    sxy /= n; sxx /= n; syy /= n; const den = sxx + syy + (mx - my) ** 2; return den ? 2 * sxy / den : null;
  }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const pctl = (arr, q) => { const s = arr.filter(v => v != null).sort((a, b) => a - b); if (s.length < 20) return null; const i = q * (s.length - 1), lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
  /** بوتستراب على مستوى الطالبة (إجابات الطالبة الواحدة غير مستقلة): بذرة ثابتة لتكرار النتيجة */
  function boot(groups, stat, B) {
    const rnd = rng(20261031), n = groups.length, out = [];
    for (let b = 0; b < B; b++) { const s = []; for (let i = 0; i < n; i++) s.push(groups[Math.floor(rnd() * n)]); out.push(stat(s)); }
    const lo = pctl(out, 0.025), hi = pctl(out, 0.975); return lo == null ? null : { lo, hi };
  }

  /** دلالة تبديل أحادية الطرف لارتباط الرتب (استكشافية؛ بذرة ثابتة) */
  function permP(x, y, B) {
    const obs = spearman(x, y); if (obs == null || x.length < 6) return null;
    const rnd = rng(777), q = y.slice(); let ge = 0;
    for (let b = 0; b < B; b++) { for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = q[i]; q[i] = q[j]; q[j] = t; } const r = spearman(x, q); if (r != null && r >= obs - 1e-12) ge++; }
    return (ge + 1) / (B + 1);
  }
  /** تداخل أضعف k ناتجًا (الأقل قيمة) بين قياسين؛ يُبلَّغ عن التعادل عند الحد */
  function topK(a, b, k) {
    const idx = v => v.map((x, i) => [x, i]).sort((u, w) => u[0] - w[0] || u[1] - w[1]);
    const A = idx(a), Bb = idx(b), sa = new Set(A.slice(0, k).map(z => z[1])), sb = new Set(Bb.slice(0, k).map(z => z[1]));
    const tie = (s) => s.length > k && s[k - 1][0] === s[k][0];
    return { k, overlap: [...sa].filter(i => sb.has(i)).length, tie: tie(A) || tie(Bb) };
  }

  /* ---------- الحساب الكامل ---------- */
  /** rows: صفوف A.rows من MDQ.post.analyze (كل صف فيه per: [{s, base, post, tries}]) */
  function compute(rows, cfg) {
    cfg = clean(cfg); const siteK = 'site';
    const mastered = tries => cfg.site === 'by3' ? tries <= 3 : isFinite(tries);
    const used = [], skipped = [];
    rows.forEach(x => {
      if (!x.counted) { skipped.push({ outcome: x.outcome, why: 'صياغة معادة غير معتمدة' }); return; }
      if (x.n < cfg.minPairs) { skipped.push({ outcome: x.outcome, why: `أزواج قليلة (${x.n})` }); return; }
      used.push(x);
    });
    const outs = used.map(x => {
      const pairs = x.per.map(p => ({ id: p.s.studentId, site: mastered(p.tries), first: p.tries <= 1, post: !!p.post }));
      const t = table2(pairs, siteK), tf = table2(pairs, 'first');
      const ps = pc(t.a + t.b, t.n), pq = pc(t.a + t.c, t.n), pf = pc(tf.a + tf.b, tf.n), dd = pairedDiff(t);
      const k = kappa(t), sat = Math.max(ps, 100 - ps, pq, 100 - pq) >= 95;
      return { qid: x.qid, lesson: x.lesson, outcome: x.outcome, n: t.n, site: ps, first: pf, post: pq, diff: pq - ps, ci: dd, t, tf,
        agreePct: pc(t.a + t.d, t.n), kappa: k, p: mcnemar(t.b, t.c), agree: Math.abs(pq - ps) <= cfg.tol,
        classAgree: (ps >= cfg.mastery) === (pq >= cfg.mastery), siteMet: ps >= cfg.mastery, postMet: pq >= cfg.mastery, saturated: sat, pairs };
    });
    const N = outs.length, res = { cfg, outcomes: outs, skipped, N, version: VERSION };
    if (!N) return res;
    // المستوى الأول: النواتج
    const xs = outs.map(o => o.site), ys = outs.map(o => o.post), dif = outs.map(o => o.diff), md = dif.reduce((s, v) => s + v, 0) / N;
    const sd = N > 1 ? Math.sqrt(dif.reduce((s, v) => s + (v - md) ** 2, 0) / (N - 1)) : 0;
    const cls = { both: outs.filter(o => o.siteMet && o.postMet).length, siteOnly: outs.filter(o => o.siteMet && !o.postMet).length, postOnly: outs.filter(o => !o.siteMet && o.postMet).length, neither: outs.filter(o => !o.siteMet && !o.postMet).length };
    res.level1 = { agreeN: outs.filter(o => o.agree).length, classAgreeN: outs.filter(o => o.classAgree).length, cls, rho: N >= cfg.minOutcomes ? spearman(xs, ys) : null, ccc: N >= cfg.minOutcomes ? ccc(xs, ys) : null,
      meanDiff: md, loa: [md - 1.96 * sd, md + 1.96 * sd], satN: outs.filter(o => o.saturated).length };
    // التشخيص: المحاولة الأولى (فحص) مقابل البعدي (مرجع) — أساس الاتساق لأن أداء اللعبة النهائي مشبَّع عادةً
    const fx = outs.map(o => o.first), m = cfg.mastery, gw = o => o.first < m, pw = o => o.post < m;
    const sc = { tp: outs.filter(o => gw(o) && pw(o)).length, fn: outs.filter(o => !gw(o) && pw(o)).length, fp: outs.filter(o => gw(o) && !pw(o)).length, tn: outs.filter(o => !gw(o) && !pw(o)).length };
    const ratio = (a, b) => a + b ? a / (a + b) * 100 : null, gains = outs.map(o => o.post - o.first);
    const kk = Math.min(cfg.k, Math.floor(N / 2)), les = {};
    outs.forEach(o => { const z = les[o.lesson] = les[o.lesson] || { n: 0, f: 0, q: 0 }; z.n++; z.f += o.first; z.q += o.post; });
    res.screen = { sc, sens: ratio(sc.tp, sc.fn), ppv: ratio(sc.tp, sc.fp), spec: ratio(sc.tn, sc.fp), npv: ratio(sc.tn, sc.fn), weakFirst: sc.tp + sc.fp, weakPost: sc.tp + sc.fn,
      rho: N >= cfg.minOutcomes ? spearman(fx, ys) : null, ccc: N >= cfg.minOutcomes ? ccc(fx, ys) : null, perm: N >= cfg.minOutcomes ? permP(fx, ys, 5000) : null,
      meanGain: gains.reduce((s, v) => s + v, 0) / N, top: kk >= 2 ? topK(fx, ys, kk) : null,
      lessons: Object.keys(les).map(l => ({ lesson: l, n: les[l].n, first: les[l].f / les[l].n, post: les[l].q / les[l].n })) };
    // المستوى الثاني: الأزواج مجمّعة (بوتستراب على الطالبة)
    const byStu = {}; outs.forEach(o => o.pairs.forEach(p => { (byStu[p.id] = byStu[p.id] || []).push(p); }));
    const stuIds = Object.keys(byStu), groups = stuIds.map(id => byStu[id]);
    const poolStat = (gs, key) => { const t = table2([].concat(...gs), key); return { agree: pc(t.a + t.d, t.n), kappa: kappa(t) }; };
    const T = table2([].concat(...groups), siteK), pairs = T.n;
    const ci = pairs && groups.length >= 10 ? { agree: boot(groups, g => poolStat(g, siteK).agree, cfg.B), kappa: boot(groups, g => poolStat(g, siteK).kappa, cfg.B) } : { agree: null, kappa: null };
    res.pooled = { pairs, students: groups.length, t: T, agree: pc(T.a + T.d, pairs), kappa: kappa(T), p: mcnemar(T.b, T.c), ci, diff: pairedDiff(T),
      satSite: pairs ? Math.max(pc(T.a + T.b, pairs), 100 - pc(T.a + T.b, pairs)) : null, satPost: pairs ? Math.max(pc(T.a + T.c, pairs), 100 - pc(T.a + T.c, pairs)) : null };
    // جدول الانتقال: المحاولة الأولى ← البعدي (التحسّن) وليس الاتساق
    const TF = table2([].concat(...groups), 'first');
    res.transition = { both: TF.a, regressed: TF.b, improved: TF.c, stayWeak: TF.d, n: TF.n, p: mcnemar(TF.b, TF.c) };
    // المستوى الثالث: الطالبات (درجة الطالبة في اللعبة ودرجتها البعدية)
    const stu = stuIds.map(id => { const g = byStu[id]; return g.length >= cfg.minOutcomes ? { id, k: g.length, s: pc(g.filter(p => p.site).length, g.length), f: pc(g.filter(p => p.first).length, g.length), q: pc(g.filter(p => p.post).length, g.length) } : null; }).filter(Boolean);
    const sRho = (a, k1) => spearman(a.map(z => z[k1]), a.map(z => z.q));
    res.student = { n: stu.length, minOutcomes: cfg.minOutcomes, rho: stu.length >= cfg.minPairs ? sRho(stu, 's') : null, rhoFirst: stu.length >= cfg.minPairs ? sRho(stu, 'f') : null,
      ci: stu.length >= Math.max(cfg.minPairs, 10) ? boot(stu, g => sRho(g, 's'), cfg.B) : null,
      ciFirst: stu.length >= Math.max(cfg.minPairs, 10) ? boot(stu, g => sRho(g, 'f'), cfg.B) : null,
      constSite: stu.length ? new Set(stu.map(z => z.s)).size <= 1 : false };
    res.flags = [];
    if (res.pooled.satSite >= 95) res.flags.push(`تشبّع في قياس اللعبة: ${Math.round(res.pooled.satSite)}٪ من الأزواج في فئة واحدة، فالاتفاق مرتفع حسابيًا وكابا تُخفَّض بحكم التشبّع. اعتمدي على جدول الانتقال وفرق النسب لا على كابا وحدها.`);
    if (res.pooled.satPost >= 95) res.flags.push(`تشبّع في الاختبار البعدي: ${Math.round(res.pooled.satPost)}٪ من الأزواج في فئة واحدة.`);
    if (res.student.constSite) res.flags.push('درجات الطالبات في اللعبة متطابقة تقريبًا فلا يمكن حساب ارتباطهن بالبعدي بمعنى.');
    if (skipped.length) res.flags.push(`استُبعد ${skipped.length} ناتجًا من الحساب (${skipped.map(s => s.why).filter((v, i, a) => a.indexOf(v) === i).join('، ')}).`);
    return res;
  }

  /* ---------- العرض (للوحة المعلمة) ---------- */
  const f = (x, d) => x == null || !isFinite(x) ? '—' : (+x).toFixed(d == null ? 1 : d);
  const wd = x => x == null || !isFinite(x) ? '—' : (Math.round(x * 10) / 10 < 0 ? 'نقصان ' : 'زيادة ') + Math.abs(Math.round(x * 10) / 10) + ' نقطة';
  const fp = x => x == null ? '—' : (x < 0.001 ? '<0.001' : x.toFixed(3));
  const sg = x => x == null || !isFinite(x) ? '—' : '<span style="direction:ltr;unicode-bidi:bidi-override;display:inline-block">' + (x > 0 ? '+' : x < 0 ? '-' : '') + Math.abs(Math.round(x * 10) / 10) + '</span>';
  const kLabel = k => k == null ? 'غير معرّفة' : k < 0.2 ? 'ضعيف' : k < 0.4 ? 'مقبول' : k < 0.6 ? 'متوسط' : k < 0.8 ? 'جيد' : 'قوي جدًا';
  const lessonName = { db: 'إنشاء قاعدة البيانات', query: 'الاستعلام والتقارير', device: 'حماية جهاز الحاسب', cyber: 'مقدمة في الأمن السيبراني' };

  function html(A, set, esc) {
    let cfg = getCfg(); const forSet = set ? set.at : '';
    const stale = cfg && cfg.forSet && cfg.forSet !== forSet;
    let h = `<section class="panel card" id="pCons" style="margin:12px 0"><h3 style="margin:0 0 4px">اتساق التشخيص بين اللعبة والاختبار البعدي</h3>
      <p class="muted small-print">هل يتفق ما أظهرته اللعبة عن تحقق كل ناتج مع الاختبار البعدي؟ ارتفاع المتوسطات وحده لا يجيب. تُقارَن الطالبات أنفسهن (زوج: طالبة × ناتج). أساس الاتساق هنا: هل تشخّص المحاولة الأولى في اللعبة (فحصًا) النواتج التي يُظهر الاختبار البعدي ضعفها؟ أما آخر ما وصلت إليه الطالبة في اللعبة فيُعرض كمؤشر ثانٍ لأنه يقترب عادةً من 100٪ فلا يميّز.</p>`;
    if (!cfg || stale) {
      const c = Object.assign({}, DEFAULTS, { mastery: set && set.target ? set.target : DEFAULTS.mastery });
      h += `<div class="banner info"><div><b>أعلني العتبات قبل رؤية النتائج:</b> تُحدَّد الآن وتُسجَّل بوقتها، ولا تظهر نتائج الاتساق قبل اعتمادها. أي تعديل بعد الظهور يُسجَّل ويُعلَّم في اللوحة.${stale ? ' (العتبات السابقة تخص ملفًا آخر؛ اعتمدي عتباتٍ لهذا الملف.)' : ''}</div></div>
        <div class="row" style="flex-wrap:wrap;gap:10px;margin:8px 0">
          <label>«متفق» إذا كان الفرق ≤ (نقاط مئوية)<input type="number" id="cTol" min="1" max="50" value="${c.tol}" class="t-input" style="width:80px"></label>
          <label>حد الإتقان ٪<input type="number" id="cMas" min="1" max="100" value="${c.mastery}" class="t-input" style="width:80px"></label>
          <label>أقل عدد أزواج لحساب الناتج<input type="number" id="cMin" min="3" max="60" value="${c.minPairs}" class="t-input" style="width:80px"></label>
          <label>قياس اللعبة النهائي<select id="cSite" class="t-input"><option value="best">آخر ما وصلت إليه (أصابت في أي محاولة)</option><option value="by3">حتى الثالثة</option></select></label>
          <label>عدد أضعف النواتج للتداخل (k)<input type="number" id="cK" min="2" max="12" value="${c.k}" class="t-input" style="width:80px"></label>
          <button class="btn gold" id="cLock">اعتمدي العتبات واحسبي</button></div></section>`;
      return h;
    }
    markViewed(cfg = getCfg());
    const R = compute(A.rows, cfg), L = R.level1, P = R.pooled, S = R.student, T = R.transition;
    h += `<div class="row" style="flex-wrap:wrap;gap:8px;margin:6px 0"><span class="pill ok">العتبات معلنة: ${esc(new Date(cfg.declaredAt).toLocaleString('ar-SA-u-nu-latn'))}</span><span class="small-print muted">${esc(describe(cfg))}</span>
      ${cfg.changedAfterView ? '<span class="pill low">عُدّلت العتبات بعد رؤية النتائج</span>' : ''}${(cfg.history || []).length && !cfg.changedAfterView ? '<span class="pill mid">عُدّلت قبل رؤية النتائج</span>' : ''}
      <button class="btn ghost small" id="cEdit">تعديل العتبات</button></div>
      <div id="cEditBox" style="display:none" class="row"><label>فرق الاتفاق<input type="number" id="cTol" min="1" max="50" value="${cfg.tol}" class="t-input" style="width:70px"></label><label>حد الإتقان ٪<input type="number" id="cMas" min="1" max="100" value="${cfg.mastery}" class="t-input" style="width:70px"></label><label>أقل أزواج<input type="number" id="cMin" min="3" max="60" value="${cfg.minPairs}" class="t-input" style="width:70px"></label><label>قياس اللعبة<select id="cSite" class="t-input"><option value="best" ${cfg.site === 'best' ? 'selected' : ''}>آخر ما وصلت إليه</option><option value="by3" ${cfg.site === 'by3' ? 'selected' : ''}>حتى الثالثة</option></select></label><label>k<input type="number" id="cK" min="2" max="12" value="${cfg.k || 8}" class="t-input" style="width:60px"></label><button class="btn small" id="cApply">طبّقي (يُسجَّل التعديل)</button></div>`;
    if (!R.N) { h += `<div class="banner bad"><div>لا ناتج بعدد أزواج كافٍ (≥ ${cfg.minPairs}) للحساب. أكملي مطابقة الأسماء أو خفّضي أقل عدد أزواج بقرارٍ معلن.</div></div></section>`; return h; }
    const kOk = !(P.satSite >= 95 || P.satPost >= 95);
    const kp = (v, ci, d, suf) => v == null ? '—' : f(v, d) + (suf || '') + (ci ? ` <small class="muted"><span style="direction:ltr;unicode-bidi:isolate;display:inline-block">[${f(ci.lo, d)}, ${f(ci.hi, d)}]</span></small>` : '');
    const X = R.screen, pct0 = v => v == null ? '—' : f(v, 0) + '٪';
    const lessonRows = X.lessons.slice().sort((a, b) => a.first - b.first).map(z => `<tr><td>${esc(lessonName[z.lesson] || z.lesson)}</td><td class="num">${z.n}</td><td class="num">${f(z.first, 1)}</td><td class="num">${f(z.post, 1)}</td></tr>`).join('');
    h += `<h4 style="margin:10px 0 4px">① التشخيص: المحاولة الأولى في اللعبة مقابل الاختبار البعدي (الأساس)</h4>
      <div class="kpis num">
      <div class="panel kpi"><b>${f(X.rho, 2)}</b><small>ارتباط الرتب (سبيرمان) بين النواتج${X.perm == null ? '' : ' · ف تبديل ≈ ' + fp(X.perm) + ' (استكشافية)'}</small></div>
      <div class="panel kpi"><b>${f(X.ccc, 2)}</b><small>معامل التوافق (CCC): منخفض متوقع لأن البعدي أعلى منهجيًا</small></div>
      <div class="panel kpi"><b>${X.top ? X.top.overlap + ' من ' + X.top.k : '—'}</b><small>تداخل أضعف ${X.top ? X.top.k : cfg.k} نواتج في اللعبة والبعدي${X.top && X.top.tie ? ' (تعادل عند الحد)' : ''}</small></div>
      <div class="panel kpi"><b>${pct0(X.sens)}</b><small>الحساسية: من النواتج دون ${cfg.mastery}٪ بعديًا (${X.weakPost}) وسمتها اللعبة دون الحد من الأولى</small></div>
      <div class="panel kpi"><b>${pct0(X.ppv)}</b><small>القيمة التنبؤية: من النواتج التي وسمتها اللعبة (${X.weakFirst}) ظلّ ضعفها بعديًا</small></div>
      <div class="panel kpi"><b>${S.rhoFirst == null ? '—' : kp(S.rhoFirst, S.ciFirst, 2)}</b><small>ارتباط درجة الطالبة في المحاولة الأولى ببعديّتها (ن=${S.n})</small></div></div>
      <div class="t-scroll"><table class="t-table"><thead><tr><th>اللعبة (المحاولة الأولى) ↓ / البعدي →</th><th>دون ${cfg.mastery}٪ بعديًا</th><th>بلغ ${cfg.mastery}٪ بعديًا</th></tr></thead><tbody>
        <tr><th>وسمتها اللعبة دون الحد</th><td class="num">${X.sc.tp}</td><td class="num">${X.sc.fp}</td></tr>
        <tr><th>بلغت الحد في اللعبة</th><td class="num">${X.sc.fn}</td><td class="num">${X.sc.tn}</td></tr></tbody></table></div>
      <p class="small-print">الوحدة هنا الناتج (${R.N} ناتجًا). متوسط ما زاده البعدي على المحاولة الأولى: ${f(X.meanGain, 1)} نقطة. الارتباط والتداخل يقيسان اتفاق <b>الترتيب</b> (أيّ النواتج أضعف)، لا تطابق المستوى؛ فالمحاولة الأولى تسبق التعلم والأسئلة مختلفة، فالفرق في المستوى متوقع. الدلالة بالتبديل وصفية على ${R.N} ناتجًا مجمّعًا ولا تُعمَّم.</p>
      <details><summary class="small-print">متوسط كل درس: الأولى مقابل البعدي</summary><div class="t-scroll"><table class="t-table"><thead><tr><th>الدرس</th><th>النواتج</th><th>الأولى ٪</th><th>البعدي ٪</th></tr></thead><tbody>${lessonRows}</tbody></table></div></details>
      <h4 style="margin:12px 0 4px">② آخر ما وصلت إليه الطالبة في اللعبة مقابل البعدي ${P.satSite >= 95 ? '<span class="pill na">مشبَّع</span>' : ''}</h4>
      ${P.satSite >= 95 ? '<p class="small-print muted">أصابت الطالبات في اللعبة في النهاية بنسبة تقارب 100٪ (تحاول حتى تصيب)، فهذا القياس لا يميّز بين النواتج؛ اتفاق الأزواج يساوي تقريبًا نسبة نجاح البعدي، وارتباط الرتب وCCC قريبان من الصفر بحكم غياب التباين لا بسبب عدم اتساق. يُعرض للشفافية فقط.</p>' : ''}
      <div class="kpis num">
      <div class="panel kpi"><b>${L.agreeN} من ${R.N}</b><small>نواتج متفقة (الفرق ≤ ${cfg.tol} نقاط)</small></div>
      <div class="panel kpi"><b>${L.classAgreeN} من ${R.N}</b><small>اتفاق التصنيف «متحقق/لا» عند ${cfg.mastery}٪</small></div>
      <div class="panel kpi"><b>${f(L.rho, 2)}</b><small>ارتباط الرتب (سبيرمان) بين النواتج</small></div>
      <div class="panel kpi"><b>${f(L.ccc, 2)}</b><small>معامل التوافق (CCC) بين النواتج</small></div>
      <div class="panel kpi"><b>${kp(P.agree, P.ci.agree, 0, '٪')}</b><small>اتفاق الأزواج (${P.pairs} زوجًا · ${P.students} طالبة)</small></div>
      <div class="panel kpi"><b>${kOk ? kp(P.kappa, P.ci.kappa, 2) : '—'}</b><small>${kOk ? 'كابا كوهين (' + esc(kLabel(P.kappa)) + ')' : 'كابا لا تُفسَّر هنا (تشبّع ≥ 95٪)'}</small></div>
      <div class="panel kpi"><b>${S.rho == null ? '—' : kp(S.rho, S.ci, 2)}</b><small>ارتباط درجة الطالبة بين اللعبة والبعدي (ن=${S.n})</small></div></div>
      <p class="small-print">متوسط الفرق عبر النواتج (البعدي مقارنةً باللعبة): <b>${wd(L.meanDiff)}</b>، ويقع الفرق في معظم النواتج بين ${wd(L.loa[0])} و${wd(L.loa[1])}. ماكنمار على الأزواج: لعبة نعم/بعدي لا = ${P.t.b}، لعبة لا/بعدي نعم = ${P.t.c}، ف = ${fp(P.p)}.
      الفترات بين أقواس: 95٪ بالبوتستراب على مستوى الطالبة (١٠٠٠ إعادة، بذرة ثابتة).</p>
      ${R.flags.map(t => `<div class="banner info" style="margin:6px 0"><div>${esc(t)}</div></div>`).join('')}
      <details open><summary class="small-print"><b>جدول الانتقال (المحاولة الأولى ← البعدي): قياس التحسّن لا الاتساق</b></summary>
      <div class="t-scroll"><table class="t-table"><thead><tr><th>أتقنت في الاثنين</th><th>تحسّنت (لم تتقن أولًا ثم أتقنت)</th><th>ظل الضعف (لم تتقن في الاثنين)</th><th>تراجعت (أتقنت أولًا ثم لم تتقن)</th><th>الأزواج</th><th>ماكنمار</th></tr></thead><tbody><tr class="num"><td>${T.both} (${f(pc(T.both, T.n), 0)}٪)</td><td>${T.improved} (${f(pc(T.improved, T.n), 0)}٪)</td><td>${T.stayWeak} (${f(pc(T.stayWeak, T.n), 0)}٪)</td><td>${T.regressed} (${f(pc(T.regressed, T.n), 0)}٪)</td><td>${T.n}</td><td>ف=${fp(T.p)}</td></tr></tbody></table></div>
      <p class="small-print muted">«ظل الضعف» هو الأهم تشخيصيًا: اللعبة والبعدي كلاهما لم يُظهرا الإتقان. «التراجع» الكثير قد يعني اختلاف صعوبة الأسئلة لا تراجع التعلم.</p></details>
      <h4 style="margin:10px 0 4px">لكل ناتج</h4>
      <div class="t-scroll" style="max-height:460px"><table class="t-table"><thead><tr><th>الناتج</th><th>ن</th><th>اللعبة ٪</th><th>الأولى ٪</th><th>البعدي ٪</th><th>الفرق</th><th>اتفاق الأزواج ٪</th><th>كابا</th><th>ماكنمار ف</th><th>الحكم</th></tr></thead><tbody>
      ${Object.keys(lessonName).map(l => { const os = R.outcomes.filter(o => o.lesson === l); if (!os.length) return ''; return `<tr><td colspan="10" style="background:var(--surface-2,#f7eef6)"><b>${esc(lessonName[l])}</b></td></tr>` + os.map(o => `<tr><td>${esc(o.outcome)}</td><td class="num">${o.n}</td><td class="num">${f(o.site, 0)}</td><td class="num">${f(o.first, 0)}</td><td class="num">${f(o.post, 0)}</td><td class="num">${sg(o.diff)}</td><td class="num">${f(o.agreePct, 0)}</td><td class="num">${o.saturated ? '—' : f(o.kappa, 2)}</td><td class="num">${fp(o.p)}</td><td><span class="pill ${o.agree ? 'ok' : 'low'}">${o.agree ? 'متفق' : 'غير متفق'}</span>${o.classAgree ? '' : ' <span class="pill mid">اختلاف التصنيف</span>'}${o.saturated ? ' <span class="pill na">تشبّع</span>' : ''}</td></tr>`).join(''); }).join('')}</tbody></table></div>
      ${R.skipped.length ? `<details><summary class="small-print">نواتج خارج الحساب (${R.skipped.length})</summary><ul class="small-print">${R.skipped.map(s => `<li>${esc(s.outcome)} — ${esc(s.why)}</li>`).join('')}</ul></details>` : ''}
      <div class="banner info" style="margin:8px 0"><div><b>كيف تُقرأ:</b> الاتساق مؤشر على أن اللعبة والاختبار يُظهران صورة متقاربة، وليس دليلًا على صدق اللعبة. الأسئلة في المهمتين مختلفة (أو معادة الصياغة) فقد يعود الفرق لصعوبتها، وكابا تتأثر بالتشبّع وبقلة العدد (ن لكل ناتج بين ${Math.min(...R.outcomes.map(o => o.n))} و${Math.max(...R.outcomes.map(o => o.n))}). العتبات إرشادية معلنة وليست مُعايَرة إحصائيًا. مع ${R.N} ناتجًا لا تُفسَّر كل «غير متفق» منفردة.</div></div>
      <div class="row"><button class="btn gold small" id="cCsv">تنزيل جدول الاتساق (CSV)</button><button class="btn ghost small" id="cRec">سجّلي نتائج الاتساق في سجل الوكيل</button></div></section>`;
    return h;
  }

  function bind(root, A, set, ctx) {
    const q = s => root.querySelector(s); if (!q('#pCons')) return;
    const read = () => ({ tol: +q('#cTol').value, mastery: +q('#cMas').value, minPairs: +q('#cMin').value, site: q('#cSite').value, k: +q('#cK').value });
    const lk = q('#cLock'); if (lk) lk.onclick = () => { lock(read(), set ? set.at : ''); ctx.render(); };
    const ed = q('#cEdit'); if (ed) ed.onclick = () => { const b = q('#cEditBox'); b.style.display = b.style.display === 'none' ? '' : 'none'; };
    const ap = q('#cApply'); if (ap) ap.onclick = () => { change(read()); ctx.render(); };
    const cfg = getCfg(); if (!cfg || (cfg.forSet && cfg.forSet !== (set ? set.at : ''))) return;
    const R = compute(A.rows, cfg), Q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const cv = q('#cCsv'); if (cv) cv.onclick = async () => {
      const head = ['الدرس', 'الناتج', 'ن', 'اللعبة %', 'الأولى %', 'البعدي %', 'الفرق', 'اتفاق الأزواج %', 'كابا', 'ماكنمار ف', 'الحكم', 'اختلاف التصنيف', 'تشبّع'];
      const rowsCsv = R.outcomes.map(o => [lessonName[o.lesson], o.outcome, o.n, r1(o.site), r1(o.first), r1(o.post), r1(o.diff), r1(o.agreePct), o.saturated ? '' : r2(o.kappa), o.p == null ? '' : +o.p.toFixed(4), o.agree ? 'متفق' : 'غير متفق', o.classAgree ? '' : 'نعم', o.saturated ? 'نعم' : '']);
      const X = R.screen, meta = [['التشخيص: المحاولة الأولى مقابل البعدي', ''], ['سبيرمان بين النواتج', r2(X.rho)], ['CCC', r2(X.ccc)], ['ف التبديل (استكشافية)', X.perm == null ? '' : +X.perm.toFixed(4)], ['تداخل أضعف k', X.top ? X.top.overlap + '/' + X.top.k : ''], ['الحساسية %', r1(X.sens)], ['القيمة التنبؤية %', r1(X.ppv)], ['وسمتها اللعبة وظل ضعفها', X.sc.tp], ['وسمتها اللعبة وتحسّنت', X.sc.fp], ['بلغت في اللعبة ودون الحد بعديًا', X.sc.fn], ['بلغت في الاثنين', X.sc.tn], ['ارتباط الطالبة (الأولى)', r2(R.student.rhoFirst)], [''], ['العتبات المعلنة', describe(cfg)], ['وقت الإعلان', cfg.declaredAt], ['عُدّلت بعد رؤية النتائج', cfg.changedAfterView ? 'نعم' : 'لا']];
      await MDQ.saveFile('اتساق_اللعبة_والاختبار_البعدي.csv', new Blob(['﻿' + meta.map(r => r.map(Q).join(',')).concat([''], [head.map(Q).join(',')], rowsCsv.map(r => r.map(Q).join(','))).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    };
    const rc = q('#cRec'); if (rc) rc.onclick = () => {
      const L = R.level1, P = R.pooled; log('نتائج الاتساق', `${describe(cfg)} · متفقة ${L.agreeN}/${R.N} · ρ=${r2(L.rho)} · CCC=${r2(L.ccc)} · أزواج ${P.pairs}: اتفاق ${r1(P.agree)}٪ · [الأولى↔البعدي: ρ=${r2(R.screen.rho)} · CCC=${r2(R.screen.ccc)} · حساسية ${r1(R.screen.sens)}٪ · قيمة تنبؤية ${r1(R.screen.ppv)}٪${R.screen.top ? ' · تداخل ' + R.screen.top.overlap + '/' + R.screen.top.k : ''}${R.student.rhoFirst == null ? '' : ' · طالبات ' + r2(R.student.rhoFirst)}] · كابا ${r2(P.kappa)}${R.student.rho == null ? '' : ' · ارتباط الطالبات ' + r2(R.student.rho)}`);
      ctx.msg('سُجّلت نتائج الاتساق في سجل الوكيل.'); ctx.render();
    };
  }

  MDQ.consistency = { VERSION, DEFAULTS, CK, getCfg, lock, change, compute, html, bind, describe,
    _stats: { kappa, mcnemar, spearman, ccc, pearson, ranks, pairedDiff, table2, permP, topK } };
})();
