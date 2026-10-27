// اختبارات توافق: مخطط الأحداث لم يتغير + الوكيل لا يعدّل البيانات + عدد الأسئلة ثابت.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
const ctx = { window: {}, document: { createElement() { return {}; } }, localStorage: { getItem() { return null; }, setItem() {} }, sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, console, navigator: {}, addEventListener() {}, removeEventListener() {}, setInterval() { return 0; }, clearInterval() {}, setTimeout, fetch() {}, URL };
ctx.window = ctx; ctx.self = ctx; ctx.MDQ = {}; vm.createContext(ctx);
['js/config.js', 'js/icons.js', 'js/questions.js', 'js/rules.js', 'js/forms.js', 'js/storage.js', 'js/tracker.js', 'js/analytics.js', 'js/agent.js']
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
console.log(`نجح: ${n} اختبارًا`);
