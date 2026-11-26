// اختبارات وحدة دعم الطالبات والأثر المقاس (support.js): التجميع، الخطط، الاعتماد، درجة ما بعد المعالجة، اعتماد الوكيل، الأثر، والعرض
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const store = {};
const ctx = { window: {}, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
ctx.window = ctx; ctx.MDQ = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/support.js'), 'utf8'), ctx);
const S = ctx.MDQ.support; let ok = 0; const t = (n, f) => { try { f(); } catch (e) { e.message = n + ': ' + e.message; throw e; } ok++; };
const stu = (id, base, post) => ({ s: { studentId: id, name: id, className: 'ف1' }, name: id, base, post });
const mk = (qid, per, extra) => { const fail = per.filter(p => !p.post); return Object.assign({ qid, outcome: 'ناتج ' + qid, lesson: 'db', counted: true, n: per.length, per, fail, base: Math.round(per.filter(p => p.base).length / per.length * 100), after: Math.round(per.filter(p => p.post).length / per.length * 100), target: 80 }, extra); };
const per1 = [stu('a', false, false), stu('b', false, false), stu('c', true, false), stu('d', false, true), stu('e', true, true)];
const per2 = [stu('a', false, false), stu('d', false, false), stu('e', false, true), stu('b', true, true), stu('c', true, true)];
const A = { rows: [mk('q1', per1), mk('q2', per2), mk('q3', per1, { counted: false })] };
const reset = () => S.wipe();
t('collect', () => { const C = S.collect(A, 3); assert.strictEqual(C.students.length, 4); assert.strictEqual(C.students[0].id, 'a'); assert.strictEqual(C.groups.length, 1); assert.strictEqual(C.groups[0].qid, 'q1'); assert.strictEqual(C.groups[0].drops, 1); });
t('نسبة الطالبة قبل الخطة (نواتج مقارَنة ومتحققة بعد البعدي)', () => { const C = S.collect(A, 3), by = id => C.students.find(s => s.id === id);
  assert.strictEqual(by('a').compared, 2); assert.strictEqual(by('a').passed, 0); assert.strictEqual(by('a').before, 0);
  assert.strictEqual(by('d').compared, 2); assert.strictEqual(by('d').passed, 1); assert.strictEqual(by('d').before, 50);
  assert.strictEqual(by('b').compared, 2); assert.strictEqual(by('b').before, 50); });
t('غير المحتسب يُستبعد', () => assert(!S.collect(A, 2).outs.q3));
t('اقتراحات', () => { const C = S.collect(A, 3); assert(/فردية/.test(S.suggestStudent(C.students[0]))); assert(/جماعية/.test(S.suggestGroup(C.groups[0]))); });
t('لا أثر قبل الاعتماد', () => { reset(); const C = S.collect(A, 3), I = S.impact(C, S.get()); assert.strictEqual(I.pairs, 0); assert.strictEqual(I.recovery, null); });
t('درجة غير معتمدة (مسودة) لا تدخل الحساب', () => {
  reset(); const st = S.get(); st.plans.a = { status: 'approved' }; st.drafts['a|q1'] = '95'; st.results['a|q2'] = { score: 90 }; S.put(st);   // لا confirmed
  const I = S.impact(S.collect(A, 3), S.get()); assert.strictEqual(I.pairs, 2); assert.strictEqual(I.measured, 0); assert.strictEqual(I.stu[0].after, null); });
t('أثر بعد اعتماد الخطة واعتماد الوكيل للدرجات (الدرجة ≥ حد التحقق)', () => {
  reset(); const st = S.get(); st.plans.a = { status: 'approved' }; st.groups.q1 = { status: 'approved' };
  st.results['a|q1'] = { score: 85, confirmed: true }; st.results['a|q2'] = { score: 60, confirmed: true }; st.results['b|q1'] = { score: 80, confirmed: true }; S.put(st);
  const C = S.collect(A, 3), I = S.impact(C, S.get());
  assert.strictEqual(I.pairs, 4); assert.strictEqual(I.measured, 3); assert.strictEqual(I.won, 2); assert.strictEqual(I.recovery, 67); assert.strictEqual(I.coverage, 75);
  const o1 = I.byOut.find(o => o.qid === 'q1'); assert.strictEqual(o1.post, 40); assert.strictEqual(o1.after, 80); assert.strictEqual(o1.gain, 40);
  assert.strictEqual(o1.closed, 67); assert.strictEqual(o1.hake, 67); assert.strictEqual(o1.roi, 100);
  const o2 = I.byOut.find(o => o.qid === 'q2'); assert.strictEqual(o2.after, o2.post); assert.strictEqual(o2.gain, 0);
  const sa = I.stu.find(s => s.id === 'a'); assert.strictEqual(sa.before, 0); assert.strictEqual(sa.after, 50); assert.strictEqual(sa.delta, 50); assert.strictEqual(sa.score, 50); assert.strictEqual(sa.partial, false);
  assert(sa.plans.some(p => p.type === 'فردية') && sa.plans.some(p => p.type === 'جماعية'));
  const sb = I.stu.find(s => s.id === 'b'); assert.strictEqual(sb.before, 50); assert.strictEqual(sb.after, 100); assert.strictEqual(sb.delta, 50); assert.strictEqual(sb.partial, false);
  const sc = I.stu.find(s => s.id === 'c'); assert.strictEqual(sc.after, null);      // لم تُقَس
  assert.strictEqual(I.studentsMeasured, 2); assert.strictEqual(I.avgBefore, 25); assert.strictEqual(I.avgAfter, 75); assert.strictEqual(I.avgDelta, 50);
  assert.strictEqual(I.detail.length, 3); assert(I.detail.some(d => d.name === 'a' && d.outcome === 'ناتج q2' && d.ok === false)); });
t('قياس جزئي يُعلَّم', () => { reset(); const st = S.get(); st.plans.a = { status: 'approved' }; st.results['a|q1'] = { score: 90, confirmed: true }; S.put(st);
  const sa = S.impact(S.collect(A, 3), S.get()).stu[0]; assert.strictEqual(sa.partial, true); assert.strictEqual(sa.measured, 1); assert.strictEqual(sa.approved, 2); });
t('توافق مع القيم القديمة (تحقق/لم يتحقق v)', () => { reset(); const st = S.get(); st.plans.a = { status: 'approved' }; st.results['a|q1'] = { v: 1 }; st.results['a|q2'] = { v: 0 }; S.put(st);
  const I = S.impact(S.collect(A, 3), S.get()); assert.strictEqual(I.measured, 2); assert.strictEqual(I.won, 1); });
t('غير المعتمدة لا تدخل', () => { reset(); const st = S.get(); st.plans.a = { status: 'rejected' }; st.groups.q1 = { status: 'rejected' }; S.put(st); assert.strictEqual(S.impact(S.collect(A, 3), S.get()).pairs, 0); });
t('حد التحقق = مستهدف الناتج', () => { reset(); const A2 = { rows: [mk('q9', per1, { target: 90 }), mk('q8', per2)] }; const st = S.get(); st.plans.a = { status: 'approved' }; st.results['a|q9'] = { score: 85, confirmed: true }; S.put(st);
  const I = S.impact(S.collect(A2, 3), S.get()); assert.strictEqual(I.won, 0); assert.strictEqual(I.measured, 1); assert.strictEqual(I.detail[0].target, 90); });
t('مسح', () => { S.wipe(); assert.strictEqual(Object.keys(S.get().plans).length, 0); assert.strictEqual(Object.keys(S.get().drafts).length, 0); });
t('العرض: جدولان وأيقونة اعتماد وفئات اللوحة وأقسام الأثر', () => {
  reset(); const esc = x => String(x); let h = S.html(A, {}, {}, esc);
  assert(/class="panel card"/.test(h), 'خلفية اللوحة'); assert(/ما بعد التوصيات: الأثر المقاس/.test(h));
  assert(/<th>اعتماد المعلمة<\/th>/.test(h)); assert(/خطط جماعية مقترحة/.test(h) && /sp-table/.test(h), 'الخطط الجماعية في جدول');
  assert(/class="ap-btn ok/.test(h) && /data-sp="ok"/.test(h) && /بانتظار اعتمادكِ/.test(h), 'أيقونة الاعتماد');
  assert(!/sp-sub/.test(h) && !/data-spd/.test(h), 'لا مربع درجة قبل الاعتماد');
  const st = S.get(); st.plans.a = { status: 'approved' }; st.groups.q1 = { status: 'approved' }; S.put(st);
  h = S.html(A, {}, {}, esc);
  assert(/تم اعتماد الخطة/.test(h) && /is-on/.test(h) && /data-sp="reset"/.test(h), 'حالة تم الاعتماد');
  assert(/data-spd="a\|q1"/.test(h) && /حد التحقق 80/.test(h), 'مربع الدرجة بعد الاعتماد'); assert(/اعتماد الدرجات \(الوكيل\)/.test(h));
  assert(/لم تُرسَل أي درجة بعد/.test(h));
  const st2 = S.get(); st2.results['a|q1'] = { score: 88, confirmed: true }; st2.results['b|q1'] = { score: 70, confirmed: true }; S.put(st2);
  h = S.html(A, {}, {}, esc);
  assert(/<th>نسبتها قبل الخطة<\/th><th>الخطة المعتمدة<\/th><th>نسبتها بعد الخطة<\/th>/.test(h), 'أعمدة جدول الأثر'); assert(/اعتمد الوكيل الدرجة/.test(h)); assert(/قياس جزئي/.test(h)); });
t('الكتاب: تغطية كل الأسئلة وصحة النطاقات', () => {
  const c2 = { window: {}, MDQ: {} }; c2.window = c2; vm.createContext(c2);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/textbook.js'), 'utf8'), c2);
  const TB = c2.MDQ.textbook; assert(TB && TB.BY, 'textbook');
  const keys = Object.keys(TB.BY); assert(keys.length >= 28, 'عدد المدخلات ' + keys.length);
  keys.forEach(k => { const e = TB.get(k); assert(e && e.file && e.pages && e.pages.length, k + ' بلا صفحات'); const L = TB.LESSONS[e.file]; assert(L, k + ' درس غير معروف');
    e.pages.forEach(p => assert(Object.values(TB.LESSONS).some(x => p >= x.pages[0] && p <= x.pages[1]), k + ' صفحة خارج نطاق الدرس ' + p)); assert(TB.act(e), k + ' بلا نشاط'); assert(/ص\d/.test(TB.pg(e)), k + ' ترقيم'); });
  assert.strictEqual(TB.get('zz-99') || null, null); });
t('الخطط تذكر الكتاب (ص وتدريب) مع احتياطي عند غيابه', () => {
  const c3 = { window: {}, localStorage: ctx.localStorage, MDQ: {} }; c3.window = c3; vm.createContext(c3);
  ['textbook.js', 'support.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/' + f), 'utf8'), c3));
  const S3 = c3.MDQ.support, k = Object.keys(c3.MDQ.textbook.BY)[0];
  const mk2 = q => { const per = [stu('a', false, false), stu('b', false, false), stu('c', false, false)]; return { rows: [mk(q, per)] }; };
  const C = S3.collect(mk2(k), 3); assert(/ص\d/.test(S3.suggestStudent(C.students[0])) && /تدريب|نشاط/.test(S3.suggestStudent(C.students[0])));
  assert(/ص\d/.test(S3.suggestGroup(C.groups[0])));
  const C2 = S3.collect(mk2('zz-99'), 3); assert(S3.suggestStudent(C2.students[0]).length > 20); });
