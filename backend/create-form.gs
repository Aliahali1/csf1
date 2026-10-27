/**
 * مغامرة المهارات الرقمية — إنشاء نموذج Google تلقائيًا (اختياري، يُشغَّل مرة واحدة)
 * إعداد المعلمة: عالية اليامي
 * ------------------------------------------------------------
 * 1) افتحي https://script.google.com ← مشروع جديد ← الصقي هذا الملف ← احفظي.
 * 2) اختاري الدالة createAdventureForm ← Run ← وافقي على الصلاحيات.
 * 3) افتحي «سجل التنفيذ» (Execution log) وانسخي:
 *      - «الرابط المعبأ مسبقًا»  ← الصقيه في لوحة المعلمة: تبويب «إعداد نموذج Google»
 *      - «رابط جدول الردود»     ← الصقيه في الخانة نفسها (اختياري)
 * لا يحتاج نشر (Deploy). الملفات خاصة بحسابكِ ولا يُنشأ أي رابط مشاركة.
 */
var TITLES = ['معرف الحدث', 'نوع الحدث', 'معرف الطالبة', 'اسم الطالبة', 'الفصل', 'معرف الجلسة', 'الدرس', 'السؤال', 'المفهوم',
  'الإجابة المختارة', 'رمز الإجابة', 'صحيحة', 'رقم المحاولة', 'التلميحات', 'النقاط', 'حالة السؤال', 'المدة بالثواني', 'الشارة',
  'وقت الطالبة', 'رمز الطالبة'];
var FOLDER_NAME = 'مغامرة المهارات الرقمية - بيانات الطالبات';

function createAdventureForm() {
  var folderIt = DriveApp.getFoldersByName(FOLDER_NAME);
  var folder = folderIt.hasNext() ? folderIt.next() : DriveApp.createFolder(FOLDER_NAME);

  var form = FormApp.create('مغامرة المهارات الرقمية - بيانات الطالبات');
  form.setDescription('نموذج يستقبل بيانات اللعبة تلقائيًا من موقع «مغامرة المهارات الرقمية». لا تُعدّلي ترتيب الأسئلة أو عناوينها.');
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setShowLinkToRespondAgain(false);
  form.setProgressBar(false);
  try { form.setRequireLogin(false); } catch (e) { /* متاح لحسابات Google Workspace فقط */ }

  var items = TITLES.map(function (t) { return form.addTextItem().setTitle(t).setRequired(false); });

  var ss = SpreadsheetApp.create('متابعة الطالبات - السجل المركزي (ردود النموذج)');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  DriveApp.getFileById(form.getId()).moveTo(folder);
  DriveApp.getFileById(ss.getId()).moveTo(folder);

  var resp = form.createResponse();
  items.forEach(function (it) { resp.withItemResponse(it.createResponse('x')); });
  var prefilled = resp.toPrefilledUrl();

  Logger.log('الرابط المعبأ مسبقًا (الصقيه في لوحة المعلمة):\n' + prefilled);
  Logger.log('رابط جدول الردود:\n' + ss.getUrl());
  Logger.log('رابط تحرير النموذج:\n' + form.getEditUrl());
  Logger.log('المجلد: ' + folder.getUrl());
  return prefilled;
}
