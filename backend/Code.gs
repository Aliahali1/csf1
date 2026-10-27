/**
 * ============================================================
 *  مغامرة المهارات الرقمية — الخدمة الخلفية (Google Apps Script + Google Drive)
 *  إعداد المعلمة: عالية اليامي
 * ------------------------------------------------------------
 *  البنية في Google Drive (تُنشأ تلقائيًا بالدالة setup):
 *    📁 مغامرة المهارات الرقمية - بيانات الطالبات
 *       📊 متابعة الطالبات - السجل المركزي   (هذا الملف نفسه بعد نقله)
 *            ├ الطالبات        : سجل ثابت لكل طالبة + ملخص أدائها (يُحدَّث مع كل حدث)
 *            ├ الجلسات         : كل دخول جديد
 *            ├ المحاولات       : كل محاولة إجابة في صف مستقل (السجل المركزي)
 *            ├ سجل الأحداث     : كل الأحداث الخام (مصدر لوحة المعلمة)
 *            ├ الإعدادات
 *            └ أخطاء المزامنة
 *       📁 الطالبات
 *            📁 <اسم الطالبة> (<رمزها>)      ← مجلد واحد ثابت لكل طالبة
 *                 📊 سجل أداء - <اسم الطالبة>  (المحاولات + الأحداث)
 *
 *  الصلاحيات:
 *   - الطالبات: إضافة أحداثهن فقط (log) + استرجاع تقدمهن الشخصي برمزهن (studentProgress).
 *   - المعلمة: login بالرقم السري ← رمز جلسة مؤقت ← teacherData / saveSettings / logout.
 *   - الرقم السري في Script Properties باسم TEACHER_PIN (لا يُكتب في ملفات الموقع).
 *   - ملفات Drive خاصة بحساب المعلمة؛ لا يُنشأ أي رابط مشاركة عام.
 *
 *  النشر: Deploy > New deployment > Web app
 *         Execute as: Me    |    Who has access: Anyone
 * ============================================================
 */

var ROOT_NAME = 'مغامرة المهارات الرقمية - بيانات الطالبات';
var STUDENTS_FOLDER_NAME = 'الطالبات';
var MASTER_NAME = 'متابعة الطالبات - السجل المركزي';

var SH = { students: 'الطالبات', sessions: 'الجلسات', attempts: 'المحاولات', log: 'سجل الأحداث', settings: 'الإعدادات', errors: 'أخطاء المزامنة' };

var FIELDS = ['eventId', 'type', 'studentId', 'sessionId', 'studentName', 'className', 'lessonId', 'questionId',
  'concept', 'choice', 'choiceText', 'correctKey', 'isCorrect', 'attemptNo', 'hintsUsed', 'xp',
  'questionDone', 'durationSec', 'badgeId', 'clientTime', 'riyadhTime'];
var LOG_HEADERS = FIELDS.concat(['serverTime']);

var ATTEMPT_HEADERS = ['معرف المحاولة', 'معرف الطالبة', 'اسم الطالبة', 'الفصل', 'معرف الجلسة', 'الدرس', 'معرف السؤال', 'المفهوم',
  'الإجابة المختارة', 'رمز الإجابة', 'مفتاح الإجابة', 'صحيحة؟', 'رقم المحاولة', 'التلميحات قبلها', 'النقاط', 'حالة السؤال',
  'مدة الإجابة (ث)', 'وقت الإجابة (الرياض)', 'وقت الخادم'];

var STUDENT_HEADERS = ['studentId', 'الرمز', 'اسم الطالبة', 'الفصل', 'أول دخول', 'آخر دخول', 'آخر نشاط', 'عدد الجلسات',
  'المحاولات', 'الخاطئة', 'التلميحات', 'النقاط', 'الشارات', 'دقة المحاولة الأولى %', 'النسبة النهائية %',
  'الأمن السيبراني', 'حماية الجهاز', 'إنشاء قواعد البيانات', 'الاستعلام والتقارير',
  'رابط المجلد', 'رابط سجل الطالبة', 'folderId', 'fileId', 'stats_json'];