t('تعذّر localStorage: الاعتماد يعمل من الذاكرة', () => {
  const c4 = { window: {}, MDQ: {}, localStorage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } } }; c4.window = c4; vm.createContext(c4);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/support.js'), 'utf8'), c4); const S4 = c4.MDQ.support;
  const st = S4.get(); st.plans.a = { status: 'approved' }; S4.put(st); assert.strictEqual(S4.get().plans.a.status, 'approved');
  const h = S4.html(A, {}, {}, x => String(x)); assert(/data-spd="a\|q1"/.test(h) && /data-spd="a\|q2"/.test(h), 'مربع درجة لكل ناتج أخفقت فيه'); });
t('الوكيل الفرعي: مستوى الدعم والذاكرة وبطاقة التعريف', () => {
  reset(); const C = S.collect(A, 3), a = C.students.find(s => s.id === 'a');
  assert.strictEqual(S.levelOf(a).k, 'int');   // نسبتها قبل الخطة 0٪ ≤ 25٪ → مكثف
}); 
t('الذاكرة: درجة معتمدة لم تتحقق تغيّر الخطة، والمتحققة تُراجَع بتباعد', () => {
  reset(); const C = S.collect(A, 3), a = C.students.find(s => s.id === 'a');
  const mem = { a: { hist: [{ q: 'q1', score: 50, won: false }, { q: 'q2', score: 90, won: true }] } };
  const txt = S.suggestStudent(a, mem); assert(/سبقت معالجته ولم يتحقق \(50٪\)/.test(txt), 'تعثر سابق'); assert(/تحقق بعد معالجة سابقة \(90٪\)/.test(txt), 'تحقق سابق');
  assert(!/سبقت معالجته/.test(S.suggestStudent(a, {})), 'بلا ذاكرة');
  assert(/سبقت معالجتهن/.test(S.suggestGroup(C.groups[0], mem)), 'جماعية'); });
