const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), store = {};
const ctx = { window: {}, document: { createElement() { return {}; } }, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, console, navigator: {}, addEventListener() {}, removeEventListener() {}, setInterval() { return 0; }, clearInterval() {}, setTimeout, fetch() {}, URL };
ctx.window = ctx; ctx.self = ctx; ctx.MDQ = {}; vm.createContext(ctx);
['js/config.js', 'js/icons.js', 'js/questions.js', 'js/rules.js', 'js/forms.js', 'js/storage.js', 'js/tracker.js', 'js/analytics.js', 'js/agent.js', 'js/outcomes.js', 'js/goals.js', 'js/agent-std.js', 'js/post-wording.js', 'js/post.js', 'js/calibration.js', 'js/consistency.js', 'js/remedial-data.js', 'js/distractors.js', 'js/loop.js', 'js/remedial.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
let n = 0;
const ok = (c, m) => { assert(c, m); n++; }, near = (a, b, e, m) => ok(Math.abs(a - b) <= (e || 1e-9), `${m}: ${a} ≠ ${b}`);
const esc = s => String(s == null ? '' : s);

const K = ctx.MDQ.calibration;
// 1) أرقام معروفة بالحساب اليدوي: 8 نواتج، المرجع 90
const O = [[50, 70, 'db'], [60, 95, 'db'], [95, 60, 'db'], [96, 98, 'query'], [40, 50, 'query'], [92, 91, 'device'], [55, 89, 'device'], [97, 99, 'cyber']].map(a => ({ first: a[0], post: a[1], lesson: a[2] }));
const m70 = K.metrics(K.confusion(O, 70, 90));
ok(m70.c.tp === 3 && m70.c.fp === 1 && m70.c.fn === 1 && m70.c.tn === 3, 'جدول 2×2 عند 70');
near(m70.sens, 75, 1e-9, 'حساسية 70'); near(m70.spec, 75, 1e-9, 'خصوصية 70'); near(m70.ppv, 75, 1e-9, 'قيمة تنبؤية 70'); near(m70.flagRate, 50, 1e-9, 'نسبة الوسوم 70'); near(m70.youden, 0.5, 1e-9, 'يودن 70');
const m95 = K.metrics(K.confusion(O, 95, 90)); near(m95.sens, 75, 1e-9, 'حساسية 95'); near(m95.spec, 50, 1e-9, 'خصوصية 95'); near(m95.ppv, 60, 1e-9, 'قيمة تنبؤية 95');
const rows = K.sweep(O, 90); ok(rows.length === K.GRID.length && rows.every(r => r.n === 8), 'مسح الشبكة');
// 2) قاعدة الاختيار
let ch = K.choose(rows); ok(ch.t === 60 && ch.fallback === true, 'لا عتبة تحقق حساسية ≥80 فيُعرض الأعلى يودن بديلًا (60)');
ch = K.choose(rows, { minSens: 70, maxFlagRate: 70 }); ok(ch.t === 60 && ch.fallback === false, 'بشروط أخف تُختار 60 دون وسم بديل');
ok(K.choose(K.sweep([{ first: 50, post: 95 }, { first: 60, post: 96 }], 90)) === null, 'لا ناتج ضعيف بعديًا: لا اقتراح (الحساسية غير معرّفة)');
// 3) التحقق بترك درس جانبًا
const cv = K.lolo(O, 90, null); ok(cv && cv.folds.length === 4 && cv.m.n === 8, 'أربع طيّات تغطي كل النواتج مرة واحدة');
ok(K.lolo(O.slice(0, 3), 90, null) === null, 'أقل من 3 دروس: لا تحقق');
// 4) التحليل الكامل والتحذيرات
const R = K.analyze(O, 90); ok(R.n === 8 && R.weakN === 4 && R.choice && R.cv, 'تحليل كامل');
ok(R.warnings.some(w => w.includes('عدد النواتج قليل')), 'تحذير العدد القليل'); ok(R.warnings.some(w => w.includes('متفائل')), 'تنبيه التقدير على العينة نفسها');
ok(JSON.stringify(K.analyze(O, 90)) === JSON.stringify(R), 'النتيجة قابلة للتكرار');
ok(K.analyze([{ first: 10, post: 10 }, { first: 20, post: 20 }, { first: 30, post: 30 }], 90).warnings.some(w => w.includes('كل النواتج دون')), 'كل النواتج ضعيفة: لا خصوصية');
// 5) الاعتماد قرار المعلمة ويُسجَّل ولا يغيّر شيئًا آخر
const before = JSON.stringify(Object.keys(store).sort());
const rec = K.adopt(80, { ref: 90, n: 8, recommended: 60 }); ok(rec.t === 80 && K.getAdopted().t === 80 && K.getAdopted().recommended === 60, 'حفظ العتبة المعتمدة والمقترحة');
ok(ctx.MDQ.goals.log().some(e => e.event.includes('اعتمدتُ عتبة وسم الضعف')), 'الاعتماد مسجَّل في سجل الوكيل');
ok(K.adopt(0) === null, 'عتبة غير صالحة لا تُحفظ');
ok(ctx.MDQ.std.KEYS.includes('mdq.agent.calib.v1') && ctx.MDQ.std.KEYS.includes('mdq.agent.loop.v1'), 'مسح الوكيل يشمل ذاكرتي المعايرة والحلقة');
ctx.MDQ.std.wipe(); ok(!('mdq.agent.calib.v1' in store), 'المسح يحذف العتبة المعتمدة');
// 5ب) الاعتماد يغيّر عتبة الوسم في الاتساق فقط، ويُعلَّم بعد رؤية النتائج، ولا يمسّ حد الإتقان
const C0 = ctx.MDQ.consistency; C0.lock({ tol: 10, mastery: 90, minPairs: 3, site: 'best' }, 'z'); const rowsZ = [0, 1, 2, 3, 4, 5].map(i => ({ qid: 'q' + i, lesson: ['db', 'query'][i % 2], outcome: 'ن' + i, n: 6, counted: true, per: Array.from({ length: 6 }, (_, j) => ({ s: { studentId: 'Z' + j, name: 'ط', className: '3/1' }, base: j < i, post: j < 3 + (i % 3), tries: j < i ? 1 : 2 })) }));
C0.html({ rows: rowsZ }, { at: 'z', target: 90 }, esc); K.adopt(70, { ref: 90, n: 6, recommended: 70 });
const cz = C0.getCfg(); ok(cz.flag === 70 && cz.mastery === 90 && cz.changedAfterView === true, 'عتبة الوسم تغيّرت وحد الإتقان لم يتغيّر، وعُلّم التعديل بعد الرؤية');
const s70 = C0.compute(rowsZ, cz).screen, s90 = C0.compute(rowsZ, Object.assign({}, cz, { flag: null })).screen; ok(s70.weakFirst <= s90.weakFirst, 'خفض عتبة الوسم لا يزيد الموسوم');
ok(C0.describe(cz).includes('عتبة وسم اللعبة (الأولى) 70'), 'العتبة تظهر في وصف الإعلان');
// 6) العرض: يدخل في لوحة الاتساق دون كسرها
const h = K.html(O, { mastery: 90 }, esc); ok(h.includes('معايرة العتبة') && h.includes('calAdopt') && h.includes('التحقق بترك درس جانبًا'), 'واجهة المعايرة');
ok(K.html([], { mastery: 90 }, esc) === '', 'لا واجهة بلا نواتج');
const C = ctx.MDQ.consistency; const per = []; for (let s = 0; s < 20; s++) per.push({ s: { studentId: 'T' + s, name: 'ط' + s, className: '3/1' }, base: s < 8, post: s < 14, tries: s < 8 ? 1 : 2 });
const rowsC = ['a', 'b', 'c', 'd', 'e', 'f'].map((q, i) => ({ qid: q, lesson: ['db', 'query', 'device', 'cyber'][i % 4], outcome: 'ن' + q, n: 20, per: per.map((p, j) => Object.assign({}, p, { base: j < 4 + i * 2, post: j < 8 + i * 2 })), counted: true }));
C.lock({ tol: 10, mastery: 80, minPairs: 8, site: 'best' }, 'x'); const hc = C.html({ rows: rowsC }, { at: 'x', target: 80 }, esc); ok(hc.includes('معايرة العتبة') && hc.includes('اتساق التشخيص'), 'اللوحة تعرض المعايرة داخل الاتساق');
console.log(`✔ test-calibration: ${n} فحصًا ناجحًا`);
