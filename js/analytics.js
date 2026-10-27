/* ============================================================
   تحليل بيانات التعلم — على مستوى الطالبة (معرف ثابت) وجلساتها
   يُستخدم في لوحة المعلمة وفي ملفات Excel. المصدر: السجل المركزي.
   ============================================================ */
(function () {
  const B = () => MDQ.bank;
  const bool = v => v === true || v === 1 || v === '1' || (typeof v === 'string' && v.trim().toLowerCase() === 'true');
  const num = v => (v === '' || v == null || isNaN(+v)) ? 0 : +v;
  const pct = (a, b) => b ? Math.round(a / b * 100) : null;
  const dayOf = iso => iso ? MDQ.time.riyadh(iso).slice(0, 10) : '';

  /* مقترحات علاجية لكل مفهوم */
  const REMEDY = {
    'مثلث الحماية CIA': 'نشاط تصنيف: بطاقات مواقف تفرزها الطالبة إلى سرية/تكامل/توافر، مع مثال الصراف الآلي من الكتاب.',
    'أنواع الجرائم الإلكترونية': 'جدول مقارنة لأنواع الجرائم الخمسة ثم مواقف قصيرة تحدد الطالبة نوع الجريمة في كل منها.',
    'مفهوم الجرائم الإلكترونية': 'مقارنة موجهة بين الجريمة التقليدية والإلكترونية (الدافع واحد، الوسيلة مختلفة).',
    'مفهوم الأمن السيبراني': 'إعادة صياغة التعريف بكلماتها مع أمثلة على «الوصول غير المصرح به».',
    'حماية المعلومات الشخصية': 'قائمة تصنيف: معلومات شخصية تعريفية ومالية، ومناقشة استغلالها في سرقة الهوية.',
    'النسخ الاحتياطي والممارسات الأمنية': 'تطبيق قاعدة النسخ الثلاث على نوعين من الوسائط، وربطها بالتعافي من البرمجيات الضارة.',
    'مؤشرات الإصابة بالبرمجيات الضارة': 'مواقف «طبيعي أم مؤشر إصابة؟» من قائمة العلامات في الكتاب.',
    'خصوصية المتصفح وملفات تعريف الارتباط': 'تطبيق عملي: حذف ملفات تعريف الارتباط وسجل التصفح في المتصفح مع شرح الفرق بينها.',
    'أدوات الحماية المدمجة': 'تطبيق خطوات تفعيل Windows Defender SmartScreen ومقارنته بالبرامج الضارة.',
    'النوافذ المنبثقة والإعلانات الخادعة': 'تفعيل حظر النوافذ المنبثقة ومناقشة أمثلة إعلانات خادعة وما قد تثبته.',
    'التعامل مع البرمجيات الضارة': 'ترتيب خطوات التعامل مع الإصابة في بطاقات، ومثال هجوم الفدية.',
    'الوقاية: المرفقات والروابط': 'تمييز امتدادات الملفات الخطرة ومحاكاة قرار فتح مرفق من مرسل مجهول.',
    'مكونات الجدول: الحقل والسجل': 'تلوين الصفوف والأعمدة في جدول بيانات الطلبة وتسميتها (حقل/سجل).',
    'خصائص الحقول': 'تطبيق عملي في Access: ضبط خاصية مطلوب وقاعدة التحقق وملاحظة رسالة الخطأ.',
    'أنواع العلاقات': 'رسم العلاقات الثلاث بأمثلة الكتاب (طالب-بيانات طبية، مدرسة-معلمون، طلاب-دورات).',
    'التكامل المرجعي': 'تجربة إدخال درجة لمادة غير موجودة قبل وبعد تفعيل «فرض التكامل المرجعي».',
    'طرق العرض في Access': 'التبديل بين عرض التصميم وورقة البيانات وتسجيل ما يُنجز في كل منهما.',
    'أنواع البيانات والمفتاح الأساسي': 'اختيار نوع البيانات المناسب لحقول جدول، وتحديد المفتاح الأساسي مع التعليل.',
    'قواعد البيانات وبرنامج Access': 'مقارنة Access وExcel في جدول، مع أمثلة لما ينفرد به Access.',
    'مفهوم الاستعلام': 'تحويل أسئلة يومية («من الطالبات في فصل 3/2؟») إلى استعلامات.',
    'معايير التصفية في الاستعلام': 'تدريب على كتابة معايير في صف Criteria (>95، <60، نص) وتشغيلها.',
    'مفهوم التقارير وأهميتها': 'مقارنة الجدول والاستعلام والتقرير من حيث الغرض، وإنشاء تقرير بسيط.',
    'التجميع والفرز في التقارير': 'إنشاء تقرير بمعالج التقارير مع تجميع حسب الفصل وفرز حسب الاسم.',
    'الاستعلام من عدة جداول': 'إنشاء علاقة بين جدولين ثم استعلام منهما، وملاحظة النتيجة بدون علاقة.',
    'طرق إنشاء التقارير وتعديلها': 'إنشاء تقرير بطريقتين ثم تعديله في عرض التخطيط (حذف تسمية، تنسيق).'
  };

  function category(c) {
    if (!c.n) return 'لم تكتمل';
    const fp = c.firstOk / c.n * 100, fin = c.finalOk / c.n * 100;
    if (fp >= 80) return 'إتقان فوري';
    if (!c.unsolved && fin === 100 && c.wrong / c.n <= 2) return 'تحسّن بعد التلميح';
    return 'تحتاج دعمًا علاجيًا';
  }

  /**
   * events: الأحداث الخام من السجل المركزي.
   * registry: صفوف ورقة «الطالبات» (اختياري).
   * f: {q, cls, lesson, from, to, concept}
   */
  function build(events, registry, f) {
    f = f || {};
    const reg = new Map((registry || []).map(r => [r.studentId, r]));
    let ev = events.slice().sort((a, b) => String(a.clientTime).localeCompare(String(b.clientTime)));
    if (f.from) ev = ev.filter(e => dayOf(e.clientTime) >= f.from);
    if (f.to) ev = ev.filter(e => dayOf(e.clientTime) <= f.to);

    const S = new Map();
    const get = e => {
      const id = e.studentId || ('legacy:' + e.sessionId);
      if (!S.has(id)) {
        const r = reg.get(id) || {};
        S.set(id, { studentId: id, code: r.code || '', name: r.name || e.studentName, className: r.className || e.className || '',
          folderUrl: r.folderUrl || '', fileUrl: r.fileUrl || '', firstSeen: '', lastLogin: '', lastActivity: '',
          sessions: new Map(), lessons: {}, q: new Map(), badges: [] });
      }
      return S.get(id);
    };
    ev.forEach(e => {
      const s = get(e);
      if (e.studentName) s.name = s.name || e.studentName;
      if (!s.firstSeen || e.clientTime < s.firstSeen) s.firstSeen = e.clientTime;
      if (!s.lastActivity || e.clientTime > s.lastActivity) s.lastActivity = e.clientTime;
      if (e.sessionId) {
        if (!s.sessions.has(e.sessionId)) s.sessions.set(e.sessionId, { sessionId: e.sessionId, start: e.clientTime, last: e.clientTime, end: '', events: 0, attempts: 0, lessons: new Set() });
        const se = s.sessions.get(e.sessionId);
        se.events++; if (e.clientTime > se.last) se.last = e.clientTime; if (e.clientTime < se.start) se.start = e.clientTime;
        if (e.type === 'session_end') se.end = e.clientTime;
        if (e.type === 'attempt') se.attempts++;
        if (e.lessonId) se.lessons.add(e.lessonId);
      }
      if (e.type === 'session_start' && (!s.lastLogin || e.clientTime > s.lastLogin)) s.lastLogin = e.clientTime;
      const lid = e.lessonId;
      if (lid && !s.lessons[lid]) s.lessons[lid] = { status: 'none', startedAt: '', completedAt: '', lastAt: '' };
      const L = lid ? s.lessons[lid] : null;
      if (L && (!L.lastAt || e.clientTime > L.lastAt)) L.lastAt = e.clientTime;
      switch (e.type) {
        case 'stage_start': if (L.status === 'none') { L.status = 'active'; L.startedAt = e.clientTime; } break;
        case 'stage_complete': L.status = 'done'; L.completedAt = e.clientTime; break;
        case 'badge': s.badges.push({ id: e.badgeId, lessonId: lid }); break;
        case 'attempt': {
          if (L.status === 'none') { L.status = 'active'; L.startedAt = L.startedAt || e.clientTime; }
          if (!s.q.has(e.questionId)) s.q.set(e.questionId, { qid: e.questionId, lessonId: lid, concept: e.concept, attempts: [], done: false, unsolved: false });
          const q = s.q.get(e.questionId);
          q.attempts.push(e);
          if (bool(e.isCorrect)) q.done = true;
          break;
        }
        case 'question_skip': { const q = s.q.get(e.questionId); if (q && e.questionDone === 'لم يُحل') q.unsolved = true; break; }
      }
    });

    let list = [...S.values()].filter(s => s.name);
    // إضافة الطالبات المسجلات دون أحداث ضمن الفترة
    (registry || []).forEach(r => { if (!S.has(r.studentId) && !f.from && !f.to) list.push({ studentId: r.studentId, code: r.code, name: r.name, className: r.className, folderUrl: r.folderUrl, fileUrl: r.fileUrl, firstSeen: r.firstSeen, lastLogin: r.lastLogin, lastActivity: r.lastActivity, sessions: new Map(), lessons: {}, q: new Map(), badges: [] }); });
    if (f.cls) list = list.filter(s => (s.className || '—') === f.cls);
    if (f.q) { const k = f.q.trim(); list = list.filter(s => s.name.includes(k) || (s.code || '').includes(k.toUpperCase())); }
    if (f.lesson) list = list.filter(s => s.lessons[f.lesson]);

    const lessonOk = lid => !f.lesson || lid === f.lesson;
    const conceptOk = c => !f.concept || c === f.concept;
    const attemptRows = [], conceptRows = [], questionRows = [];

    list.forEach(s => {
      // ملخصات الدروس
      s.lessonStats = {};
      B().LESSONS.forEach(l => {
        const L = s.lessons[l.id] || { status: 'none' };
        const qsL = [...s.q.values()].filter(q => q.lessonId === l.id);
        const fin = qsL.filter(q => q.done || q.unsolved);
        const firstOk = fin.filter(q => q.attempts[0] && bool(q.attempts[0].isCorrect)).length;
        const xp = qsL.reduce((a, q) => a + q.attempts.filter(x => bool(x.isCorrect)).reduce((b, x) => b + num(x.xp), 0), 0);
        const end = L.completedAt || L.lastAt;
        s.lessonStats[l.id] = {
          status: L.status, statusAr: { none: 'لم تبدأ', active: 'قيد التنفيذ', done: 'مكتملة' }[L.status],
          startedAt: L.startedAt || '', completedAt: L.completedAt || '', answered: fin.length,
          firstPct: pct(firstOk, fin.length), finalPct: pct(fin.filter(q => q.done).length, fin.length),
          attempts: qsL.reduce((a, q) => a + q.attempts.length, 0),
          hints: qsL.reduce((a, q) => a + Math.min(q.attempts.filter(x => !bool(x.isCorrect)).length, 3), 0),
          xp, durSec: L.startedAt && end ? MDQ.time.secsBetween(L.startedAt, end) : 0,
          total: B().activeFor(l.id, MDQ.settings.get()).length
        };
      });
      // الأسئلة والمفاهيم
      const cmap = new Map();
      let answered = 0, firstOk = 0, finalOk = 0, attempts = 0, hints = 0, xp = 0, hintQs = 0, helped = 0;
      s.wrongQuestions = [];
      s.q.forEach(q => {
        if (!lessonOk(q.lessonId) || !conceptOk(q.concept)) return;
        const def = B().question(q.qid);
        const fin = q.done || q.unsolved;
        const fOk = q.attempts[0] && bool(q.attempts[0].isCorrect);
        const wrong = q.attempts.filter(a => !bool(a.isCorrect)).length;
        attempts += q.attempts.length; hints += Math.min(wrong, 3);
        xp += q.attempts.filter(a => bool(a.isCorrect)).reduce((b, a) => b + num(a.xp), 0);
        if (fin) { answered++; if (fOk) firstOk++; if (q.done) finalOk++; }
        if (wrong) { hintQs++; if (q.done) helped++; s.wrongQuestions.push({ q, def, wrong }); }
        questionRows.push({ s, q, def, fin, fOk, wrong });
        const ck = q.lessonId + '|' + q.concept;
        if (!cmap.has(ck)) cmap.set(ck, { lessonId: q.lessonId, concept: q.concept, n: 0, firstOk: 0, finalOk: 0, unsolved: 0, wrong: 0, correct: 0, attempts: 0, hints: 0 });
        const c = cmap.get(ck);
        if (fin) { c.n++; if (fOk) c.firstOk++; if (q.done) c.finalOk++; if (q.unsolved) c.unsolved++; }
        c.wrong += wrong; c.correct += q.attempts.length - wrong; c.attempts += q.attempts.length; c.hints += Math.min(wrong, 3);
        q.attempts.forEach((a, i) => attemptRows.push({
          studentId: s.studentId, studentName: s.name, className: s.className, code: s.code, sessionId: a.sessionId,
          lessonId: a.lessonId, lesson: B().lesson(a.lessonId) ? B().lesson(a.lessonId).lesson : a.lessonId,
          qNo: def ? def.no : a.questionId, questionId: a.questionId, concept: a.concept, questionText: def ? def.text : '',
          chosen: a.choiceText || a.choice, correctText: def ? B().optionText(def, def.answer) : a.correctKey,
          isCorrect: bool(a.isCorrect), attemptNo: num(a.attemptNo), hints: num(a.hintsUsed), xp: num(a.xp),
          time: a.clientTime, durationSec: num(a.durationSec),
          status: bool(a.isCorrect) ? 'مكتمل' : (q.unsolved && i === q.attempts.length - 1 ? 'لم يُحل' : 'قيد المحاولة')
        }));
      });
      s.concepts = [...cmap.values()].map(c => {
        const cat = category(c);
        return Object.assign(c, {
          lesson: B().lesson(c.lessonId) ? B().lesson(c.lessonId).lesson : c.lessonId,
          firstPct: pct(c.firstOk, c.n), finalPct: pct(c.finalOk, c.n),
          avgAttempts: c.n ? +(c.attempts / Math.max(c.n, 1)).toFixed(2) : 0,
          category: cat, remedy: cat === 'تحتاج دعمًا علاجيًا' ? (REMEDY[c.concept] || 'مراجعة المفهوم في ملف الدرس مع المعلمة.') : cat === 'تحسّن بعد التلميح' ? 'تعزيز بسؤال جديد على المفهوم نفسه للتأكد من ثبات الفهم دون تلميح.' : ''
        });
      });
      s.concepts.forEach(c => conceptRows.push(Object.assign({ studentId: s.studentId, studentName: s.name, className: s.className }, c)));
      Object.assign(s, {
        answered, firstOk, finalOk, attempts, hints, xp,
        firstPct: pct(firstOk, answered), finalPct: pct(finalOk, answered),
        hintQs, helped, hintBenefit: pct(helped, hintQs),
        lessonsStarted: B().LESSONS.filter(l => s.lessonStats[l.id].status !== 'none').length,
        stagesDone: B().LESSONS.filter(l => s.lessonStats[l.id].status === 'done').length,
        sessionList: [...s.sessions.values()].sort((a, b) => b.start.localeCompare(a.start)),
        needsReview: s.concepts.some(c => c.category === 'تحتاج دعمًا علاجيًا') || (answered >= 5 && pct(firstOk, answered) < 60),
        firstTryMaster: answered >= 5 && pct(firstOk, answered) >= 85
      });
      s.recommendations = s.concepts.filter(c => c.remedy).sort((a, b) => (a.category === 'تحتاج دعمًا علاجيًا' ? 0 : 1) - (b.category === 'تحتاج دعمًا علاجيًا' ? 0 : 1));
    });
    list.sort((a, b) => String(b.lastActivity).localeCompare(String(a.lastActivity)));
    attemptRows.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    return { students: list, attemptRows, conceptRows, questionRows, registryCount: (registry || []).length, filters: f };
  }

  /** الملخص العام */
  function overview(m) {
    const st = m.students;
    const started = st.filter(s => s.lessonsStarted > 0).length;
    const sessions = st.reduce((a, s) => a + s.sessions.size, 0);
    const lessons = B().LESSONS.map(l => {
      const rows = m.questionRows.filter(r => r.q.lessonId === l.id && r.fin);
      return {
        lesson: l, started: st.filter(s => s.lessonStats[l.id].status !== 'none').length,
        done: st.filter(s => s.lessonStats[l.id].status === 'done').length,
        firstPct: pct(rows.filter(r => r.fOk).length, rows.length), finalPct: pct(rows.filter(r => r.q.done).length, rows.length)
      };
    });
    return { registered: Math.max(m.registryCount, st.length), started, sessions, attempts: m.attemptRows.length, lessons, concepts: conceptAgg(m) };
  }

  /** المفاهيم على مستوى المجموعة */
  function conceptAgg(m) {
    const A = new Map();
    m.conceptRows.forEach(c => {
      const k = c.lessonId + '|' + c.concept;
      if (!A.has(k)) A.set(k, { lessonId: c.lessonId, lesson: c.lesson, concept: c.concept, n: 0, firstOk: 0, finalOk: 0, wrong: 0, attempts: 0, hints: 0, students: new Set(), strugglers: new Set(), improved: new Set(), support: new Set() });
      const a = A.get(k);
      a.n += c.n; a.firstOk += c.firstOk; a.finalOk += c.finalOk; a.wrong += c.wrong; a.attempts += c.attempts; a.hints += c.hints;
      a.students.add(c.studentId);
      if (c.wrong) a.strugglers.add(c.studentId);
      if (c.category === 'تحسّن بعد التلميح') a.improved.add(c.studentId);
      if (c.category === 'تحتاج دعمًا علاجيًا') a.support.add(c.studentId);
    });
    return [...A.values()].map(a => Object.assign(a, { firstPct: pct(a.firstOk, a.n), finalPct: pct(a.finalOk, a.n), avgAttempts: a.n ? +(a.attempts / a.n).toFixed(2) : 0, remedy: REMEDY[a.concept] || '' }))
      .sort((x, y) => y.wrong - x.wrong);
  }

  /** تحليل جوانب الضعف */
  function weakness(m) {
    const concepts = conceptAgg(m);
    const qmap = new Map();
    m.questionRows.forEach(r => {
      if (!qmap.has(r.q.qid)) qmap.set(r.q.qid, { def: r.def, qid: r.q.qid, lessonId: r.q.lessonId, concept: r.q.concept, firstWrong: new Set(), wrong: 0, answered: 0, names: [] });
      const a = qmap.get(r.q.qid);
      if (r.fin) a.answered++;
      if (r.q.attempts[0] && !bool(r.q.attempts[0].isCorrect)) { a.firstWrong.add(r.s.studentId); a.names.push(r.s.name); }
      a.wrong += r.wrong;
    });
    return {
      lowConcepts: concepts.filter(c => c.firstPct != null).sort((a, b) => a.firstPct - b.firstPct),
      retryConcepts: concepts.filter(c => c.n).sort((a, b) => b.avgAttempts - a.avgAttempts),
      sharedErrors: [...qmap.values()].filter(q => q.firstWrong.size > 1).sort((a, b) => b.firstWrong.size - a.firstWrong.size),
      needReview: m.students.filter(s => s.needsReview),
      masters: m.students.filter(s => s.firstTryMaster)
    };
  }

  /** ملخص حسب الفصل */
  function byClass(m) {
    const C = new Map();
    m.students.forEach(s => {
      const k = s.className || '—';
      if (!C.has(k)) C.set(k, { cls: k, students: 0, started: 0, lessons: {} });
      const c = C.get(k); c.students++; if (s.lessonsStarted) c.started++;
      B().LESSONS.forEach(l => {
        const L = s.lessonStats[l.id];
        const x = c.lessons[l.id] = c.lessons[l.id] || { started: 0, done: 0, ans: 0, fOk: 0, fin: 0, attempts: 0, hints: 0 };
        if (L.status !== 'none') x.started++;
        if (L.status === 'done') x.done++;
        x.attempts += L.attempts; x.hints += L.hints;
      });
    });
    m.questionRows.forEach(r => {
      if (!r.fin) return;
      const c = C.get(r.s.className || '—'); if (!c) return;
      const x = c.lessons[r.q.lessonId]; if (!x) return;
      x.ans++; if (r.fOk) x.fOk++; if (r.q.done) x.fin++;
    });
    return [...C.values()].sort((a, b) => a.cls.localeCompare(b.cls, 'ar'));
  }

  window.MDQ = window.MDQ || {};
  MDQ.analytics = { build, overview, weakness, byClass, conceptAgg, REMEDY, pct };
})();