t('اعتماد الوكيل يملأ الذاكرة والمستوى، وتظهر البطاقة وشارة المستوى', () => {
  reset(); const st = S.get(); st.plans.a = { status: 'approved' }; st.results = {}; st.drafts['a|q1'] = '40'; S.put(st);
  let h = S.html(A, {}, {}, x => String(x)); assert(/class="sp-agent"/.test(h) && /<dt>الذاكرة<\/dt>/.test(h) && /sp-lv-int/.test(h) && /دعم مكثف/.test(h)); });
t('جدول الخطط الفردية: أعمدة وصف لكل (طالبة × ناتج) ونسبة الإخفاق', () => {
  reset(); const h = S.html(A, {}, {}, x => String(x)), C = S.collect(A, 3), total = C.students.reduce((n, s) => n + s.items.length, 0);
  assert(/<th>الطالبة<\/th><th>الناتج المخفقة فيه<\/th><th>نسبة الإخفاق<\/th><th>الخطة العلاجية<\/th><th>اعتماد<\/th><th>درجة بعد تنفيذ الخطة<\/th><th>إرسال<\/th>/.test(h));
  assert.strictEqual((h.match(/data-spi-row=/g) || []).length, total); assert(/60٪/.test(h), 'نسبة إخفاق q1 = 3 من 5'); assert(/disabled/.test(h) && /اعتمدي الخطة أولًا/.test(h)); });
