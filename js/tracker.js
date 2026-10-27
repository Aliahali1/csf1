/* ============================================================
   تتبع الأحداث والأوقات (بتوقيت مكة المكرمة / الرياض Asia/Riyadh)
   كل حدث سجل مستقل بمعرف فريد، ويُحفظ محليًا ثم يُرسل للمخزن المركزي إن وُجد.
   ============================================================ */
(function () {
  const TZ = (window.MDQ_CONFIG && MDQ_CONFIG.TIMEZONE) || 'Asia/Riyadh';

  function uid(prefix) {
    let r = '';
    try { r = crypto.randomUUID(); } catch (e) {
      r = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10) + '-' + Math.random().toString(36).slice(2, 10);
    }
    return (prefix ? prefix + '-' : '') + r;
  }

  const partsFmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  /** أجزاء التاريخ بتوقيت الرياض */
  function parts(iso) {
    const d = iso instanceof Date ? iso : new Date(iso);
    const o = {};
    partsFmt.formatToParts(d).forEach(p => { o[p.type] = p.value; });
    if (o.hour === '24') o.hour = '00';
    return o;
  }
  /** 'YYYY-MM-DD HH:mm:ss' بتوقيت الرياض */
  function riyadh(iso) {
    if (!iso) return '';
    const p = parts(iso);
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
  }
  /** تاريخ JS يحمل ساعة الرياض كقيمة UTC — لكتابة خلايا Excel تظهر بتوقيت الرياض */
  function riyadhWallDate(iso) {
    if (!iso) return null;
    const p = parts(iso);
    return new Date(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second));
  }
  const arFmt = new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', {
    timeZone: TZ, dateStyle: 'medium', timeStyle: 'short'
  });
  function pretty(iso) { try { return iso ? arFmt.format(new Date(iso)) : '—'; } catch (e) { return riyadh(iso); } }

  function secsBetween(a, b) {
    if (!a || !b) return 0;
    return Math.max(0, Math.round((new Date(b) - new Date(a)) / 1000));
  }
  function duration(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h) return `${h} س ${m} د`;
    if (m) return `${m} د ${s} ث`;
    return `${s} ث`;
  }

  /** الحقول المعتمدة لكل حدث (وهي أيضًا أعمدة ورقة السجل في Google Sheets) */
  const EVENT_FIELDS = ['eventId', 'type', 'studentId', 'sessionId', 'studentName', 'className', 'lessonId', 'questionId',
    'concept', 'choice', 'choiceText', 'correctKey', 'isCorrect', 'attemptNo', 'hintsUsed', 'xp',
    'questionDone', 'durationSec', 'badgeId', 'clientTime', 'riyadhTime'];
  const EVENT_TYPES = ['student_register', 'session_start', 'session_end', 'stage_start', 'attempt', 'question_skip', 'stage_complete', 'badge', 'review_open'];

  function emit(session, type, data) {
    const now = new Date().toISOString();
    const evt = {
      eventId: uid('e'), type,
      studentId: session.studentId, sessionId: session.sessionId, studentName: session.studentName, className: session.className || '',
      lessonId: '', questionId: '', concept: '', choice: '', choiceText: '', correctKey: '',
      isCorrect: '', attemptNo: '', hintsUsed: '', xp: '', questionDone: '', durationSec: '', badgeId: '',
      clientTime: now, riyadhTime: riyadh(now)
    };
    Object.assign(evt, data || {});
    session.lastActivity = now;
    MDQ.sync.record(evt);
    return evt;
  }

  window.MDQ = window.MDQ || {};
  MDQ.time = { riyadh, riyadhWallDate, pretty, secsBetween, duration, TZ };
  MDQ.tracker = { uid, emit, EVENT_FIELDS, EVENT_TYPES };
})();
