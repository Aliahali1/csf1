/* ============================================================
   منطق المراحل والمحاولات والتلميحات
   يعمل على كائن الجلسة ويُصدر الأحداث عبر MDQ.tracker
   ============================================================ */
(function () {
  const B = () => MDQ.bank, T = () => MDQ.tracker, RU = () => MDQ.rules;

  const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function makeCode() {
    let c = '';
    try { const a = new Uint32Array(6); crypto.getRandomValues(a); a.forEach(x => { c += CODE_ABC[x % CODE_ABC.length]; }); }
    catch (e) { for (let i = 0; i < 6; i++) c += CODE_ABC[Math.floor(Math.random() * CODE_ABC.length)]; }
    return c;
  }
  function newSessionId() { return T().uid('S').slice(0, 30); }

  /** تسجيل طالبة جديدة: معرف ثابت + رمز للدخول من أجهزة أخرى */
  function newSession(name, cls, existingCode) {
    const now = new Date().toISOString();
    const code = existingCode || makeCode();
    const s = {
      v: 2, studentId: 'ST-CODE' + code, code, sessionId: newSessionId(),
      studentName: name, className: cls || '', startedAt: now, lastActivity: now, xp: 0, badges: [], stages: {}, streak: 0
    };
    if (!existingCode) T().emit(s, 'student_register', { studentCode: s.code });
    T().emit(s, 'session_start', {});
    return s;
  }
  const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;

  /** دخول جديد لطالبة مسجلة (فتح الموقع من جديد) */
  function resumeSession(s) {
    s.sessionId = newSessionId();
    s.startedAt = new Date().toISOString();
    T().emit(s, 'session_start', {});
    return s;
  }

  /** إعادة بناء التقدم من أحداث الطالبة المحفوظة مركزيًا (عند الدخول برمزها من جهاز آخر) */
  function rebuild(info, events, settings) {
    const s = { v: 2, studentId: info.studentId, code: info.code, sessionId: newSessionId(), studentName: info.name, className: info.className || '',
      startedAt: new Date().toISOString(), lastActivity: '', xp: 0, badges: [], stages: {}, streak: 0 };
    events.slice().sort((a, b) => String(a.clientTime).localeCompare(String(b.clientTime))).forEach(ev => {
      const lid = ev.lessonId;
      const st = lid ? stage(s, lid) : null;
      const isOk = ev.isCorrect === true || ev.isCorrect === 'true' || ev.isCorrect === 'TRUE';
      switch (ev.type) {
        case 'stage_start':
          if (st.status === 'new') { st.status = 'active'; st.startedAt = ev.clientTime; st.order = B().activeFor(lid, settings).map(q => q.id); }
          break;
        case 'attempt': {
          if (st.status === 'new') { st.status = 'active'; st.startedAt = ev.clientTime; st.order = B().activeFor(lid, settings).map(q => q.id); }
          if (!st.order.includes(ev.questionId)) st.order.push(ev.questionId);
          const q = qs(st, ev.questionId);
          q.attempts.push({ c: ev.choice, ok: isOk, at: ev.clientTime, dur: +ev.durationSec || 0 });
          q.shownAt = q.shownAt || ev.clientTime; q.lastAt = ev.clientTime;
          if (isOk) { q.state = 'done'; q.xp = +ev.xp || 0; s.xp += q.xp; }
          break;
        }
        case 'question_skip': {
          const q = qs(st, ev.questionId);
          if (ev.questionDone === 'لم يُحل') q.state = 'unsolved'; else { q.state = 'deferred'; }
          if (q.state === 'deferred') q.retry = false;
          break;
        }
        case 'stage_complete': st.status = 'done'; st.completedAt = ev.clientTime; break;
        case 'badge': if (!s.badges.some(b => b.id === ev.badgeId && b.stage === (lid || null))) s.badges.push({ id: ev.badgeId, stage: lid || null, at: ev.clientTime }); break;
      }
    });
    Object.keys(s.stages).forEach(lid => { const st = s.stages[lid]; if (st.status !== 'done') st.cur = nextQid(st); });
    T().emit(s, 'session_start', {});
    return s;
  }

  function stage(s, lid) {
    if (!s.stages[lid]) s.stages[lid] = { status: 'new', q: {}, order: [], cur: null };
    return s.stages[lid];
  }

  function startStage(s, lid, settings) {
    const st = stage(s, lid);
    if (st.status === 'new') {
      st.order = B().activeFor(lid, settings).map(q => q.id);
      st.status = 'active';
      st.startedAt = new Date().toISOString();
      st.cur = st.order[0] || null;
      T().emit(s, 'stage_start', { lessonId: lid });
    }
    return st;
  }

  function qs(st, qid) {
    if (!st.q[qid]) st.q[qid] = { attempts: [], state: 'open', xp: 0 };
    return st.q[qid];
  }

  function markShown(s, lid, qid) {
    const q = qs(stage(s, lid), qid);
    if (!q.shownAt) q.shownAt = new Date().toISOString();
  }

  /** إرسال إجابة. يعيد نتيجة المحاولة ونوع الدعم */
  function submit(s, lid, qid, choice, settings) {
    const st = stage(s, lid), q = qs(st, qid), def = B().question(qid);
    const now = new Date().toISOString();
    const correct = choice === def.answer;
    const attemptNo = q.attempts.length + 1;
    const dur = MDQ.time.secsBetween(q.lastAt || q.shownAt || now, now);
    const hintsUsed = Math.min(attemptNo - 1, 3);
    const xp = correct ? RU().xpFor(attemptNo, settings) : 0;
    q.attempts.push({ c: choice, ok: correct, at: now, dur });
    q.lastAt = now;
    if (correct) { q.state = 'done'; q.xp = xp; s.xp += xp; }
    T().emit(s, 'attempt', {
      lessonId: lid, questionId: qid, concept: def.concept, choice,
      choiceText: B().optionText(def, choice), correctKey: def.answer,
      isCorrect: correct, attemptNo, hintsUsed, xp, questionDone: correct ? 'مكتمل' : 'قيد المحاولة',
      durationSec: dur
    });
    return { correct, attemptNo, xp, support: correct ? null : RU().supportAfterWrong(attemptNo) };
  }

  /** تأجيل سؤال بعد الشرح: في الجولة الأولى يعود في آخر المرحلة، وفي الثانية يُسجَّل «لم يُحل» */
  function defer(s, lid, qid) {
    const st = stage(s, lid), q = qs(st, qid);
    const final = !!q.retry;
    q.state = final ? 'unsolved' : 'deferred';
    T().emit(s, 'question_skip', {
      lessonId: lid, questionId: qid, concept: B().question(qid).concept,
      attemptNo: q.attempts.length, hintsUsed: Math.min(q.attempts.length, 3),
      questionDone: final ? 'لم يُحل' : 'مؤجل'
    });
  }

  function nextQid(st) {
    const open = st.order.find(id => { const q = st.q[id]; return !q || q.state === 'open'; });
    if (open) return open;
    const def = st.order.find(id => st.q[id] && st.q[id].state === 'deferred');
    if (def) { st.q[def].state = 'open'; st.q[def].retry = true; return def; }
    return null;
  }

  /** الانتقال للسؤال التالي. يعيد المعرف أو null عند انتهاء المرحلة */
  function advance(s, lid) {
    const st = stage(s, lid);
    st.cur = nextQid(st);
    return st.cur;
  }

  function stageStats(s, lid) {
    const st = stage(s, lid);
    let answered = 0, correct = 0, firstTry = 0, attempts = 0, hints = 0, corrected = 0, xp = 0, unsolved = 0;
    const weak = new Map();
    st.order.forEach(id => {
      const q = st.q[id]; if (!q) return;
      const def = B().question(id);
      attempts += q.attempts.length;
      if (q.state === 'done' || q.state === 'unsolved') {
        answered++;
        const wrong = q.attempts.filter(a => !a.ok).length;
        hints += Math.min(wrong, 3);
        if (q.state === 'done') correct++; else unsolved++;
        if (q.attempts[0] && q.attempts[0].ok) firstTry++;
        else weak.set(def.concept, (weak.get(def.concept) || 0) + 1);
        if (q.state === 'done' && q.attempts.length > 1) corrected++;
        xp += q.xp || 0;
      }
    });
    const total = st.order.length;
    return {
      total, answered, remaining: total - answered, correct, unsolved, firstTry, attempts, hints, xp,
      correctedAfterError: corrected,
      firstTryPct: answered ? Math.round(firstTry / answered * 100) : 0,
      finalPct: answered ? Math.round(correct / answered * 100) : 0,
      maxXp: total * Number(MDQ.settings.get().xpFirst),
      weakConcepts: [...weak.keys()],
      durationSec: MDQ.time.secsBetween(st.startedAt, st.completedAt || new Date().toISOString())
    };
  }

  /** إكمال المرحلة ومنح الشارات. يعيد {stats, newBadges} */
  function complete(s, lid, settings) {
    const st = stage(s, lid);
    if (st.status === 'done') return { stats: stageStats(s, lid), newBadges: [] };
    st.status = 'done';
    st.completedAt = new Date().toISOString();
    const stats = stageStats(s, lid);
    T().emit(s, 'stage_complete', {
      lessonId: lid, xp: stats.xp, durationSec: stats.durationSec,
      attemptNo: stats.attempts, hintsUsed: stats.hints,
      questionDone: `${stats.correct}/${stats.answered}`
    });
    const allDone = B().LESSONS.every(l => s.stages[l.id] && s.stages[l.id].status === 'done');
    const earned = RU().badgesOnComplete(B().lesson(lid), stats, allDone, settings);
    const newBadges = [];
    earned.forEach(b => {
      const has = s.badges.some(x => x.id === b.id && (x.stage === b.stage || ['explorer'].includes(b.id)));
      if (!has) {
        const rec = { id: b.id, stage: b.stage, at: new Date().toISOString() };
        s.badges.push(rec); newBadges.push(rec);
        T().emit(s, 'badge', { lessonId: b.stage || '', badgeId: b.id });
      }
    });
    return { stats, newBadges };
  }

  function overall(s) {
    const L = B().LESSONS;
    const done = L.filter(l => s.stages[l.id] && s.stages[l.id].status === 'done').length;
    return { done, total: L.length, pct: Math.round(done / L.length * 100) };
  }

  window.MDQ = window.MDQ || {};
  MDQ.engine = { CODE_RE, newSession, resumeSession, rebuild, makeCode, stage, startStage, markShown, submit, defer, advance, stageStats, complete, overall };
})();