t('اعتماد خطة صف واحد يفتح ذلك الناتج فقط، والإرسال يُدرج في جدول الأثر بمستوى تحسن وتوصية', () => {
  reset(); let st = S.get(); st.ip['a|q1'] = { status: 'approved' }; S.put(st);
  const C = S.collect(A, 3), I0 = S.impact(C, S.get()); assert.strictEqual(I0.pairs, 1);
  let h = S.html(A, {}, {}, x => String(x)); assert(/data-spd="a\|q1"/.test(h) && !/data-spd="a\|q2"/.test(h) && /data-sp="send"/.test(h));
  st = S.get(); st.results['a|q1'] = { score: 70, confirmed: true }; S.put(st);
  const I = S.impact(C, S.get()); assert.strictEqual(I.detail.length, 1); assert.strictEqual(I.detail[0].level.k, 'mid');
  h = S.html(A, {}, {}, x => String(x)); assert(/<th>الطالبة<\/th><th>الناتج<\/th><th>مستوى التحسن<\/th><th>التوصيات<\/th>/.test(h)); assert(/تحسّن جزئي/.test(h)); assert(/أُدرجت/.test(h));
  st = S.get(); st.ip['b|q1'] = { status: 'approved' }; st.results['b|q1'] = { score: 85, confirmed: true }; st.ip['c|q1'] = { status: 'approved' }; st.results['c|q1'] = { score: 30, confirmed: true }; S.put(st);
  const D = S.impact(C, S.get()).detail; assert.strictEqual(D.map(d => d.level.k).sort().join(), 'low,mid,ok'); });
console.log('نجح: ' + ok + ' اختبارًا');
