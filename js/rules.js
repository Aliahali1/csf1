/* ============================================================
   قواعد النقاط والشارات (التلعيب)
   ============================================================ */
(function () {
  const BADGES = {
    guardian:  { id: 'guardian',  name: 'حارسة الأمن السيبراني', desc: 'أكملتِ مرحلة الأمن السيبراني.', icon: 'shield' },
    device:    { id: 'device',    name: 'خبيرة حماية الأجهزة', desc: 'أكملتِ مهمة إنقاذ الجهاز.', icon: 'laptop' },
    engineer:  { id: 'engineer',  name: 'مهندسة البيانات', desc: 'أكملتِ مرحلة إنشاء قواعد البيانات.', icon: 'db' },
    detective: { id: 'detective', name: 'محققة الاستعلامات والتقارير', desc: 'أكملتِ مرحلة الاستعلام والتقارير.', icon: 'search' },
    star:      { id: 'star',      name: 'نجمة الإتقان', desc: 'دقة المحاولة الأولى في مرحلة بلغت معيار الإتقان.', icon: 'star' },
    grit:      { id: 'grit',      name: 'المثابرة', desc: 'تعلمتِ من أخطائك وصححتِ إجاباتك وأكملتِ المرحلة.', icon: 'grit' },
    explorer:  { id: 'explorer',  name: 'المغامِرة الكاملة', desc: 'أكملتِ المراحل الأربع.', icon: 'map' }
  };

  /** النقاط بحسب رقم المحاولة التي جاءت فيها الإجابة الصحيحة */
  function xpFor(attemptNo, s) {
    if (attemptNo <= 1) return Number(s.xpFirst);
    if (attemptNo === 2) return Number(s.xpSecond);
    return Number(s.xpLater);
  }

  /** نوع الدعم بعد محاولة خاطئة رقم n */
  function supportAfterWrong(n) {
    if (n === 1) return 'hint1';
    if (n === 2) return 'hint2';
    return 'teach';
  }

  /** الشارات المستحقة عند إكمال مرحلة. stats من MDQ.engine.stageStats */
  function badgesOnComplete(lesson, stats, allDone, s) {
    const out = [{ id: lesson.badge, stage: lesson.id }];
    if (stats.answered > 0 && stats.firstTryPct >= Number(s.masteryThreshold)) out.push({ id: 'star', stage: lesson.id });
    if (stats.correctedAfterError >= Number(s.persistenceMin)) out.push({ id: 'grit', stage: lesson.id });
    if (allDone) out.push({ id: 'explorer', stage: null });
    return out;
  }

  window.MDQ = window.MDQ || {};
  MDQ.rules = { BADGES, xpFor, supportAfterWrong, badgesOnComplete };
})();
