// اختبارات توافق: مخطط الأحداث لم يتغير + الوكيل لا يعدّل البيانات + عدد الأسئلة ثابت.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
const ctx = { window: {}, document: { createElement() { return {}; } }, localStorage: (() => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } }; })(), sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, console, navigator: {}, addEventListener() {}, removeEventListener() {}, setInterval() { return 0; }, clearInterval() {}, setTimeout, fetch() {}, URL };
ctx.window = ctx; ctx.self = ctx; ctx.MDQ = {}; vm.createContext(ctx);
['js/config.js', 'js/icons.js', 'js/questions.js', 'js/rules.js', 'js/forms.js', 'js/storage.js', 'js/tracker.js', 'js/analytics.js', 'js/agent.js', 'js/outcomes.js', 'js/goals.js']
  .forEach(f => { try { vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); } catch (e) { console.log('تحذير تحميل', f, e.message.slice(0, 80)); } });
const M = ctx.MDQ; let n = 0; const ok = (c, m) => { assert(c, m); n++; };
ok(M.bank && M.bank.QUESTIONS.length === 37, 'عدد الأسئلة 37');
ok(M.bank.LESSONS.length === 4, '4 دروس');
ok(M.forms.FIELDS.length === 20, '20 عمودًا في المخطط');
ok(M.forms.FIELDS[1][0] === 'type' && M.forms.FIELDS[19][0] === 'studentCode', 'ترتيب الأعمدة ثابت');
ok(M.analytics && typeof M.analytics.build === 'function', 'التحليلات موجودة');
ok(M.agent && typeof M.agent.run === 'function', 'الوكيل موجود');
// الوكيل لا يعدّل المدخلات
const ev = [], t0 = '2026-01-01T10:00:00.000Z';
const mk = (type, extra) => Object.assign({ eventId: 'e' + ev.length, type, studentId: 'ST-AAAAAA', studentName: 'طالبة اختبار', className: '1/1', sessionId: 'S1', lessonId: 'cyber', clientTime: t0 }, extra);
ev.push(mk('stage_start'));
M.bank.QUESTIONS.filter(q => q.lesson === 'cyber').slice(0, 6).forEach(q => ev.push(mk('attempt', { questionId: q.id, concept: q.concept, isCorrect: true, attemptNo: 1, xp: 10, choice: q.answer, questionDone: 'مكتمل' })));
const before = JSON.stringify(ev);
const model = M.analytics.build(ev, [], {});
const res = M.agent.run(model, { duplicates: 0 });
ok(JSON.stringify(ev) === before, 'الوكيل لا يعدّل الأحداث');
ok(res.tiers.order.length === 4 && Array.isArray(res.paths), 'مخرجات الوكيل سليمة');
ok(!/ST-AAAAAA|طالبة اختبار/.test(M.agent.pseudoSummary(model)), 'الملخص مجهَّل الهوية');
const O = M.outcomes.ROWS;
ok(O.length === 32, '32 ناتجًا في مصفوفة القياس');
ok(O.filter(r => r.qid).length === 29 && O.filter(r => !r.qid).length === 3, '29 مرتبطًا و3 بلا سؤال');
ok(O.filter(r => r.qid).every(r => M.bank.question(r.qid) && M.bank.question(r.qid).lesson === r.lesson), 'كل qid موجود في نفس الدرس');
const oc = M.outcomes.compute(model); const o1 = oc.find(r => r.qid === M.bank.QUESTIONS.filter(q => q.lesson === 'cyber')[0].id);
ok(o1.n === 1 && o1.pct[0] === 100 && o1.failAll.length === 0, 'حساب التحقق للمحاولة الأولى');
ok(typeof M.agent.auditCsv === 'function' && M.agent.decide.length >= 4, 'سجل القرارات يحفظ لقطة');
// ---- وكيل الأهداف: سيناريوهات اصطناعية ----
const G = M.goals, qd = M.bank.question('db-04'), wrongKey = ['a', 'b', 'c', 'd'].find(k => k !== qd.answer);
let eid = 0; const T0 = Date.parse('2026-02-01T08:00:00Z');
const E = (sid, name, cls, o) => Object.assign({ eventId: 'x' + (eid++), type: 'attempt', studentId: sid, studentName: name, className: cls, sessionId: 'S' + sid, lessonId: 'db', questionId: 'db-04', concept: qd.concept, clientTime: new Date(T0 + eid * 1000).toISOString() }, o);
const mkModel = (spec, mutate) => { const ev = []; spec.forEach((x, i) => { const sid = 'ST-' + String(i).padStart(6, '0'); ev.push(E(sid, x.name || 'طالبة ' + i, x.cls || '3/1', { type: 'stage_start' }));
  x.tries.forEach((c, j) => ev.push(E(sid, x.name || 'طالبة ' + i, x.cls || '3/1', { isCorrect: c, attemptNo: j + 1, choice: c ? qd.answer : wrongKey, durationSec: x.dur == null ? 15 : x.dur }))); });
  return M.analytics.build(ev, [], {}); };