var SESSION_HEADERS = ['sessionId', 'studentId', 'اسم الطالبة', 'الفصل', 'بداية الجلسة', 'آخر نشاط', 'نهاية الجلسة', 'عدد الأحداث'];

var TYPES = ['student_register', 'session_start', 'session_end', 'stage_start', 'attempt', 'question_skip', 'stage_complete', 'badge', 'review_open'];
var LESSONS = ['cyber', 'device', 'db', 'query'];
var LESSON_TITLES = { cyber: 'الأمن السيبراني', device: 'حماية جهاز الحاسب الشخصي', db: 'إنشاء قواعد البيانات', query: 'الاستعلام والتقارير' };
var STATUS_AR = { none: 'لم تبدأ', active: 'قيد التنفيذ', done: 'مكتملة' };
var MAX_BATCH = 50;
var DEFAULT_SESSION_MIN = 60;

/* =====================================================================
   الإعداد لمرة واحدة
   ===================================================================== */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var pin = props.getProperty('TEACHER_PIN');
  if (!pin || !/^\d{4,12}$/.test(pin)) {
    throw new Error('أضيفي الخاصية TEACHER_PIN (رقمكِ السري) من Project Settings > Script properties ثم أعيدي تشغيل setup.');
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('يجب إنشاء هذا المشروع من داخل ملف Google Sheets: Extensions > Apps Script.');

  // 1) المجلد الرئيسي ومجلد الطالبات
  var root = getOrCreateFolder_(props, 'ROOT_FOLDER_ID', null, ROOT_NAME);
  getOrCreateFolder_(props, 'STUDENTS_FOLDER_ID', root, STUDENTS_FOLDER_NAME);

  // 2) نقل الملف المركزي إلى المجلد الرئيسي وتسميته
  var file = DriveApp.getFileById(ss.getId());
  file.moveTo(root);
  ss.rename(MASTER_NAME);
  props.setProperty('MASTER_ID', ss.getId());

  // 3) أوراق الملف المركزي
  ensureSheet_(ss, SH.students, STUDENT_HEADERS);
  ensureSheet_(ss, SH.sessions, SESSION_HEADERS);
  ensureSheet_(ss, SH.attempts, ATTEMPT_HEADERS);
  ensureSheet_(ss, SH.log, LOG_HEADERS);
  var st = ensureSheet_(ss, SH.settings, ['key', 'value']);
  if (st.getLastRow() < 2) st.appendRow(['settings', '{}']);
  ensureSheet_(ss, SH.errors, ['الوقت', 'الطالبة', 'الخطأ']);
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('ورقة1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  Logger.log('تم الإعداد: ' + root.getUrl());
  return root.getUrl();
}

function getOrCreateFolder_(props, key, parent, name) {
  var id = props.getProperty(key);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* أُعيد إنشاؤه */ } }
  var it = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  var f = it.hasNext() ? it.next() : (parent ? parent.createFolder(name) : DriveApp.createFolder(name));
  props.setProperty(key, f.getId());
  return f;
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#6B4EF0').setFontColor('#ffffff');
  }
  // نص عادي حتى لا تتحول الأوقات و«3/2» إلى تواريخ
  sh.getRange(1, 1, sh.getMaxRows(), headers.length).setNumberFormat('@');
  return sh;
}

function master_() {
  var id = PropertiesService.getScriptProperties().getProperty('MASTER_ID');
  if (!id) { var e = new Error('لم يُشغَّل setup بعد'); e.code = 'not_setup'; throw e; }
  return SpreadsheetApp.openById(id);
}

/* =====================================================================
   نقاط الدخول
   ===================================================================== */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  try {
    if (action === 'config') return json_({ ok: true, settings: readSettings_(), ready: isReady_() });
    if (action === 'ping') return json_({ ok: true, ready: isReady_() });
    return json_({ ok: false, error: 'طلب غير معروف' });
  } catch (err) { return json_({ ok: false, error: String(err.message || err) }); }
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'صيغة الطلب غير صحيحة' }); }
  var action = body && body.action;
  try {
    switch (action) {
      case 'log': return json_(appendEvents_(body.events, !!body.retry));
      case 'studentProgress': return json_(studentProgress_(body.code));
      case 'login': return json_(login_(body.pin));
      case 'whoami': return json_({ ok: true, expiresAt: checkToken_(body.token).exp });
      case 'logout': logout_(body.token); return json_({ ok: true });
      case 'teacherData': checkToken_(body.token); return json_(teacherData_());
      case 'saveSettings': checkToken_(body.token); saveSettings_(body.settings); return json_({ ok: true });
      default: return json_({ ok: false, error: 'طلب غير معروف' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err), code: err.code || '' });
  }
}

