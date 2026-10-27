/* ============================================================
   الربط بنماذج Google (Google Forms)
   - كل حدث (محاولة، بدء مرحلة، دخول…) يُرسل ردًّا مستقلًا إلى النموذج،
     فيُحفظ صفًّا في جدول الردود (Google Sheets) داخل Drive المعلمة.
   - ترتيب الأسئلة في النموذج يجب أن يطابق FIELDS تمامًا.
   - لوحة المعلمة تقرأ ملف الردود بعد تنزيله (CSV أو Excel) من Google Sheets.
   ============================================================ */
(function () {
  /** [المفتاح الداخلي، عنوان السؤال في النموذج] — بالترتيب */
  const FIELDS = [
    ['eventId', 'معرف الحدث'],
    ['type', 'نوع الحدث'],
    ['studentId', 'معرف الطالبة'],
    ['studentName', 'اسم الطالبة'],
    ['className', 'الفصل'],
    ['sessionId', 'معرف الجلسة'],
    ['lessonId', 'الدرس'],
    ['questionId', 'السؤال'],
    ['concept', 'المفهوم'],
    ['choiceText', 'الإجابة المختارة'],
    ['choice', 'رمز الإجابة'],
    ['isCorrect', 'صحيحة'],
    ['attemptNo', 'رقم المحاولة'],
    ['hintsUsed', 'التلميحات'],
    ['xp', 'النقاط'],
    ['questionDone', 'حالة السؤال'],
    ['durationSec', 'المدة بالثواني'],
    ['badgeId', 'الشارة'],
    ['clientTime', 'وقت الطالبة'],
    ['studentCode', 'رمز الطالبة']
  ];
  const CFG = (window.MDQ_CONFIG && MDQ_CONFIG.FORMS) || {};
  const configured = !!(CFG.formUrl && Array.isArray(CFG.entries) && CFG.entries.length === FIELDS.length);

  /** تحويل رابط «الحصول على رابط معبأ مسبقًا» إلى إعدادات */
  function parsePrefilled(link) {
    let u;
    try { u = new URL(String(link).trim()); } catch (e) { throw new Error('الرابط غير صالح. انسخي رابط «الحصول على رابط معبأ مسبقًا» كاملًا.'); }
    if (!/docs\.google\.com$/.test(u.hostname) || !/\/forms\/(u\/\d+\/)?d\/e\/[^/]+\//.test(u.pathname + '/')) throw new Error('هذا ليس رابط نموذج Google. يجب أن يبدأ بـ https://docs.google.com/forms/d/e/');
    const entries = [];
    u.searchParams.forEach((v, k) => { if (/^entry\.\d+$/.test(k) && !entries.includes(k)) entries.push(k); });
    if (entries.length !== FIELDS.length) throw new Error(`وُجد ${entries.length} سؤالًا معبأً، والمطلوب ${FIELDS.length}. اكتبي أي حرف في كل الأسئلة قبل الحصول على الرابط.`);
    const formUrl = u.origin + u.pathname.replace(/\/viewform$/, '/formResponse').replace(/\/(prefill|edit)$/, '/formResponse');
    return { formUrl: /formResponse$/.test(formUrl) ? formUrl : formUrl.replace(/\/?$/, '/formResponse'), entries };
  }

  function encode(evt, cfg) {
    cfg = cfg || CFG;
    const p = new URLSearchParams();
    FIELDS.forEach(([k], i) => { const v = evt[k]; if (v !== undefined && v !== null && v !== '') p.append(cfg.entries[i], String(v).slice(0, 400)); });
    return p;
  }

  /** إرسال حدث واحد. no-cors: لا يمكن قراءة رد Google، لذلك «أُرسل» وليس «تأكد الحفظ» */
  async function send(evt, cfg) {
    cfg = cfg || CFG;
    await fetch(cfg.formUrl, { method: 'POST', mode: 'no-cors', body: encode(evt, cfg) });
  }
  function beacon(evt) {
    try { if (configured && navigator.sendBeacon) return navigator.sendBeacon(CFG.formUrl, encode(evt)); } catch (e) {}
    return false;
  }

  /* ---------------- قراءة ملف الردود (CSV / Excel) ---------------- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }
  async function readXlsx(buf) {
    if (!window.ExcelJS) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'; s.onload = res; s.onerror = () => rej(new Error('تعذر تحميل قارئ Excel')); document.head.appendChild(s); });
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
    const ws = wb.worksheets[0]; const rows = [];
    ws.eachRow({ includeEmpty: false }, r => { const a = []; for (let i = 1; i <= ws.columnCount; i++) { let v = r.getCell(i).value; if (v && typeof v === 'object') v = v instanceof Date ? v.toISOString() : (v.text || v.result || ''); a.push(v == null ? '' : String(v)); } rows.push(a); });
    return rows;
  }
  /** يحوّل صفوف الملف إلى أحداث، ويحذف المكرر بمعرف الحدث */
  function rowsToEvents(rows) {
    if (!rows.length) throw new Error('الملف فارغ.');
    const head = rows[0].map(h => String(h).trim());
    const idx = {};
    FIELDS.forEach(([k, t]) => { const i = head.indexOf(t); if (i >= 0) idx[k] = i; });
    const tsIdx = head.findIndex(h => /^(Timestamp|طابع زمني|الطابع الزمني)$/i.test(h));
    const missing = ['eventId', 'type', 'studentId', 'studentName', 'clientTime'].filter(k => idx[k] == null);
    if (missing.length) throw new Error('هذا ليس ملف ردود نموذج المغامرة: أعمدة ناقصة (' + missing.map(k => FIELDS.find(f => f[0] === k)[1]).join('، ') + ').');
    const seen = new Set(), events = [];
    rows.slice(1).forEach(r => {
      const e = {};
      FIELDS.forEach(([k]) => { e[k] = idx[k] != null ? String(r[idx[k]] ?? '').trim() : ''; });
      if (!e.eventId || seen.has(e.eventId) || !e.studentId) return;
      seen.add(e.eventId);
      if (tsIdx >= 0) e.serverTime = r[tsIdx];
      const def = e.questionId && MDQ.bank.question(e.questionId);
      e.correctKey = def ? def.answer : '';
      e.riyadhTime = e.clientTime ? MDQ.time.riyadh(e.clientTime) : '';
      events.push(e);
    });
    // سجل الطالبات المشتق: الرمز من حدث التسجيل
    const reg = new Map();
    events.forEach(e => {
      if (!reg.has(e.studentId)) reg.set(e.studentId, { studentId: e.studentId, code: '', name: e.studentName, className: e.className, folderUrl: '', fileUrl: '' });
      const r = reg.get(e.studentId);
      if (e.studentCode) r.code = e.studentCode;
      if (!r.code && /^ST-CODE[A-Z0-9]{6}$/.test(e.studentId)) r.code = e.studentId.slice(7);
      if (e.className) r.className = e.className;
    });
    return { events, students: [...reg.values()], duplicates: rows.length - 1 - events.length };
  }
  async function importFile(file) {
    const name = (file.name || '').toLowerCase();
    if (name.endsWith('.csv')) return rowsToEvents(parseCSV(await file.text()));
    if (name.endsWith('.xlsx')) return rowsToEvents(await readXlsx(await file.arrayBuffer()));
    throw new Error('اختاري ملف CSV أو Excel (.xlsx) منزّلًا من جدول الردود.');
  }

  /** بصمة الرقم السري (SHA-256) — يُحفظ في config.js البصمة فقط وليس الرقم */
  async function pinHash(pin) {
    const data = new TextEncoder().encode('mdq-forms:' + pin);
    const h = await crypto.subtle.digest('SHA-256', data);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  window.MDQ = window.MDQ || {};
  MDQ.forms = { FIELDS, configured, cfg: CFG, parsePrefilled, encode, send, beacon, parseCSV, rowsToEvents, importFile, pinHash };
})();
