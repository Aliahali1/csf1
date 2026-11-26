// اختبارات وحدة دعم الطالبات والأثر المقاس (support.js): التجميع، الخطط، الاعتماد، الأثر، مع بيانات مصطنعة
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const store = {};
const ctx = { window: {}, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
ctx.window = ctx; ctx.MDQ = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/support.js'), 'utf8'), ctx);
const S = ctx.MDQ.support; let ok = 0; const t = (n, f) => { f(); ok++; };
const stu = (id, base, post) => ({ s: { studentId: id, name: id, className: 'ف1' }, name: id, base, post });
const mk = (qid, per, extra) => { const fail = per.filter(p => !p.post); return Object.assign({ qid, outcome: 'ناتج ' + qid, lesson: 'db', counted: true, n: per.length, fail, base: Math.round(per.filter(p => p.base).length / per.length * 100), after: Math.round(per.filter(p => p.post).length / per.length * 100), target: 80 }, extra); };
const per1 = [stu('a', false, false), stu('b', false, false), stu('c', true, false), stu('d', false, true), stu('e', true, true)];
const per2 = [stu('a', false, false), stu('d', false, false), stu('e', false, true), stu('b', true, true), stu('c', true, true)];
const A = { rows: [mk('q1', per1), mk('q2', per2), mk('q3', per1, { counted: false })] };
t('collect', () => { const C = S.collect(A, 3); assert.strictEqual(C.students.length, 4); assert.strictEqual(C.students[0].id, 'a'); assert.strictEqual(C.groups.length, 1); assert.strictEqual(C.groups[0].qid, 'q1'); assert.strictEqual(C.groups[0].drops, 1); });
t('غير المحتسب يُستبعد', () => assert(!S.collect(A, 2).outs.q3));
t('اقتراحات', () => { const C = S.collect(A, 3); assert(/فردية/.test(S.suggestStudent(C.students[0]))); assert(/جماعية/.test(S.suggestGroup(C.groups[0]))); });
t('لا أثر قبل الاعتماد', () => { const C = S.collect(A, 3), I = S.impact(C, S.get()); assert.strictEqual(I.pairs, 0); assert.strictEqual(I.recovery, null); });
t('أثر بعد الاعتماد والقياس', () => {
  const st = S.get(); st.plans.a = { status: 'approved' }; st.groups.q1 = { status: 'approved' };
  st.results['a|q1'] = { v: 1 }; st.results['a|q2'] = { v: 0 }; st.results['b|q1'] = { v: 1 }; S.put(st);
  const C = S.collect(A, 3), I = S.impact(C, S.get());
  assert.strictEqual(I.pairs, 4); // a: q1,q2 ؛ جماعية q1: a,b,c (a مكرر)
  assert.strictEqual(I.measured, 3); assert.strictEqual(I.won, 2); assert.strictEqual(I.recovery, 67); assert.strictEqual(I.coverage, 75);
  const o1 = I.byOut.find(o => o.qid === 'q1'); assert.strictEqual(o1.post, 40); assert.strictEqual(o1.after, 80); assert.strictEqual(o1.gain, 40);
  assert.strictEqual(o1.closed, 67); assert.strictEqual(o1.hake, 67); assert.strictEqual(o1.roi, 100);
  const o2 = I.byOut.find(o => o.qid === 'q2'); assert.strictEqual(o2.after, o2.post); assert.strictEqual(o2.gain, 0);
  assert.strictEqual(I.stu.find(s => s.id === 'a').score, 50); assert.strictEqual(I.studentsFull, 1);
});
t('غير المعتمدة لا تدخل', () => { const st = S.get(); st.plans.a = { status: 'rejected' }; st.groups.q1 = { status: 'rejected' }; S.put(st); assert.strictEqual(S.impact(S.collect(A, 3), S.get()).pairs, 0); });
t('مسح', () => { S.wipe(); assert.strictEqual(Object.keys(S.get().plans).length, 0); });
t('html يعمل دون أخطاء', () => { const esc = x => String(x); const h = S.html(A, {}, {}, esc); assert(/ما بعد التوصيات: الأثر المقاس/.test(h)); assert(/ما درجة الطالبة بعد المعالجة/.test(h)); });
console.log('نجح: ' + ok + ' اختبارًا');