function isReady_() { return !!PropertiesService.getScriptProperties().getProperty('MASTER_ID'); }

/* =====================================================================
   استقبال أحداث الطالبات
   ===================================================================== */
function appendEvents_(events, retry) {
  if (!Array.isArray(events) || !events.length) return { ok: false, error: 'لا توجد أحداث' };
  if (events.length > MAX_BATCH) events = events.slice(0, MAX_BATCH);
  var cache = CacheService.getScriptCache();
  var ss = master_();
  var accepted = [], rejected = [], fresh = [];
  var perStudent = {};

  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var logSh = ss.getSheetByName(SH.log);
    var now = new Date().toISOString();
    events.forEach(function (ev) {
      var v = validate_(ev);
      if (v) { rejected.push({ id: String((ev && ev.eventId) || '').slice(0, 80), reason: v }); return; }
      accepted.push(ev.eventId);
      if (isDuplicate_(cache, logSh, ev.eventId, retry)) return; // محفوظ سابقًا (إعادة إرسال)
      cache.put('ev:' + ev.eventId, '1', 21600);
      ev.serverTime = now;
      fresh.push(ev);
    });
    if (fresh.length) {
      // 1) السجل الخام
      appendRows_(logSh, fresh.map(function (ev) { return LOG_HEADERS.map(function (f) { return clean_(ev[f]); }); }));
      // 2) سجل المحاولات المركزي (صف مستقل لكل محاولة)
      var att = fresh.filter(function (ev) { return ev.type === 'attempt'; });
      if (att.length) appendRows_(ss.getSheetByName(SH.attempts), att.map(attemptRow_));
      // 3) سجل الطالبات والجلسات (تحديث تراكمي)
      fresh.forEach(function (ev) { (perStudent[ev.studentId] = perStudent[ev.studentId] || []).push(ev); });
      Object.keys(perStudent).forEach(function (sid) { updateStudent_(ss, sid, perStudent[sid]); });
      updateSessions_(ss, fresh);
    }
  } finally {
    lock.releaseLock();
  }
  // 4) ملف الطالبة الفردي في Drive (خارج القفل؛ الفشل هنا لا يُفقد البيانات المركزية)
  Object.keys(perStudent).forEach(function (sid) {
    try { writeStudentFile_(ss, sid, perStudent[sid]); }
    catch (err) { try { ss.getSheetByName(SH.errors).appendRow([new Date().toISOString(), sid, String(err.message || err)]); } catch (e2) {} }
  });
  return { ok: true, accepted: accepted, rejected: rejected, saved: fresh.length };
}