ok(G.normCls('3///2') === '3/2' && G.normCls('ثالث/1') === '3/1' && G.normCls('ثالث/واحد') === '3/1' && G.normCls('31') === '3/1' && G.normCls('1/3') === '1/3', 'توحيد صيغ الفصول الشائعة دون عكس الترتيب');
ok(G.normCls('٣/٣') === '3/3' && G.normCls('3\\3') === '3/3', 'توحيد أسماء الفصول');
// أ) تعثر يُحلّ بالتلميح: يجب أن يتوقف الوكيل ويسأل (تعادل) ولا يقدّم خطة
const spec1 = Array.from({ length: 12 }, (_, i) => ({ cls: i % 2 ? '٣/١' : '3/1', tries: i < 9 ? [false, true] : [true] }));
const m1 = mkModel(spec1); const g1 = { id: 'g1', createdAt: new Date(T0 - 1e6).toISOString(), qid: 'db-04', outcome: 'x', cls: '3/1', metric: 'first', target: 80, answers: {}, cycles: [], baseline: { pct: 25, n: 12 } };
const d1 = G.diagnose(m1, g1);
ok(d1.n === 12, 'الفصل ٣/١ و 3/1 دُمجا في نطاق واحد');
ok(d1.causes.length >= 1 && d1.clarify.some(c => c.id === 'tie' && c.blocking), 'تعادل الأسباب: يتوقف ويسأل');
// بعد جواب المعلمة يقدّم خطة من محتوى الدروس
g1.answers.tie = 'hint'; g1.answers.devices = 'no';
const d1b = G.diagnose(m1, g1), st1 = G.planStep(g1, d1b);
ok(st1 && st1.cause === 'hint' && st1.actions.some(a => a.includes(qd.hint1)), 'الخطة تستشهد بتلميحات الدرس القائمة');
// ب) نقر عشوائي
const spec2 = Array.from({ length: 12 }, () => ({ tries: [false, false, false, true], dur: 1 }));
const d2 = G.diagnose(mkModel(spec2), Object.assign({}, g1, { answers: { devices: 'no' } }));
ok(d2.causes.some(c => c.key === 'random'), 'يشخّص النقر العشوائي من الزمن');
// ج) اسم مكرر: توقف
const spec3 = spec1.map((x, i) => i < 2 ? Object.assign({}, x, { name: 'مكررة' }) : x);
const d3 = G.diagnose(mkModel(spec3), Object.assign({}, g1, { answers: {} }));
ok(d3.clarify.some(c => c.id.startsWith('dupes:') && c.blocking), 'اسمان متطابقان: يسأل ولا يفترض');
// د) دورة المراجعة: لا تحسن ← يجرّب سببًا آخر
const goal = G.create(m1, { qid: 'db-04', outcome: 'x', cls: '3/1', metric: 'first', target: 95 }); goal.answers = { tie: 'hint', devices: 'no' }; G.update(goal);
const v = G.review(goal, m1, true), gAfter = G.list().find(x => x.id === goal.id);
ok(v === 'no' && gAfter.cycles.length === 1, 'مراجعة بلا تحسن تُسجَّل كفشل للسبب');
const stNext = G.planStep(gAfter, G.diagnose(m1, gAfter));
ok(!stNext || stNext.exhausted || stNext.cause !== 'hint', 'يغيّر الوكيل مساره بعد عدم التحسن');
// هـ) الاعتماد يتطلب قائمة تحقق بشرية كاملة
const mt = G.addMaterial(goal.id, 'بطاقة', 'نص');
ok(G.approveMaterial(mt, [true, true, false]) === false && G.mats()[0].status === 'مسودة', 'لا اعتماد بلا مراجعة بشرية كاملة');
ok(G.approveMaterial(mt, [true, true, true]) === true, 'الاعتماد بعد المراجعة');
ok(!/ST-0000|طالبة 0/.test(G.promptPack(goal, st1)), 'موجّه النموذج اللغوي بلا بيانات طالبات');
console.log(`نجح: ${n} اختبارًا`);
