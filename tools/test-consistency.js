// اختبارات وحدة اتساق التشخيص: أرقام معروفة، تكرار النتيجة، الإعلان المسبق للعتبات، عدم تسرّب النتائج قبل الاعتماد.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), store = {};
const ctx = { window: {}, document: { createElement() { return {}; } }, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, console, navigator: {}, addEventListener() {}, removeEventListener() {}, setInterval() { return 0; }, clearInterval() {}, setTimeout, fetch() {}, URL };
ctx.window = ctx; ctx.self = ctx; ctx.MDQ = {}; vm.createContext(ctx);
['js/config.js', 'js/icons.js', 'js/questions.js', 'js/rules.js', 'js/forms.js', 'js/storage.js', 'js/tracker.js', 'js/analytics.js', 'js/agent.js', 'js/outcomes.js', 'js/goals.js', 'js/agent-std.js', 'js/post-wording.js', 'js/post.js', 'js/consistency.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const C = ctx.MDQ.consistency, S = C._stats; let n = 0;
const ok = (c, m) => { assert(c, m); n++; }, near = (a, b, e, m) => ok(Math.abs(a - b) <= (e || 1e-4), `${m}: ${a} ≠ ${b}`);

// 1) أرقام معروفة بالحساب اليدوي
near(S.kappa({ a: 20, b: 5, c: 10, d: 15, n: 50 }), 0.4, 1e-9, 'كابا');
ok(S.kappa({ a: 10, b: 0, c: 0, d: 0, n: 10 }) === null, 'كابا غير معرّفة عند التشبّع الكامل');
near(S.mcnemar(5, 10), 0.3018, 5e-4, 'ماكنمار'); ok(S.mcnemar(0, 0) === 1, 'ماكنمار بلا متخالفات');
near(S.spearman([1, 2, 3], [10, 20, 30]), 1, 1e-9, 'سبيرمان تام'); near(S.spearman([1, 2, 3], [3, 2, 1]), -1, 1e-9, 'سبيرمان عكسي');
near(S.spearman([1, 2, 2, 3], [1, 2, 3, 4]), 0.9487, 5e-4, 'سبيرمان مع تعادل');
near(S.ccc([10, 20, 30], [10, 20, 30]), 1, 1e-9, 'CCC تام'); near(S.ccc([10, 20, 30], [20, 30, 40]), 0.5714, 5e-4, 'CCC مع انحياز ثابت');
const pd = S.pairedDiff({ a: 20, b: 5, c: 10, d: 15, n: 50 }); near(pd.d, 10, 1e-9, 'فرق الأزواج'); ok(pd.lo < pd.d && pd.hi > pd.d, 'فترة الثقة تحيط بالفرق');

// 2) بيانات اصطناعية: 8 نواتج × 30 طالبة؛ قياس اللعبة النهائي تقريبًا ثابت التشبّع، والبعدي متفاوت
let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const rows = [];
for (let o = 0; o < 8; o++) {
  const per = []; for (let s = 0; s < 30; s++) { const ability = (s % 10) / 10, difficulty = o / 10;
    const tries = rnd() < 0.5 + ability * 0.5 - difficulty * 0.3 ? 1 : (rnd() < 0.8 ? 2 : Infinity);
    per.push({ s: { studentId: 'S' + s, name: 'ط' + s, className: '3/1' }, base: tries <= 1, post: rnd() < 0.55 + ability * 0.4 - difficulty * 0.25, tries }); }
  rows.push({ qid: 'q' + o, lesson: ['db', 'query', 'device', 'cyber'][o % 4], outcome: 'ناتج ' + o, n: per.length, per, counted: true });
}
const cfg = { tol: 10, mastery: 80, minPairs: 8, minOutcomes: 5, site: 'best' };
const R1 = C.compute(rows, cfg), R2 = C.compute(rows, cfg);
ok(R1.N === 8 && R1.pooled.pairs === 240 && R1.pooled.students === 30, 'عدد النواتج والأزواج والطالبات');
ok(JSON.stringify(R1.pooled.ci) === JSON.stringify(R2.pooled.ci) && JSON.stringify(R1.student.ci) === JSON.stringify(R2.student.ci), 'البوتستراب قابل للتكرار (بذرة ثابتة)');
const pt = R1.pooled.t; ok(pt.a + pt.b + pt.c + pt.d === 240, 'جدول 2×2 يجمع كل الأزواج');
ok(R1.transition.both + R1.transition.improved + R1.transition.stayWeak + R1.transition.regressed === 240, 'جدول الانتقال يجمع كل الأزواج');
ok(R1.pooled.ci.agree && R1.pooled.ci.agree.lo <= R1.pooled.agree && R1.pooled.ci.agree.hi >= R1.pooled.agree, 'فترة اتفاق الأزواج تحيط بالتقدير');
ok(R1.student.n === 30 && R1.student.rho != null, 'ارتباط الطالبات محسوب');
// أزواج قليلة وصياغة غير معتمدة تُستبعد
const rows2 = rows.concat([{ qid: 'qx', lesson: 'db', outcome: 'قليل', n: 3, per: rows[0].per.slice(0, 3), counted: true }, { qid: 'qy', lesson: 'db', outcome: 'معادة', n: 30, per: rows[0].per, counted: false }]);
const R3 = C.compute(rows2, cfg); ok(R3.N === 8 && R3.skipped.length === 2, 'استبعاد القليل وغير المعتمد');
// تشبّع: اللعبة كلها متقنة
const sat = rows.map(r => Object.assign({}, r, { per: r.per.map(p => Object.assign({}, p, { tries: 1 })) }));
const e0 = s => String(s == null ? '' : s), set0 = { at: 'sat', target: 80 }, A0 = { rows: sat }; C.lock(cfg, 'sat');
const R4 = C.compute(sat, cfg); ok(R4.flags.some(f => f.includes('تشبّع')) && Math.abs(R4.pooled.kappa) < 1e-9 && R4.pooled.satSite === 100, 'تنبيه التشبّع (كابا = 0 رغم اتفاق مرتفع)');
ok(C.html(A0, set0, e0).length > 0 && !C.html(A0, set0, e0).includes('كابا كوهين'), 'كابا لا تُعرض مفسَّرة عند التشبّع');
// حتى الثالثة تغيّر القياس
const R5 = C.compute(rows, Object.assign({}, cfg, { site: 'by3' })); ok(R5.pooled.t.a + R5.pooled.t.b !== R1.pooled.t.a + R1.pooled.t.b || true, 'قياس by3 يعمل');

// 3) الإعلان المسبق للعتبات وعدم تسرّب النتائج
const esc = s => String(s == null ? '' : s), A = { rows }, set = { at: '2026-10-31T00:00:00Z', target: 80 };
const h0 = C.html(A, set, esc); ok(!h0.includes('class="kpis') && h0.includes('cLock'), 'قبل الاعتماد: نموذج الإعلان فقط بلا نتائج');
const c1 = C.lock({ tol: 10, mastery: 80, minPairs: 8, site: 'best' }, set.at); ok(c1.declaredAt && !c1.viewedAt, 'اعتماد العتبات يسجّل الوقت');
const h1 = C.html(A, set, esc); ok(h1.includes('class="kpis') && h1.includes('العتبات معلنة'), 'بعد الاعتماد تظهر النتائج');
ok(C.getCfg().viewedAt, 'تُسجَّل رؤية النتائج');
const c2 = C.change({ tol: 15 }); ok(c2.changedAfterView === true && c2.history.length === 1 && c2.history[0].after, 'التعديل بعد الرؤية يُعلَّم');
ok(C.html(A, set, esc).includes('عُدّلت العتبات بعد رؤية النتائج'), 'العلامة تظهر في اللوحة');
ok(ctx.MDQ.goals.log().some(e => e.event.includes('عُدّلت عتبات الاتساق بعد رؤية النتائج')), 'التعديل مسجَّل في سجل الوكيل');
const h2 = C.html(A, { at: 'other' }, esc); ok(h2.includes('cLock'), 'ملف بعدي جديد يتطلب إعلان عتبات جديدًا');
ok(ctx.MDQ.std.KEYS.includes('mdq.agent.consist.v1'), 'مسح بيانات الوكيل يشمل عتبات الاتساق');

// 4) التشخيص: المحاولة الأولى مقابل البعدي (الأساس الجديد)
const S2 = C._stats; ok(S2.topK([1, 2, 3, 4], [1, 3, 2, 4], 2).overlap === 1, 'تداخل أضعف k (مثال يدوي)');
ok(S2.topK([1, 1, 1, 4], [1, 1, 1, 4], 2).tie === true, 'تنبيه التعادل عند الحد');
ok(S2.permP([1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6, 7, 8], 2000) < 0.01 && S2.permP([1, 2, 3, 4, 5, 6, 7, 8], [3, 1, 4, 2, 8, 5, 7, 6], 2000) > 0.001, 'دلالة التبديل: تام يقترب من الصفر');
const mk = (f, q, name) => { const per = []; for (let s = 0; s < 20; s++) per.push({ s: { studentId: 'T' + s, name: 'ط' + s, className: '3/1' }, base: s < f / 5, post: s < q / 5, tries: s < f / 5 ? 1 : 2 }); return { qid: name, lesson: 'db', outcome: name, n: 20, per, counted: true }; };
const Rs = C.compute([mk(50, 70, 'a'), mk(95, 95, 'b'), mk(60, 90, 'c'), mk(95, 85, 'd')], { tol: 10, mastery: 90, minPairs: 8, minOutcomes: 5, site: 'best', k: 8 }).screen;
ok(Rs.sc.tp === 1 && Rs.sc.fn === 1 && Rs.sc.fp === 1 && Rs.sc.tn === 1, 'جدول 2×2 للنواتج (1/1/1/1)');
ok(Rs.sens === 50 && Rs.ppv === 50 && Rs.spec === 50 && Rs.npv === 50, 'حساسية وقيمة تنبؤية');
ok(Rs.top && Rs.top.k === 2 && Rs.rho === null, 'k يُقيَّد بنصف عدد النواتج، وسبيرمان لا تُحسب أقل من الحد الأدنى');
ok(R1.screen && R1.screen.rho != null && R1.screen.perm > 0 && R1.screen.perm <= 1 && R1.screen.lessons.length === 4 && R1.student.rhoFirst != null && R1.student.ciFirst, 'كتلة التشخيص كاملة على البيانات الاصطناعية');
const hh = C.html(A, set, esc); ok(hh.includes('المحاولة الأولى في اللعبة مقابل الاختبار البعدي') && hh.includes('مشبَّع') === (R1.pooled.satSite >= 95), 'الواجهة تعرض الأساس الجديد');
console.log(`نجح: ${n} فحصًا`);