function isDuplicate_(cache, logSh, id, retry) {
  if (cache.get('ev:' + id)) return true;
  if (!retry) return false;
  var last = logSh.getLastRow();
  if (last < 2) return false;
  return !!logSh.getRange(2, 1, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
}

function appendRows_(sh, rows) {
  if (!rows.length) return;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setNumberFormat('@').setValues(rows);
}

function attemptRow_(ev) {
  return [ev.eventId, ev.studentId, ev.studentName, ev.className, ev.sessionId, LESSON_TITLES[ev.lessonId] || ev.lessonId,
    ev.questionId, ev.concept, ev.choiceText, ev.choice, ev.correctKey, isTrue_(ev.isCorrect) ? 'صحيحة' : 'خاطئة',
    ev.attemptNo, ev.hintsUsed, ev.xp, ev.questionDone, ev.durationSec, ev.riyadhTime, ev.serverTime].map(clean_);
}

function validate_(ev) {
  if (!ev || typeof ev !== 'object') return 'ليس كائنًا';
  if (!/^[A-Za-z0-9-]{6,80}$/.test(String(ev.eventId || ''))) return 'eventId غير صالح';
  if (TYPES.indexOf(ev.type) < 0) return 'نوع غير معروف';
  if (!/^ST-[A-Za-z0-9-]{8,40}$/.test(String(ev.studentId || ''))) return 'studentId غير صالح';
  if (!/^S-[A-Za-z0-9-]{6,40}$/.test(String(ev.sessionId || ''))) return 'sessionId غير صالح';
  var name = String(ev.studentName || '').trim();
  if (name.length < 2 || name.length > 60 || /[<>]/.test(name)) return 'اسم غير صالح';
  if (String(ev.className || '').length > 20) return 'فصل غير صالح';
  if (ev.lessonId && LESSONS.indexOf(String(ev.lessonId)) < 0) return 'درس غير معروف';
  if (ev.questionId && !/^[a-z]{2}-[a-z0-9]{2,4}$/.test(String(ev.questionId))) return 'سؤال غير صالح';
  if (ev.type === 'attempt' && (!ev.questionId || !ev.lessonId || ['true', 'false', true, false].indexOf(ev.isCorrect) < 0)) return 'محاولة ناقصة';
  if (ev.type === 'student_register' && !/^[A-HJ-NP-Z2-9]{6}$/.test(String(ev.studentCode || ''))) return 'رمز الطالبة غير صالح';
  if (isNaN(Date.parse(ev.clientTime))) return 'وقت غير صالح';
  for (var i = 0; i < FIELDS.length; i++) { if (String(ev[FIELDS[i]] == null ? '' : ev[FIELDS[i]]).length > 400) return 'حقل طويل جدًا'; }
  var n = ['attemptNo', 'hintsUsed', 'xp', 'durationSec'];
  for (var j = 0; j < n.length; j++) { var x = ev[n[j]]; if (x !== '' && x != null && (isNaN(+x) || +x < 0 || +x > 100000)) return 'رقم غير صالح'; }
  return '';
}

/** يمنع تفسير النص معادلةً في Sheets */
function clean_(v) {
  if (v === true || v === false) return String(v);
  if (v == null) return '';
  var s = String(v).replace(/[\u0000-\u001f]/g, ' ').slice(0, 400);
  if (/^[=+\-@]/.test(s) && isNaN(+s)) s = "'" + s;
  return s;
}
function isTrue_(v) { return v === true || v === 'true' || v === 'TRUE'; }

/* =====================================================================
   سجل الطالبة الثابت + الملخص التراكمي
   ===================================================================== */
function findRow_(sh, col, value) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var cell = sh.getRange(2, col, last - 1, 1).createTextFinder(value).matchEntireCell(true).findNext();
  return cell ? cell.getRow() : 0;
}

function emptyStats_() {
  var s = { attempts: 0, wrong: 0, hints: 0, xp: 0, badges: [], ftT: 0, ftC: 0, fnT: 0, fnC: 0, sessions: {}, lessons: {} };
  LESSONS.forEach(function (l) { s.lessons[l] = { st: 'none', start: '', end: '', xp: 0, ftT: 0, ftC: 0, fnT: 0, fnC: 0 }; });
  return s;
}

