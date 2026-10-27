/* ============================================================
   وكيل الرصد التعليمي (للمعلمة فقط) — مستوى الاستقلالية 1: يحلّل ويقترح ولا ينفّذ.
   - لا يعدّل أسئلة ولا محتوى ولا بيانات. لا يرسل شيئًا خارج المتصفح.
   - كل مقترح مسار يحتاج اعتماد المعلمة، ويُسجَّل القرار في سجل تدقيق محلي.
   - الفئات وصفية (ليست ترتيبًا رسميًا ولا درجات)؛ التعادل شائع فلا نُرقّم المراكز.
   ============================================================ */
(function () {
  const B = () => MDQ.bank;
  const VERSION = '1.0.0';
  const KEY = 'mdq.agent.audit.v1';
  const pct = (a, b) => b ? Math.round(a / b * 100) : null;
  const TEST_NAME = /(اختبار|تجربة|test|demo|xxx)/i;

  /* ---------- فئات التميّز ---------- */
  function score(s) {
    if (s.answered < 5) return null;
    return Math.round(0.5 * (s.firstPct || 0) + 0.3 * (s.finalPct || 0) + 0.2 * (s.stagesDone / 4 * 100));
  }
  function tiers(m) {
    const rows = m.students.map(s => ({ s, score: score(s) }));
    const eligible = rows.filter(r => r.score != null);
    const tier = r => r.score >= 85 && r.s.stagesDone >= 3 ? 'متميزة' : r.score >= 70 ? 'متقدمة' : r.score >= 50 ? 'في الطريق' : 'تحتاج دعمًا';
    eligible.forEach(r => r.tier = tier(r));
    const order = ['متميزة', 'متقدمة', 'في الطريق', 'تحتاج دعمًا'];
    const groups = {}; order.forEach(t => groups[t] = eligible.filter(r => r.tier === t).sort((a, b) => b.score - a.score || b.s.stagesDone - a.s.stagesDone));
    const top = groups['متميزة'];
    const tieAtTop = top.length > 1 && top.filter(r => r.score === top[0].score).length > 1;
    const all = eligible.slice().sort((a, b) => b.score - a.score || b.s.stagesDone - a.s.stagesDone);
    const cut = all.length ? all[Math.min(9, all.length - 1)].score : 0;
    const leaders = all.filter(r => r.score >= cut);
    return { leaders, order, groups, notEligible: rows.length - eligible.length, tieAtTop, formula: '٥٠٪ دقة المحاولة الأولى + ٣٠٪ النسبة النهائية + ٢٠٪ المراحل المكتملة؛ تُحسب لمن أجابت ٥ أسئلة فأكثر.' };
  }

  /* ---------- جودة البيانات (طبقة مشتقة: لا تعدّل الأصل) ---------- */
  function quality(m, data) {
    const st = m.students, issues = [];
    const dup = data && data.duplicates ? +data.duplicates : 0;
    if (dup) issues.push({ lvl: 'info', t: `صفوف مكررة أُسقطت عند الاستيراد: ${dup}`, ids: [] });
    const testy = st.filter(s => TEST_NAME.test(s.name || ''));
    if (testy.length) issues.push({ lvl: 'warn', t: `أسماء تبدو تجريبية (${testy.length}) — قد ترغبين باستبعادها من القراءة`, ids: testy.map(s => s.studentId) });
    const byName = {};
    st.forEach(s => { const k = (s.name || '').replace(/\s+/g, ' ').trim(); if (k) (byName[k] = byName[k] || []).push(s); });
    const same = Object.values(byName).filter(a => new Set(a.map(s => s.studentId)).size > 1);
    if (same.length) issues.push({ lvl: 'warn', t: `أسماء متطابقة برموز مختلفة (${same.length} اسمًا) — قد تكون طالبة واحدة سجّلت أكثر من مرة`, ids: same.flat().map(s => s.studentId) });
    const thin = st.filter(s => s.answered < 3);
    if (thin.length) issues.push({ lvl: 'info', t: `طالبات أجبن أقل من ٣ أسئلة (${thin.length}) — لا تُحكم نتائجهن`, ids: thin.map(s => s.studentId) });
    const nocls = st.filter(s => !s.className);
    if (nocls.length) issues.push({ lvl: 'info', t: `بلا فصل مسجل: ${nocls.length}`, ids: nocls.map(s => s.studentId) });
    const fast = m.attemptRows.filter(a => a.durationSec > 0 && a.durationSec < 2);
    if (m.attemptRows.length && fast.length / m.attemptRows.length > 0.25) issues.push({ lvl: 'warn', t: `أكثر من ربع المحاولات أقل من ثانيتين (${fast.length}) — احتمال نقر عشوائي أو قياس غير دقيق`, ids: [] });
    return { issues, students: st.length, attempts: m.attemptRows.length };
  }

  /* ---------- تحليل الأسئلة (للمراجعة البشرية فقط) ---------- */
  function items(m) {
    const map = new Map();
    m.questionRows.forEach(r => {
      if (!r.fin) return;
      const o = map.get(r.q.qid) || { qid: r.q.qid, def: r.def, lessonId: r.q.lessonId, concept: r.q.concept, n: 0, firstOk: 0, wrongSum: 0 };
      o.n++; if (r.fOk) o.firstOk++; o.wrongSum += r.wrong; map.set(r.q.qid, o);
    });
    return [...map.values()].map(o => Object.assign(o, { firstPct: pct(o.firstOk, o.n), avgWrong: +(o.wrongSum / o.n).toFixed(2),
      flag: o.n >= 5 && o.firstPct < 40 ? 'صعب جدًا — راجعي صياغته قبل الحكم على الطالبات' : o.n >= 5 && o.firstPct > 95 ? 'سهل جدًا — لا يميّز بين المستويات' : '' }))
      .sort((a, b) => (a.firstPct ?? 101) - (b.firstPct ?? 101));
  }

  /* ---------- قمع التقدم ---------- */
  function funnel(m) {
    return B().LESSONS.map(l => {
      const started = m.students.filter(s => s.lessonStats[l.id].status !== 'none').length;
      const done = m.students.filter(s => s.lessonStats[l.id].status === 'done').length;
      return { lesson: l, started, done, dropped: started - done };
    });
  }

  /* ---------- مسارات التعلم المقترحة (من المحتوى القائم فقط) ---------- */
  function paths(m) {
    return m.students.filter(s => s.answered >= 3).map(s => {
      const steps = [];
      s.concepts.filter(c => c.category === 'تحتاج دعمًا علاجيًا').slice(0, 3).forEach(c =>
        steps.push({ kind: 'علاج', text: `مراجعة «${c.concept}» (${c.lesson}) في ملف الدرس، ثم إعادة أسئلته. ${c.remedy}` }));
      B().LESSONS.filter(l => s.lessonStats[l.id].status === 'none').slice(0, 1).forEach(l =>
        steps.push({ kind: 'تقدّم', text: `البدء بمرحلة «${l.stage}» (${l.lesson}).` }));
      B().LESSONS.filter(l => s.lessonStats[l.id].status === 'active').forEach(l =>
        steps.push({ kind: 'إكمال', text: `إكمال مرحلة «${l.stage}» التي بدأتها.` }));
      if (!steps.length && s.firstTryMaster) steps.push({ kind: 'إثراء', text: 'أداء متقن: يمكن تكليفها بشرح مفهوم لزميلاتها أو تحدٍّ إضافي تختارينه من الكتاب.' });
      return { studentId: s.studentId, name: s.name, className: s.className, steps };
    }).filter(p => p.steps.length);
  }

  /* ---------- سجل التدقيق والاعتماد (محلي في متصفح المعلمة) ---------- */
  function audit() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function decide(studentId, decision, note) {
    const a = audit(); a.push({ at: new Date().toISOString(), studentId, decision, note: note || '', v: VERSION });
    try { localStorage.setItem(KEY, JSON.stringify(a.slice(-500))); } catch (e) {}
    return a;
  }
  function decisionOf(studentId) { const a = audit().filter(x => x.studentId === studentId); return a.length ? a[a.length - 1] : null; }

  /* ---------- ملخص مجهَّل الهوية لاستخدام أداة ذكاء اصطناعي خارجية (اختياري) ---------- */
  function pseudoSummary(m) {
    const t = tiers(m), f = funnel(m), it = items(m);
    const lines = ['ملخص مجمّع بلا أسماء ولا رموز (للتحليل التربوي):',
      `عدد الطالبات: ${m.students.length} — المحاولات: ${m.attemptRows.length}`,
      'الفئات: ' + t.order.map(o => `${o} ${t.groups[o].length}`).join('، '),
      'القمع: ' + f.map(x => `${x.lesson.lesson}: بدأت ${x.started} / أكملت ${x.done}`).join(' | '),
      'أصعب الأسئلة (نسبة الصواب من المحاولة الأولى): ' + it.slice(0, 5).map(x => `${x.def ? x.def.no : x.qid} (${x.concept}) ${x.firstPct}%`).join('، ')];
    return lines.join('\n');
  }

  function run(m, data) { return { version: VERSION, quality: quality(m, data), tiers: tiers(m), items: items(m), funnel: funnel(m), paths: paths(m) }; }
  MDQ.agent = { VERSION, run, tiers, quality, items, funnel, paths, decide, decisionOf, audit, pseudoSummary, score };
})();
