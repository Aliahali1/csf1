const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.join(__dirname, '..'), store = {};
const ctx = { window: {}, document: { createElement() { return {}; } }, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } }, sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, console, navigator: {}, addEventListener() {}, removeEventListener() {}, setInterval() { return 0; }, clearInterval() {}, setTimeout, fetch() {}, URL };
ctx.window = ctx; ctx.self = ctx; ctx.MDQ = {}; vm.createContext(ctx);
['js/config.js', 'js/icons.js', 'js/questions.js', 'js/rules.js', 'js/forms.js', 'js/storage.js', 'js/tracker.js', 'js/analytics.js', 'js/agent.js', 'js/outcomes.js', 'js/goals.js', 'js/agent-std.js', 'js/post-wording.js', 'js/post.js', 'js/calibration.js', 'js/consistency.js', 'js/remedial-data.js', 'js/distractors.js', 'js/loop.js', 'js/remedial.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
let n = 0;
const ok = (c, m) => { assert(c, m); n++; }, near = (a, b, e, m) => ok(Math.abs(a - b) <= (e || 1e-9), `${m}: ${a} ≠ ${b}`);
const esc = s => String(s == null ? '' : s);

const L = ctx.MDQ.loop, R = ctx.MDQ.remedial, D = ctx.MDQ.distractors, B = ctx.MDQ.bank;
const reset = () => { Object.keys(store).forEach(k => delete store[k]); R.reset(); };
const def = B.question('db-03'), wrongKeys = def.options.map(o => o.k).filter(k => k !== def.answer);
const mkS = (id, name, att) => ({ studentId: id, name, className: '3/1', q: new Map(Object.entries(att).map(([q, a]) => [q, { attempts: a.map((c, i) => ({ isCorrect: c === def.answer || c === true, choice: typeof c === 'string' ? c : '', clientTime: '2026-01-0' + (i + 1) })) }])) });
const S1 = mkS('S1', 'سارة أحمد', { 'db-03': [wrongKeys[0], wrongKeys[1], def.answer] }), S2 = mkS('S2', 'نورة علي', { 'db-03': [wrongKeys[0], def.answer] }), S3 = mkS('S3', 'هند محمد', { 'db-03': [def.answer] }), S4 = mkS('S4', 'ريم خالد', { 'db-03': [wrongKeys[0], def.answer] });
const row = per => ({ qid: 'db-03', outcome: 'ناتج db-03', lesson: 'db', counted: true, per });
const mkA = (post1) => ({ tally: { pending: 0 }, rows: [row([{ s: S1, base: false, post: post1, tries: 3 }, { s: S2, base: false, post: false, tries: 2 }, { s: S3, base: true, post: true, tries: 1 }, { s: S4, base: false, post: false, tries: 2 }])] });
const A = mkA(false);

// 1) تحليل المشتتات: من اللعبة وحدها
const an = D.analyze([S1, S2, S3, S4], 'db-03', def);
ok(an.tested === 4 && an.wrongStu === 3 && an.list[0].key === wrongKeys[0] && an.list[0].n === 3 && an.list[0].share === 100, 'الخيار الخاطئ الأكثر اختيارًا');
ok(an.list[1].key === wrongKeys[1] && an.list[1].n === 1 && an.reliable && an.dominant, 'الخيار الثاني، والنمط موثوق (3 طالبات) وغالب');
ok(!D.analyze([S1, S3], 'db-03', def).reliable && /أقل من/.test(D.analyze([S1, S3], 'db-03', def).note), 'أقل من 3 طالبات: لا يُعتدّ بالنمط');
const fs1 = D.forStudent([S1, S2, S3, S4], S1, 'db-03', def); ok(fs1.usable && fs1.mine === wrongKeys[0] && fs1.mineText === def.options.find(o => o.k === wrongKeys[0]).text, 'خيار الطالبة نفسه ونصه من مفتاح السؤال');
ok(!D.forStudent([S3], S3, 'db-03', def).usable, 'طالبة لم تخطئ: لا خيار');
ok(D.html([S1, S2, S3, S4], ['db-03'], esc).includes('تحليل المشتتات') && D.html([S3], ['db-03'], esc) === '', 'العرض');

// 2) مكتبة الاستراتيجيات: كل خطوة من الكتاب أو من بيانات الطالبة
reset(); let r = R.send(A, 'db-03', ['S1']); let d = R.load();
let p0 = d.plans['S1|db-03|0']; ok(r.ok && p0 && p0.strategy === 'book', 'الدورة الأولى بأسلوب الكتاب (ترتيب المكتبة عند غياب الأدلة)');
ok(/أول دورة/.test(p0.rationale) && /لا أدلة كافية/.test(p0.rationale), 'المسوّغ مكتوب ويذكر غياب الأدلة');
ok(p0.steps.length === 3 && p0.steps.reduce((s, x) => s + x.min, 0) === 15, 'خطة 3 خطوات في 15 دقيقة');
ok(p0.diagnosis.startsWith('احتمال') && p0.diagnosis.includes(fs1.mineText), 'التشخيص احتمالي ويذكر الخيار المختار');
ok(L.episode('S1', 'db-03').cycles.length === 1 && L.episode('S1', 'db-03').status === 'open', 'فُتحت حلقة بدورة واحدة');
ok(p0.status === 'draft', 'مسودة: لا اعتماد تلقائيًا');

// 3) الدورة الثانية بأسلوب جديد بعد عدم التحقق
R.approve(p0.key); d = R.load(); d.plans[p0.key].afterPass = false; R.save();
r = R.send(A, 'db-03', ['S1']); d = R.load(); const p1 = d.plans['S1|db-03|1'];
ok(r.made === 1 && p1 && p1.strategy !== 'book' && /جُرّب سابقًا: مراجعة الكتاب/.test(p1.rationale), 'أسلوب جديد وليس المكرر مع ذكر المجرَّب سابقًا');
ok(p1.strategy === 'distractor' && p1.steps[0].t.includes(fs1.mineText), 'الأسلوب الثاني يواجه الخيار الخاطئ الذي اختارته');
ok(L.episode('S1', 'db-03').cycles.length === 2 && L.episode('S1', 'db-03').cycles[0].result === false, 'نتيجة الدورة الأولى سُجّلت في الحلقة');
ok(L.stat('concept', 'book').t + L.stat('procedure', 'book').t === 1, 'ذاكرة الأساليب سجّلت المحاولة الفاشلة');

// 4) الدورة الثالثة ثم الإحالة بعد الحد الأقصى
R.approve(p1.key); R.load().plans[p1.key].afterPass = false; R.save();
r = R.send(A, 'db-03', ['S1']); const p2 = R.load().plans['S1|db-03|2'];
ok(p2 && !['book', 'distractor'].includes(p2.strategy), 'الدورة الثالثة بأسلوب غير المجرَّبين');
R.approve(p2.key); R.load().plans[p2.key].afterPass = false; R.save();
const nPlans = Object.keys(R.load().plans).length; r = R.send(A, 'db-03', ['S1']);
ok(r.made === 0 && r.referred >= 1 && Object.keys(R.load().plans).length === nPlans, 'بعد 3 دورات فاشلة لا خطة جديدة');
ok(L.episode('S1', 'db-03').status === 'referred' && /الحد الأقصى/.test(L.episode('S1', 'db-03').reason), 'الحالة أُحيلت إلى المعلمة بسبب مكتوب');
ok(L.blocked('S1', 'db-03') === 'referred', 'الحلقة مقفلة أمام خطة رابعة');

// 5) النجاح يغلق الحلقة ويغذّي الذاكرة
r = R.send(A, 'db-03', ['S2']); const q0 = R.load().plans['S2|db-03|0']; R.approve(q0.key); R.load().plans[q0.key].afterPass = true; R.save();
const ob = L.observe(Object.values(R.load().plans)); ok(ob.mastered === 1 && L.episode('S2', 'db-03').status === 'mastered', 'تحققت: أُغلقت الحلقة');
ok(L.observe(Object.values(R.load().plans)).updated === 0, 'القراءة لا تُضاعف النتائج عند التكرار');
const stK = L.stat(q0.kind, 'book'); ok(stK.t >= 1 && stK.s >= 1, 'نجاح الأسلوب سُجّل في الذاكرة');
r = R.send(A, 'db-03', ['S2']); ok(r.made === 0, 'طالبة تحققت لا تُنشأ لها خطة جديدة');

// 6) الاختيار يتكيّف مع الأدلة: بعد 3 محاولات فأكثر
reset(); let m = L.load(); const kind = R.kindOf('db-03') === 'procedure' ? 'procedure' : 'concept';
m.strat[kind].distractor = { t: 2, s: 2 }; L.save(); r = R.send(A, 'db-03', ['S4']); ok(R.load().plans['S4|db-03|0'].strategy === 'book', 'دون 3 محاولات لا يُعتدّ بالذاكرة (ترتيب المكتبة)');
reset(); m = L.load(); m.strat[kind].distractor = { t: 4, s: 4 }; m.strat[kind].book = { t: 4, s: 1 }; L.save(); r = R.send(A, 'db-03', ['S4']);
const q4 = R.load().plans['S4|db-03|0']; ok(q4.strategy === 'distractor' && /نجحت 4 من 4/.test(q4.rationale), 'بعد أدلة كافية تُفضَّل الأعلى نجاحًا مع ذكر الأرقام في المسوّغ');
// أسلوب الأقران يحتاج زميلة أتقنت الناتج في الفصل نفسه
ok(L.available({ entry: ctx.MDQ.textbook.get('db-03'), peers: [] }).every(s => s.id !== 'peer') && L.available({ entry: ctx.MDQ.textbook.get('db-03'), peers: ['هند'] }).some(s => s.id === 'peer'), 'أسلوب الأقران مشروط بوجود زميلة متقنة');
ok(!L.available({ entry: null }).length, 'لا أسلوب بلا موضع في الكتاب (لا اختراع)');
ok(L.pick({ kind: 'concept', entry: null, used: [] }).strategy === null, 'لا خيار: يُحال بدل الاختراع');

// 7) دورة المتابعة بضغطة المعلمة: تحترم الإيقاف والأسماء المعلّقة وتنشئ مسودات فقط
reset(); R.send(A, 'db-03', ['S1']); const pa = R.load().plans['S1|db-03|0']; R.approve(pa.key); R.load().plans[pa.key].afterPass = false; R.save();
ctx.MDQ.std.stop('اختبار'); ok(!L.advance(A, 90, 'f1').ok && /موقوف/.test(L.advance(A, 90, 'f1').msg), 'الإيقاف الفوري يمنع الدورة'); ctx.MDQ.std.resume();
ok(!L.advance({ tally: { pending: 2 }, rows: A.rows }, 90, 'f1').ok, 'يتوقف عند أسماء غير محسومة'); ok(!L.advance(null, 90, 'f1').ok, 'يتوقف بلا تحليل');
const adv = L.advance(A, 90, 'f1'); ok(adv.ok && adv.made === 1 && adv.obs.failed === 1, 'دورة: قرأت نتيجة وأنشأت مسودة بأسلوب جديد');
ok(Object.values(R.load().plans).filter(p => p.attempt === 1).every(p => p.status === 'draft'), 'الدورة لا تعتمد شيئًا');
// 8) ذاكرة الأهداف عبر اللقطات
ok(L.proposeGoals().length === 1 && L.proposeGoals()[0].action === 'new', 'أول لقطة: لا مقارنة');
const A2 = mkA(true); L.snapshot(A2, 90, 'f2'); let pg = L.proposeGoals(); ok(pg[0].prevPost != null && ['persist', 'change', 'hold', 'retire'].includes(pg[0].action), 'لقطتان: مقارنة وقاعدة معلنة');
const mkSnap = (post, label) => L.snapshot({ rows: [{ qid: 'z', outcome: 'ن', counted: true, per: Array.from({ length: 10 }, (_, i) => ({ base: false, post: i < post })) }] }, 90, label);
ctx.MDQ.loop.reset(); store['mdq.agent.loop.v1'] = JSON.stringify({ v: 1, cfg: { maxCycles: 3 }, episodes: {}, strat: { concept: {}, procedure: {} }, snaps: [] });
mkSnap(9, 'a'); mkSnap(10, 'b'); ok(L.proposeGoals()[0].action === 'retire', 'بلغ المستهدف في لقطتين متتاليتين: ثبّتي وأوقفي');
mkSnap(5, 'c'); mkSnap(5, 'd'); ok(L.proposeGoals()[0].action === 'change', 'لم يتحسن في لقطتين: غيّري الأسلوب');
mkSnap(8, 'e'); ok(L.proposeGoals()[0].action === 'persist', 'تحسّن ≥5 نقاط دون بلوغ المستهدف: واصلي');
// 9) الواجهة والخصوصية
const hh = L.html(esc, null); ok(hh.includes('حلقة المتابعة') && hh.includes('data-rm="loop"') && hh.includes('لا يعتمد الوكيل شيئًا'), 'واجهة الحلقة تعلن حدودها');
const src = fs.readFileSync(path.join(root, 'js/loop.js'), 'utf8') + fs.readFileSync(path.join(root, 'js/distractors.js'), 'utf8') + fs.readFileSync(path.join(root, 'js/calibration.js'), 'utf8');
ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|importScripts|eval\(/.test(src.replace(/Function\(/g, '')), 'لا اتصال بالشبكة ولا تنفيذ نصوص في الوحدات الجديدة');
L.wipe(); ok(L.load().snaps.length === 0 && Object.keys(L.load().episodes).length === 0, 'مسح الذاكرة');
// 10) لا تعديل على الأسئلة/البيانات المصدرية
ok(B.question('db-03') === def && JSON.stringify(S1.q.get('db-03').attempts).includes('choice'), 'لا تعديل على السؤال ولا على محاولات الطالبات');

// 11) خطط سابقة لإصدار الحلقة (بلا سجل دورات): لا يتكرر أسلوب الكتاب، وإعادة التوليد تعمل
reset(); { const d0 = R.load(); const legacy = (att, post, st) => ({ key: 'S1|db-03|' + att, studentId: 'S1', name: 'سارة أحمد', cls: '3/1', qid: 'db-03', outcome: 'ناتج db-03', lesson: 'db', kind: R.kindOf('db-03'), week: att + 1, attempt: att, game: { attempts: 3, correct: 1, share: 33, tries: 3 }, base: false, post: false, diagnosis: 'احتمال: x', book: null, steps: [{ t: 'خطوة', min: 5 }], note: '', status: st, createdAt: '2026-11-27T10:00:00Z', approvedAt: st === 'approved' ? '2026-11-27T10:05:00Z' : null, afterPass: post });
  d0.plans['S1|db-03|0'] = legacy(0, false, 'approved'); R.save(); }
let rl = R.send(A, 'db-03', ['S1']); const pl1 = R.load().plans['S1|db-03|1'];
ok(rl.made === 1 && pl1.strategy !== 'book' && /جُرّب سابقًا/.test(pl1.rationale), 'خطة سابقة بلا حلقة: الثانية بأسلوب غير الكتاب مع ذكر المجرَّب');
ok(L.episode('S1', 'db-03').cycles[0].legacy === true && L.episode('S1', 'db-03').cycles[0].result === false, 'استُكمل سجل الدورة الأولى من الخطة السابقة');
ok(L.stat(R.kindOf('db-03') === 'procedure' ? 'procedure' : 'concept', 'book').t === 1, 'نتيجة الخطة السابقة دخلت ذاكرة الأساليب');
// مسودة مكررة قديمة (strategy كتاب، أُنشئت بلا سجل) ثم إعادة التوليد
{ const d1 = R.load(); d1.plans['S1|db-03|1'].strategy = 'book'; d1.plans['S1|db-03|1'].rationale = 'أول دورة'; R.save(); }
const rg = R.regenerate(A); ok(rg.removed === 1 && rg.made === 1 && R.load().plans['S1|db-03|1'].strategy !== 'book', 'إعادة التوليد تستبدل المسودة المكررة بأسلوب جديد');
ok(R.load().plans['S1|db-03|0'].status === 'approved', 'إعادة التوليد لا تمسّ المعتمدة');
{ const d2 = R.load(); d2.plans['S1|db-03|1'].status = 'edited'; R.save(); } ok(R.regenerate(A).removed === 0, 'ولا المعدّلة');

console.log(`✔ test-loop: ${n} فحصًا ناجحًا`);