function updateStudent_(ss, sid, evs) {
  var sh = ss.getSheetByName(SH.students);
  var row = findRow_(sh, 1, sid);
  var vals, stats;
  if (row) {
    vals = sh.getRange(row, 1, 1, STUDENT_HEADERS.length).getValues()[0];
    try { stats = JSON.parse(vals[23] || '{}'); } catch (e) { stats = {}; }
    if (!stats.lessons) stats = emptyStats_();
  } else {
    vals = STUDENT_HEADERS.map(function () { return ''; });
    vals[0] = sid; stats = emptyStats_();
  }
  evs.forEach(function (ev) {
    if (ev.studentName) vals[2] = ev.studentName;
    if (ev.className) vals[3] = ev.className;
    if (!vals[4] || ev.clientTime < vals[4]) vals[4] = ev.clientTime;
    if (!vals[6] || ev.clientTime > vals[6]) vals[6] = ev.clientTime;
    var L = ev.lessonId && stats.lessons[ev.lessonId];
    switch (ev.type) {
      case 'student_register': vals[1] = ev.studentCode; break;
      case 'session_start':
        stats.sessions[ev.sessionId] = 1;
        if (!vals[5] || ev.clientTime > vals[5]) vals[5] = ev.clientTime;
        break;
      case 'stage_start': if (L && L.st === 'none') { L.st = 'active'; L.start = ev.clientTime; } break;
      case 'stage_complete': if (L) { L.st = 'done'; L.end = ev.clientTime; } break;
      case 'badge': if (stats.badges.indexOf(ev.badgeId + ':' + ev.lessonId) < 0) stats.badges.push(ev.badgeId + ':' + ev.lessonId); break;
      case 'attempt':
        var ok = isTrue_(ev.isCorrect), n = +ev.attemptNo || 1;
        stats.attempts++;
        if (!ok) stats.wrong++;
        if (L && L.st === 'none') { L.st = 'active'; L.start = L.start || ev.clientTime; }
        if (n === 1) { stats.ftT++; if (ok) stats.ftC++; if (L) { L.ftT++; if (ok) L.ftC++; } }
        if (ok) { stats.fnT++; stats.fnC++; stats.hints += +ev.hintsUsed || 0; stats.xp += +ev.xp || 0; if (L) { L.fnT++; L.fnC++; L.xp += +ev.xp || 0; } }
        break;
      case 'question_skip':
        if (ev.questionDone === 'لم يُحل') { stats.fnT++; stats.hints += +ev.hintsUsed || 0; if (L) L.fnT++; }
        break;
    }
  });
  var pct = function (a, b) { return b ? Math.round(a / b * 100) : ''; };
  vals[7] = Object.keys(stats.sessions).length;
  vals[8] = stats.attempts; vals[9] = stats.wrong; vals[10] = stats.hints; vals[11] = stats.xp; vals[12] = stats.badges.length;
  vals[13] = pct(stats.ftC, stats.ftT); vals[14] = pct(stats.fnC, stats.fnT);
  LESSONS.forEach(function (l, i) {
    var L = stats.lessons[l];
    vals[15 + i] = STATUS_AR[L.st] + (L.ftT ? ' — ' + pct(L.ftC, L.ftT) + '%' : '');
  });
  vals[23] = JSON.stringify(stats);
  var out = vals.map(function (v, i) { return i === 23 ? v : clean_(v); });
  if (row) sh.getRange(row, 1, 1, out.length).setValues([out]);
  else appendRows_(sh, [out]);
}

function updateSessions_(ss, evs) {
  var sh = ss.getSheetByName(SH.sessions);
  var by = {};
  evs.forEach(function (ev) { (by[ev.sessionId] = by[ev.sessionId] || []).push(ev); });
  Object.keys(by).forEach(function (sid) {
    var list = by[sid], row = findRow_(sh, 1, sid), v;
    if (row) v = sh.getRange(row, 1, 1, SESSION_HEADERS.length).getValues()[0];
    else v = [sid, list[0].studentId, list[0].studentName, list[0].className, '', '', '', 0];
    list.forEach(function (ev) {
      if (!v[4] || ev.clientTime < v[4]) v[4] = ev.clientTime;
      if (!v[5] || ev.clientTime > v[5]) v[5] = ev.clientTime;
      if (ev.type === 'session_end') v[6] = ev.clientTime;
    });
    v[7] = (+v[7] || 0) + list.length;
    v = v.map(clean_);
    if (row) sh.getRange(row, 1, 1, v.length).setValues([v]); else appendRows_(sh, [v]);
  });
}

/* =====================================================================
   مجلد الطالبة وملفها الفردي (واحد ثابت لكل طالبة)
   ===================================================================== */
