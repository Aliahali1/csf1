// اختبارات وكيل الأهداف: مطابقة أعمدة الاختبار البعدي (الصياغتان) + تكافؤ الصياغة + القرارات + الإيقاف والمسح + حالات حدّية.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..');
const store = {};
const ctx = { window: {}, document: { createElement() { return {}; } }, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, console, navigator: {}, addEventListener() {}, removeEventListener() {}, setInterval() { return 0; }, clearInterval() {}, setTimeout, fetch() {}, URL };
ctx.window = ctx; ctx.self = ctx; ctx.MDQ = {}; vm.createContext(ctx);
['js/config.js', 'js/icons.js', 'js/questions.js', 'js/rules.js', 'js/forms.js', 'js/storage.js', 'js/tracker.js', 'js/analytics.js', 'js/agent.js', 'js/outcomes.js', 'js/goals.js', 'js/agent-std.js', 'js/post-wording.js', 'js/post.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const M = ctx.MDQ; let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const PW = M.postWording, qids = Object.keys(PW);
ok(qids.length === 24 && M.postQids === undefined && M.post.postQids().length === 24, '24 ناتجًا بصياغة معادة');
ok(qids.every(q => M.bank.question(q)), 'كل qid في الصياغات موجود في بنك الموقع');
// جدول: صياغات معادة، مع عمود نقاط لكل سؤال
const mkTable = (useReworded, opt) => {
  opt = opt || {}; const H = ['إجمالي النقاط', 'اسم الطالبة', 'الفصل'], cols = [];
  qids.forEach(q => { const t = useReworded ? PW[q][0] : M.bank.question(q).text; cols.push(q); H.push(t); if (!(opt.noPts || []).includes(q)) H.push('النقاط - ' + t); });
  const row = (name, cls, v) => { const r = ['', name, cls]; qids.forEach(q => { r.push(''); if (!(opt.noPts || []).includes(q)) r.push(v(q)); }); return r; };
  return { H, row };
};
// 1) الصياغة المعادة تُطابَق وكذلك الأصلية
let T = mkTable(true); let set = M.post.ingest([T.H, T.row('أ ب', '3/1', () => '1')], 'r.xlsx');
ok(set.items.length === 24 && set.items.every(i => i.via === 'reworded'), 'مطابقة الصياغة المعادة 24/24');
ok(set.wordingVersion && set.wordingHash.length === 8, 'تُسجَّل نسخة وبصمة جدول الصياغات');
T = mkTable(false); set = M.post.ingest([T.H, T.row('أ ب', '3/1', () => '1')], 'o.xlsx');
ok(set.items.length === 24 && set.items.every(i => i.via === 'original'), 'مطابقة الصياغة الأصلية 24/24');
// 2) عمود نقاط ناقص يُبلَّغ عنه ولا يُحلَّل
T = mkTable(true, { noPts: ['cy-01'] }); set = M.post.ingest([T.H, T.row('أ ب', '3/1', () => '1')], 'n.xlsx');
ok(set.items.length === 23 && set.noPts.includes('cy-01'), 'سؤال بلا عمود نقاط يُبلَّغ عنه');
// 3) عمود غير معروف
T = mkTable(true); T.H.push('سؤال لا علاقة له بالمنهج إطلاقًا هنا', 'النقاط - سؤال لا علاقة له بالمنهج إطلاقًا هنا');
set = M.post.ingest([T.H, T.row('أ ب', '3/1', () => '1').concat(['x', '1'])], 'u.xlsx');
ok(set.unmapped.length === 1 && set.items.length === 24, 'عمود غير مطابق يُسجَّل في unmapped');
// 4) ملف بلا اسم
let threw = false; try { M.post.ingest([['إجمالي النقاط', 'درجة'], ['1', '2']], 'bad.xlsx'); } catch (e) { threw = true; } ok(threw, 'ملف بلا عمود اسم يُرفض برسالة');
// 5) تحليل: نموذج اصطناعي
const q0 = qids[0], qd = M.bank.question(q0); let eid = 0;
const ev = []; const mkS = (i, name, cls, correct) => { const sid = 'ST-' + String(i).padStart(6, '0'); const E = o => Object.assign({ eventId: 'x' + (eid++), studentId: sid, studentName: name, className: cls, sessionId: 'S' + i, lessonId: qd.lesson, clientTime: new Date(Date.parse('2026-10-01T08:00:00Z') + eid * 1000).toISOString() }, o);
  ev.push(E({ type: 'stage_start' })); qids.forEach(q => ev.push(E({ type: 'attempt', questionId: q, isCorrect: correct, attemptNo: 1, choice: M.bank.question(q).answer, lessonId: M.bank.question(q).lesson, durationSec: 10 }))); };
const names = []; for (let i = 0; i < 12; i++) { names.push('طالبة رقم ' + i + ' اختبار'); mkS(i, names[i], i < 6 ? '3/1' : '3/2', i % 3 !== 0); }
const model = M.analytics.build(ev, [], {});
T = mkTable(true);
const rows = names.map((nm, i) => T.row(nm, i < 6 ? '3/1' : '3/2', () => '1'));
rows.push(T.row('', '3/1', () => '1')); rows.push(T.row(names[0], '3/1', () => '1')); // صف بلا اسم + اسم مكرر
set = M.post.ingest([T.H].concat(rows), 'full.xlsx');
let A = M.post.analyze(set, model, []);
ok(A.tally.empty === 1, 'صف بلا اسم يُعدّ ولا يُحلَّل');
ok(A.tally.pending >= 2, 'الاسم المكرر يتوقف عنده الوكيل (صفّان لطالبة واحدة)');
ok(A.rows.every(r => r.reworded && !r.counted), 'الناتج بصياغة معادة غير مراجَعة لا يدخل الخلاصة');
ok(A.rows.every(r => r.recs[0].includes('تكافؤ')), 'توصية تطلب قرار التكافؤ');
// يرتفع: نقرّر تكافؤ ناتج
M.std.setEquiv(q0, 'same', 'اختبار'); A = M.post.analyze(set, model, []); ok(A.rows.find(r => r.qid === q0).counted, 'بعد قرار «مكافئة» يُحتسب');
M.std.setEquiv(q0, 'major', ''); A = M.post.analyze(set, model, []); ok(!A.rows.find(r => r.qid === q0).counted, '«تختلف جوهريًا» تُخرجه من الخلاصة');
M.std.setEquiv(q0, '', ''); ok(M.std.getEquiv(q0) === null, 'إلغاء القرار');
// الصياغة الأصلية تُحتسب دون قرار
T = mkTable(false); set = M.post.ingest([T.H].concat(names.map((nm, i) => T.row(nm, '3/1', () => '1'))), 'o2.xlsx'); A = M.post.analyze(set, model, []);
ok(A.rows.every(r => r.counted && !r.reworded), 'الصياغة الأصلية تُحتسب دون قرار تكافؤ');
// 6) قرار المعلمة + إيقاف + مسح
M.std.setDecision(q0, 'ok', set); ok(M.std.getDecision(q0).d === 'ok', 'قرار المعلمة محفوظ'); ok(!!M.std.getDecision(q0).at, 'القرار يحمل وقته');
ok(!M.std.stopped(), 'غير موقوف'); M.std.stop('t'); ok(M.std.stopped(), 'الإيقاف'); M.std.resume(); ok(!M.std.stopped(), 'الاستئناف');
M.std.wipe(); ok(M.post.getSet() === null && M.std.getDecision(q0) === null && M.goals.list().length === 0, 'مسح البيانات يزيل الملف والقرارات');
// 7) البطاقة
const html = M.std.cardHTML(x => String(x)); ok(/الاستقلالية/.test(html) && /يُمنع/.test(html) && /سجل التغييرات/.test(html), 'البطاقة تحوي التصنيف والتفويض وسجل التغييرات');
// 8) الصياغة المعادة لا تكشف تغيير أسئلة الموقع
ok(M.bank.QUESTIONS.length === 37, 'أسئلة الموقع لم تتغير');
console.log('نجح:', n, 'اختبارًا');
