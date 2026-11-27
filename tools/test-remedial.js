// اختبارات وكيل الخطط العلاجية: التصميم من الكتاب، الذاكرة، الاعتماد، التحسّن، التوقف عند الأسماء المعلّقة.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), store = {};
const ctx = { window: {}, document: { createElement() { return {}; } }, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, console, navigator: {}, addEventListener() {}, removeEventListener() {}, setInterval() { return 0; }, clearInterval() {}, setTimeout, fetch() {}, URL };
ctx.window = ctx; ctx.self = ctx; ctx.MDQ = {}; vm.createContext(ctx);
['js/config.js', 'js/icons.js', 'js/questions.js', 'js/rules.js', 'js/forms.js', 'js/storage.js', 'js/tracker.js', 'js/analytics.js', 'js/agent.js', 'js/outcomes.js', 'js/goals.js', 'js/agent-std.js', 'js/post-wording.js', 'js/post.js', 'js/remedial-data.js', 'js/remedial.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const R = ctx.MDQ.remedial, TB = ctx.MDQ.textbook; let n = 0;
const ok = (c, m) => { assert(c, m); n++; };
const reset = () => { Object.keys(store).forEach(k => delete store[k]); R.reset(); };

// 1) الكتاب: كل ناتج له موضع وصفحات وخطوات ولا اختراع
const qids = Object.keys(TB.BY); ok(qids.length >= 20, 'عدد النواتج المغطاة');
qids.forEach(q => { const e = TB.BY[q], L = TB.LESSONS[e.file]; ok(e.pages.every(p => p >= L.pages[0] && p <= L.pages[1]), q + ' صفحاته ضمن نطاق الدرس'); ok(e.check && e.points, q + ' نقاط وتحقق'); });
const d0 = R.designSteps('db-03', 0), d1 = R.designSteps('db-03', 1);
ok(d0.steps.length === 3 && d0.steps.reduce((s, x) => s + x.min, 0) === 15, 'خطة 3 خطوات في 15 دقيقة');
const none = R.designSteps('zz-99', 0); ok(!none.book && none.steps.length === 0 && /لا يوجد في الكتاب/.test(none.note), 'لا اقتراح من خارج الكتاب');
ok(d0.steps[1].t !== d1.steps[1].t || TB.BY['db-03'].activity.length <= 1, 'محاولة ثانية بنشاط مختلف إن وُجد');

// 2) بيانات: 3 طالبات؛ س1 أخفقت في ناتجين، س2 في ناتج واحد، س3 أتقنت
const mkS = (id, name, att) => ({ studentId: id, name, className: '3/1', q: new Map(Object.entries(att).map(([q, a]) => [q, { attempts: a.map((c, i) => ({ isCorrect: c, clientTime: '2026-01-0' + (i + 1) })) }]))});
const S1 = mkS('S1', 'سارة أحمد', { 'db-03': [false, false, true], 'qr-01': [true] }), S2 = mkS('S2', 'نورة علي', { 'db-03': [true], 'qr-01': [false, false] }), S3 = mkS('S3', 'هند محمد', { 'db-03': [true], 'qr-01': [true] });
const row = (qid, per) => ({ qid, outcome: 'ناتج ' + qid, lesson: qid.startsWith('db') ? 'db' : 'query', counted: true, per });
const A = { tally: { pending: 0 }, rows: [row('db-03', [{ s: S1, base: false, post: false, tries: 3 }, { s: S2, base: true, post: false, tries: 1 }, { s: S3, base: true, post: true, tries: 1 }]), row('qr-01', [{ s: S1, base: true, post: false, tries: 1 }, { s: S2, base: false, post: false, tries: Infinity }, { s: S3, base: true, post: true, tries: 1 }])] };

reset();
let r = R.send(A, 'db-03', ['S1', 'S2']);
ok(r.ok && r.made === 4 && r.studs === 2, 'S1: ناتجان، S2: ناتجان = 4 خطط');
let d = R.load(); ok(Object.values(d.plans).every(p => p.status === 'draft'), 'كل الخطط مسودة');
ok(d.plans['S1|db-03|0'].diagnosis.startsWith('احتمال'), 'التشخيص موسوم احتمالًا');
ok(d.plans['S1|db-03|0'].game.tries === 3 && d.plans['S2|qr-01|0'].game.tries === null, 'لقطة اللعبة');
ok(d.profiles.S1.skills.length === 2 && !d.profiles.S3, 'ملف الطالبة يحفظ مهاراتها المستهدفة ولا يُنشأ لغير المحددات');
// عدم التكرار
r = R.send(A, 'db-03', ['S1']); ok(r.made === 0 && r.kept === 2, 'لا تكرار للخطط القائمة');
// الاعتماد
ok(!R.approve('nope').ok, 'اعتماد خطة غير موجودة');
ok(R.setSteps('S1|db-03|0', [{ t: 'خطوة معدّلة', min: 10 }]) && R.load().plans['S1|db-03|0'].status === 'edited', 'التعديل قبل الاعتماد');
ok(R.approve('S1|db-03|0').ok && R.load().plans['S1|db-03|0'].status === 'approved', 'تم اعتماد الخطة');
ok(!R.setSteps('S1|db-03|0', [{ t: 'x', min: 1 }]), 'المعتمدة مقفلة');
ok(!R.remove('S1|db-03|0'), 'لا حذف لمعتمدة');
ok(R.reopen('S1|db-03|0') && R.load().plans['S1|db-03|0'].status === 'edited', 'إعادة الفتح');
R.approve('S1|db-03|0'); R.approve('S2|qr-01|0');
// الذاكرة تبقى بعد إعادة التحميل
R.reset(); d = R.load(); ok(d.plans['S1|db-03|0'].status === 'approved', 'الذاكرة محفوظة في التخزين');
// خطة جديدة بنشاط مختلف بعد عدم التحقق
d.plans['S1|db-03|0'].afterPass = false; R.save();
r = R.send(A, 'db-03', ['S1']); ok(r.made === 1 && R.load().plans['S1|db-03|1'].attempt === 1, 'محاولة علاجية ثانية بعد عدم التحقق');
// الأسماء المعلّقة توقف الوكيل
r = R.send({ tally: { pending: 2 }, rows: A.rows }, 'db-03', ['S3']); ok(!r.ok && /2/.test(r.msg), 'توقف عند أسماء غير محسومة');
r = R.send(A, 'db-03', []); ok(!r.ok, 'لا إرسال بلا تحديد');
// الحد الأقصى للخطط المفتوحة
reset(); const many = { tally: { pending: 0 }, rows: [] }, ids = ['db-01', 'db-02', 'db-03', 'db-04', 'db-05', 'db-06'];
const SM = mkS('M', 'م', {}); ids.forEach(q => many.rows.push(row(q, [{ s: SM, base: false, post: false, tries: 1 }])));
r = R.send(many, 'db-03', ['M']); ok(r.made === R.MAXOPEN && r.deferred === 2, 'حد ' + R.MAXOPEN + ' خطط مفتوحة والباقي مؤجَّل');
ok(R.load().plans['M|db-03|0'], 'الناتج المختار يأتي أولًا');

// 3) التحسّن بحساب يدوي: 4 مقارنات في ناتج a (3 تحققت)، 2 في b (0)، وواحدة بلا نتيجة
const sm = R.summarize([{ qid: 'a', outcome: 'a', afterPass: true }, { qid: 'a', outcome: 'a', afterPass: true }, { qid: 'a', outcome: 'a', afterPass: true }, { qid: 'a', outcome: 'a', afterPass: false }, { qid: 'b', outcome: 'b', afterPass: false }, { qid: 'b', outcome: 'b', afterPass: false }, { qid: 'b', outcome: 'b', afterPass: null }], { target: 90 });
ok(sm.total.n === 6 && sm.total.ok === 3 && sm.total.rate === 50, 'الإجمالي 3 من 6 = 50٪');
const qa = sm.byQ.find(o => o.qid === 'a'), qb = sm.byQ.find(o => o.qid === 'b');
ok(qa.rate === 75 && qb.rate === 0 && qb.waiting === 1, 'نسب الناتجين والانتظار');
ok(qb.recs.some(x => /غيّري أسلوب/.test(x)), 'توصية تغيير الأسلوب عند عدم التحسّن');
ok(sm.recs.some(x => /الارتداد/.test(x)) && sm.recs.some(x => /العدد قليل/.test(x)) && sm.recs.some(x => /التذكّر/.test(x)), 'تنبيهات الارتداد والعدد والتذكّر');
ok(R.summarize([], {}).recs[0].includes('لم تصل'), 'ملخص فارغ');

// 4) مطابقة ملف ما بعد المعالجة وتصحيحه
reset(); R.send(A, 'db-03', ['S1', 'S2']); ['S1|db-03|0', 'S1|qr-01|0', 'S2|db-03|0', 'S2|qr-01|0'].forEach(k => R.approve(k));
const model = { students: [S1, S2, S3] };
R.ingestAfter([['اسم الطالبة', 'الفصل', 'db-03', 'qr-01'], ['سارة أحمد', '3/1', '1', '0'], ['نورة علي', '3/1', 'صح', 'خطأ'], ['هنده محمد', '3/1', '1', '1']], 'after.csv');
let AF = R.computeAfter(model, null);
ok(AF.byId.S1['db-03'] === true && AF.byId.S1['qr-01'] === false && AF.byId.S2['db-03'] === true && AF.byId.S2['qr-01'] === false, 'تصحيح الخلايا');
ok(AF.pending === 1, 'اسم مشابه معلّق (هنده) لا يدخل قبل القرار');
ok(!AF.byId.S3, 'غير المحسوم لا يُحسب');
const pl = R.load().plans; ok(pl['S1|db-03|0'].afterPass === true && pl['S1|qr-01|0'].afterPass === false, 'تُسجَّل النتيجة على الخطط المعتمدة');
R.load().after.decisions[Object.keys(R.load().after.decisions)[0] || 'r4'] = 'S3'; R.save();
AF = R.computeAfter(model, null); ok(AF.pending === 0 && AF.notPlanned === 1, 'بعد القرار: مطابقة ولا خطة معتمدة لها فلا تدخل الحساب');

// 5) دليل المعلم مصدرًا ثانيًا
reset(); R.send(A, 'db-03', ['S1']);
const GD = TB.guideFor('db-06'), gp = R.load().plans['S1|db-03|0'];
ok(GD && GD.notes === 42 && GD.steps[0] === 43 && GD.solutions[1] === 51 && /أساسي/.test(GD.tip), 'دليل المعلم: صفحات درس قواعد البيانات وتنبيه المفتاح الأساسي');
ok(gp.guide && gp.guide.notes === 42 && gp.guide.tip.length > 10, 'الخطة تحمل مرجع دليل المعلم');
ok(TB.guideFor('zz-99') === null, 'لا دليل لناتج غير موجود');
ok(TB.covered.every(q => { const g = TB.guideFor(q); return g && g.notes && g.steps.length === 2 && g.solutions.length === 2; }), 'كل ناتج مغطّى له مرجع في الدليل');
ok(Object.keys(TB.GUIDE.TIPS).every(q => TB.get(q)), 'كل تنبيه مربوط بناتج موجود');
ok(TB.guideTxt(GD).includes('ص42') && TB.guideTxt(null) === '', 'نص المرجع');
ok(Object.values(R.load().plans).every(p => p.steps.length === 3 && p.steps.every(s => !/دليل/.test(s.t))), 'لا أنشطة من الدليل: الخطوات من الكتاب');

console.log('✔ test-remedial: ' + n + ' فحصًا ناجحًا');