function writeStudentFile_(ss, sid, evs) {
  var sh = ss.getSheetByName(SH.students);
  var row = findRow_(sh, 1, sid);
  if (!row) return;
  var vals = sh.getRange(row, 1, 1, STUDENT_HEADERS.length).getValues()[0];
  var fileId = vals[22], folderId = vals[21];
  var file;
  if (fileId) { try { file = SpreadsheetApp.openById(fileId); } catch (e) { file = null; } }
  if (!file) {
    var lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      vals = sh.getRange(row, 1, 1, STUDENT_HEADERS.length).getValues()[0];
      fileId = vals[22]; folderId = vals[21];
      if (fileId) { file = SpreadsheetApp.openById(fileId); }
      else {
        var studentsRoot = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('STUDENTS_FOLDER_ID'));
        var label = String(vals[2] || 'طالبة') + ' (' + (vals[1] || sid.slice(3, 9)) + ')';
        var folder = folderId ? DriveApp.getFolderById(folderId) : studentsRoot.createFolder(label);
        file = SpreadsheetApp.create('سجل أداء - ' + label);
        DriveApp.getFileById(file.getId()).moveTo(folder);
        var a = file.getSheets()[0]; a.setName('المحاولات');
        a.getRange(1, 1, 1, ATTEMPT_HEADERS.length).setValues([ATTEMPT_HEADERS]); a.setFrozenRows(1); a.setRightToLeft(true);
        var g = file.insertSheet('الأحداث');
        g.getRange(1, 1, 1, LOG_HEADERS.length).setValues([LOG_HEADERS]); g.setFrozenRows(1); g.setRightToLeft(true);
        sh.getRange(row, 20, 1, 4).setValues([[folder.getUrl(), file.getUrl(), folder.getId(), file.getId()]]);
      }
    } finally { lock.releaseLock(); }
  }
  var att = evs.filter(function (ev) { return ev.type === 'attempt'; });
  if (att.length) appendRows_(file.getSheetByName('المحاولات'), att.map(attemptRow_));
  appendRows_(file.getSheetByName('الأحداث'), evs.map(function (ev) { return LOG_HEADERS.map(function (f) { return clean_(ev[f]); }); }));
}

/** دالة يدوية للمعلمة: إعادة بناء الملفات الفردية من السجل المركزي إن حدث خطأ مزامنة */
function rebuildStudentFiles() {
  var ss = master_();
  var all = readLog_(ss);
  var by = {};
  all.forEach(function (ev) { (by[ev.studentId] = by[ev.studentId] || []).push(ev); });
  var sh = ss.getSheetByName(SH.students);
  Object.keys(by).forEach(function (sid) {
    var row = findRow_(sh, 1, sid); if (!row) return;
    var fid = sh.getRange(row, 23).getValue();
    if (fid) {
      var f = SpreadsheetApp.openById(fid);
      ['المحاولات', 'الأحداث'].forEach(function (n) { var s = f.getSheetByName(n); if (s.getLastRow() > 1) s.deleteRows(2, s.getLastRow() - 1); });
    }
    writeStudentFile_(ss, sid, by[sid]);
  });
}

/* =====================================================================
   الطالبة: استرجاع تقدمها الشخصي برمزها (للمتابعة من جهاز آخر)
   ===================================================================== */
function studentProgress_(code) {
  code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  var cache = CacheService.getScriptCache();
  var fails = +(cache.get('codeFails') || 0);
  if (fails >= 30) return { ok: false, error: 'محاولات كثيرة، حاولي بعد دقائق', code: 'locked' };
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) return { ok: false, error: 'الرمز غير صحيح', code: 'bad_code' };
  var ss = master_();
  var sh = ss.getSheetByName(SH.students);
  var row = findRow_(sh, 2, code);
  if (!row) { cache.put('codeFails', String(fails + 1), 600); Utilities.sleep(500); return { ok: false, error: 'لم نجد طالبة بهذا الرمز', code: 'not_found' }; }
  var v = sh.getRange(row, 1, 1, 4).getValues()[0];
  var events = readLog_(ss).filter(function (ev) { return ev.studentId === v[0]; })
    .filter(function (ev) { return ['stage_start', 'attempt', 'question_skip', 'stage_complete', 'badge'].indexOf(ev.type) >= 0; })
    .map(function (ev) { return { type: ev.type, lessonId: ev.lessonId, questionId: ev.questionId, choice: ev.choice, isCorrect: ev.isCorrect, attemptNo: ev.attemptNo, xp: ev.xp, questionDone: ev.questionDone, durationSec: ev.durationSec, badgeId: ev.badgeId, clientTime: ev.clientTime }; });
  return { ok: true, studentId: v[0], code: v[1], name: String(v[2]).replace(/^'/, ''), className: String(v[3]).replace(/^'/, ''), events: events };
}

/* =====================================================================
   المعلمة: الدخول بالرقم السري ← رمز جلسة مؤقت
   ===================================================================== */
function login_(pin) {
  var props = PropertiesService.getScriptProperties();
  var cache = CacheService.getScriptCache();
  var fails = +(cache.get('pinFails') || 0);
  if (fails >= 5) { var e1 = new Error('تم إيقاف الدخول مؤقتًا بعد محاولات خاطئة متكررة. حاولي بعد 15 دقيقة.'); e1.code = 'locked'; throw e1; }
  var real = props.getProperty('TEACHER_PIN') || '';
  if (!real || !safeEqual_(String(pin || ''), real)) {
    cache.put('pinFails', String(fails + 1), 900);
    Utilities.sleep(1000);
    var e2 = new Error('الرقم السري غير صحيح، حاولي مرة أخرى'); e2.code = 'auth'; throw e2;
  }
  cache.remove('pinFails');
  var minutes = Math.min(360, Math.max(5, +(props.getProperty('TEACHER_SESSION_MIN') || DEFAULT_SESSION_MIN)));
  var token = Utilities.getUuid() + '-' + Utilities.getUuid();
  var exp = Date.now() + minutes * 60000;
  cache.put('tk:' + token, String(exp), minutes * 60);
  return { ok: true, token: token, expiresAt: exp, minutes: minutes };
}
function checkToken_(token) {
  if (!/^[A-Za-z0-9-]{40,90}$/.test(String(token || ''))) { var e0 = new Error('انتهت جلسة المعلمة، أدخلي الرقم السري'); e0.code = 'auth'; throw e0; }
  var exp = +(CacheService.getScriptCache().get('tk:' + token) || 0);
  if (!exp || exp < Date.now()) { var e = new Error('انتهت جلسة المعلمة، أدخلي الرقم السري'); e.code = 'auth'; throw e; }
  return { exp: exp };
}
function logout_(token) { if (token) CacheService.getScriptCache().remove('tk:' + token); }
function safeEqual_(a, b) {
  var ha = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, a);
  var hb = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, b);
  var diff = 0;
  for (var i = 0; i < ha.length; i++) diff |= (ha[i] ^ hb[i]);
  return diff === 0;
}

/* =====================================================================
   بيانات لوحة المعلمة (بعد التحقق فقط)
   ===================================================================== */
function readLog_(ss) {
  var sh = ss.getSheetByName(SH.log);
  if (!sh || sh.getLastRow() < 2) return [];
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, LOG_HEADERS.length).getDisplayValues();
  return vals.map(function (r) {
    var o = {};
    LOG_HEADERS.forEach(function (h, i) { o[h] = String(r[i]).replace(/^'/, ''); });
    return o;
  });
}
function teacherData_() {
  var ss = master_();
  var sh = ss.getSheetByName(SH.students);
  var students = [];
  if (sh.getLastRow() > 1) {
    students = sh.getRange(2, 1, sh.getLastRow() - 1, STUDENT_HEADERS.length).getDisplayValues().map(function (r) {
      return { studentId: r[0], code: r[1], name: String(r[2]).replace(/^'/, ''), className: String(r[3]).replace(/^'/, ''),
        firstSeen: r[4], lastLogin: r[5], lastActivity: r[6], sessions: +r[7] || 0, folderUrl: r[19], fileUrl: r[20] };
    });
  }
  var root = PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID');
  return { ok: true, students: students, events: readLog_(ss), settings: readSettings_(),
    driveFolderUrl: root ? DriveApp.getFolderById(root).getUrl() : '', masterUrl: ss.getUrl() };
}

function readSettings_() {
  try {
    var sh = master_().getSheetByName(SH.settings);
    return JSON.parse(sh.getRange(2, 2).getValue() || '{}');
  } catch (e) { return {}; }
}
function saveSettings_(s) {
  if (!s || typeof s !== 'object') throw new Error('إعدادات غير صالحة');
  var txt = JSON.stringify(s);
  if (txt.length > 20000) throw new Error('الإعدادات كبيرة جدًا');
  master_().getSheetByName(SH.settings).getRange(2, 2).setValue(txt);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
