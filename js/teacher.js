/* ============================================================
   لوحة المعلمة — مستقلة عن واجهة الطالبات
   - لا تُطلب بيانات الطالبات إلا برمز جلسة صادر من الخادم بعد التحقق من الرقم السري.
   - كل العرض والتصدير من السجل المركزي (Google Sheets في Drive).
   - بدون ربط: «يتطلب إكمال إعداد الربط» + معاينة ببيانات تجريبية فقط.
   ============================================================ */
(function () {
  const I = MDQ.icons, B = MDQ.bank, A = MDQ.analytics, Tm = MDQ.time;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lvl = v => v == null || v === '' ? 'na' : v < 50 ? 'low' : v < 80 ? 'mid' : 'ok';
  const pill = v => `<span class="pill ${lvl(v)} num">${v == null || v === '' ? '—' : v + '%'}</span>`;
  const T = v => v ? Tm.riyadh(v).slice(0, 16) : '—';
  const SHORT = { cyber: 'الأمن السيبراني', device: 'حماية الجهاز', db: 'قواعد البيانات', query: 'الاستعلام والتقارير' };
  const st = { tab: 'overview', data: null, demo: false, student: null, f: { q: '', cls: '', lesson: '', from: '', to: '' }, msg: '', page: 0, timer: null };
  let root;

  /* ---------------- الدخول والجلسة ---------------- */
  function mount(el, opts) {
    root = el; opts = opts || {};
    document.body.classList.add('teacher-mode');
    const tb = document.getElementById('topStats'); if (tb) tb.innerHTML = '';
    st.forms = MDQ.sync.mode === 'forms';
    st.demo = (!MDQ.api.enabled && !st.forms) || !!opts.demo || location.hash === '#demo';
    if (st.demo) { st.data = demoData(); if (!MDQ.api.enabled && !st.forms) st.tab = 'connect'; return render(); }
    const t = MDQ.teacherSession.get();
    if (!t) return gate();
    if (st.forms) { armTimer(t.exp); return importScreen(); }
    root.innerHTML = '<div class="panel" style="padding:24px">جارٍ التحقق من جلسة المعلمة…</div>';
    MDQ.api.whoami(t.token).then(() => load()).catch(e => {
      MDQ.teacherSession.clear();
      gate(e.code === 'auth' ? 'انتهت جلسة المعلمة، أدخلي الرقم السري مرة أخرى.' : e.message);
    });
  }
  function gate(message) {
    st.data = null;
    root.innerHTML = `<section class="panel locked-panel"><div class="mascot bob">${MDQ.fx ? MDQ.fx.mascot('think') : ''}</div>
      <h1>لوحة المعلمة محمية</h1><p class="muted">لا تظهر أسماء الطالبات أو نتائجهن قبل التحقق من الرقم السري في الخادم.</p>
      <div class="row" style="justify-content:center"><button class="btn" id="openGate">دخول المعلمة</button><a class="btn ghost" href="index.html">واجهة الطالبات</a></div></section>`;
    const done = () => st.forms ? (armTimer(MDQ.teacherSession.get().exp), importScreen()) : load();
    $('#openGate').onclick = () => MDQ.auth.open({ message, onDone: done });
    MDQ.auth.open({ message, onDone: done });
  }
  async function load() {
    const t = MDQ.teacherSession.get();
    if (!t) return gate('انتهت جلسة المعلمة، أدخلي الرقم السري مرة أخرى.');
    root.innerHTML = '<div class="panel" style="padding:24px">جارٍ تحميل البيانات من السجل المركزي في Google Drive…</div>';
    try {
      const j = await MDQ.api.teacherData(t.token);
      if (j.settings) { MDQ.settings._remote = j.settings; MDQ.store.set(MDQ.KEYS.settings, j.settings); }
      st.data = { students: j.students || [], events: j.events || [], driveFolderUrl: j.driveFolderUrl, masterUrl: j.masterUrl, loadedAt: new Date().toISOString() };
      armTimer(t.exp);
      render();
    } catch (e) {
      if (e.code === 'auth') { MDQ.teacherSession.clear(); return gate('انتهت جلسة المعلمة، أدخلي الرقم السري مرة أخرى.'); }
      root.innerHTML = `<div class="banner bad">تعذر تحميل البيانات من الخادم: ${esc(e.message)} <button class="linkish" id="retry">أعيدي المحاولة</button></div>`;
      $('#retry').onclick = load;
    }
  }
  /* ---------- نماذج Google: استيراد ملف الردود المنزّل من Google Sheets ---------- */
  function importScreen(err) {
    const cfg = MDQ.forms.cfg;
    root.innerHTML = `<section class="panel import-panel">
      <h1>استيراد ردود الطالبات</h1>
      <p class="muted">بيانات الطالبات محفوظة في جدول ردود نموذج Google في Drive الخاص بكِ. لعرضها هنا وتحليلها:</p>
      <ol class="steps-doc">
        <li>افتحي جدول الردود ${cfg.sheetUrl ? `(<a href="${esc(cfg.sheetUrl)}" target="_blank" rel="noopener">فتح جدول الردود</a>)` : 'من نموذج Google ← تبويب «الردود» ← «عرض في جداول البيانات»'}.</li>
        <li>من القائمة: <b>ملف ← تنزيل ← Microsoft Excel (.xlsx)</b> أو <b>قيم مفصولة بفواصل (.csv)</b>.</li>
        <li>اختاري الملف هنا أو اسحبيه إلى المربع. يبقى الملف على هذا الجهاز ولا يُرفع إلى أي مكان.</li>
      </ol>
      <label class="drop" id="drop"><input type="file" id="impFile" accept=".csv,.xlsx" hidden><span>📥 اختاري ملف الردود أو اسحبيه هنا</span></label>
      ${err ? `<div class="banner bad">${esc(err)}</div>` : ''}
      <div class="row" style="justify-content:center"><button class="btn ghost small" id="impDemo">معاينة ببيانات تجريبية</button><button class="btn small" id="logout2">تسجيل الخروج</button></div>
    </section>`;
    const inp = $('#impFile'), drop = $('#drop');
    const take = async f => {
      if (!f) return;
      drop.querySelector('span').textContent = 'جارٍ قراءة الملف…';
      try {
        const r = await MDQ.forms.importFile(f);
        st.demo = false;
        st.data = { students: r.students, events: r.events, fileName: f.name, duplicates: r.duplicates, loadedAt: new Date().toISOString(), driveFolderUrl: cfg.sheetUrl || '' };
        st.msg = `استُورد ${r.events.length} سجلًا لـ ${r.students.length} طالبة من «${f.name}»${r.duplicates ? ` (تجاهلنا ${r.duplicates} صفًّا مكررًا أو فارغًا)` : ''}.`;
        render();
      } catch (e) { importScreen(e.message); }
    };
    inp.onchange = () => take(inp.files[0]);
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files[0]); });
    $('#impDemo').onclick = () => { st.demo = true; st.data = demoData(); render(); };
    $('#logout2').onclick = () => MDQ.auth.logout();
  }

  function armTimer(exp) {
    clearTimeout(st.timer);
    st.timer = setTimeout(() => { MDQ.teacherSession.clear(); st.data = null; gate('انتهت مدة جلسة المعلمة، أدخلي الرقم السري مرة أخرى.'); }, Math.max(1000, exp - Date.now()));
  }

  /* ---------------- الإطار ---------------- */
  function render() {
    if (!st.data) return gate();
    const model = A.build(st.data.events, st.data.students, st.f);
    const t = MDQ.teacherSession.get();
    const tabs = [['overview', 'الملخص العام'], ['students', 'متابعة الطالبات'], ['weak', 'جوانب الضعف'], ...((MDQ_CONFIG.FEATURES || {}).outcomes && MDQ.outcomes ? [['outcomes', 'نواتج التعلم']] : []), ...((MDQ_CONFIG.FEATURES || {}).agent && MDQ.agent ? [['agent', 'أداة الرصد']] : []), ...((MDQ_CONFIG.FEATURES || {}).goals && MDQ.goals && MDQ.goals.view ? [['goals', 'وكيل الأهداف']] : []), ['attempts', 'سجل المحاولات'], ['export', 'التصدير والتقارير'], ['bank', 'بنك الأسئلة'], ['settings', 'الإعدادات'], ['connect', MDQ.api.enabled ? 'الربط وGoogle Drive' : 'إعداد نموذج Google']];
    root.innerHTML = `
      <div class="t-head">
        <div><p class="eyebrow">لوحة المعلمة</p><h1>متابعة أداء الطالبات</h1>
          <p class="muted" style="font-size:.95rem">${st.demo ? 'معاينة ببيانات تجريبية' : st.forms ? `المصدر: ملف ردود نموذج Google «${esc(st.data.fileName)}» · ${st.data.events.length} سجل · استُورد ${T(st.data.loadedAt)}` : `المصدر: السجل المركزي في Google Drive · آخر تحديث ${T(st.data.loadedAt)}`}${t ? ` · تنتهي الجلسة ${T(new Date(t.exp).toISOString())}` : ''}</p></div>
        <div class="row">
          <button class="btn ghost small" id="refresh">${st.forms ? 'استيراد ملف أحدث' : 'تحديث البيانات'}</button>
          ${st.data.driveFolderUrl ? `<a class="btn ghost small" href="${esc(st.data.driveFolderUrl)}" target="_blank" rel="noopener">${st.forms ? 'جدول الردود' : 'مجلد Drive'}</a>` : ''}
          <button class="btn small" id="logout">تسجيل الخروج</button>
        </div>
      </div>
      ${st.demo ? `<div class="banner" style="margin-bottom:12px">${MDQ.api.enabled || st.forms ? '<b>معاينة:</b>&nbsp;بيانات تجريبية لأسماء وهمية.' : '<b>يتطلب إكمال إعداد الربط.</b>&nbsp;الموقع غير مربوط بنموذج Google بعد؛ ما يظهر هنا بيانات تجريبية لأسماء وهمية. ابدئي من تبويب «إعداد نموذج Google».'}</div>` : ''}
      <div id="tmsg" role="status">${st.msg ? `<div class="banner info" style="margin-bottom:12px">${esc(st.msg)}</div>` : ''}</div>
      <div class="tabs" role="tablist">${tabs.map(x => `<button role="tab" aria-selected="${st.tab === x[0] && !st.student}" data-tab="${x[0]}">${x[1]}</button>`).join('')}</div>
      ${['overview', 'students', 'weak', 'outcomes', 'attempts', 'export'].includes(st.tab) && !st.student ? filtersHtml() : ''}
      <div id="tbody"></div>`;
    st.msg = '';
    const body = $('#tbody');
    if (st.student) studentView(body, model);
    else ({ overview: overviewView, students: studentsView, weak: weakView, outcomes: outcomesView, agent: agentView, goals: goalsView, attempts: attemptsView, export: exportView, bank: bankView, settings: settingsView, connect: connectView }[st.tab])(body, model);
    if (MDQ.tguide) MDQ.tguide.tab(st.student ? 'students' : st.tab);
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; st.student = null; st.page = 0; render(); });
    $('#refresh').onclick = () => st.forms ? importScreen() : st.demo ? render() : load();
    $('#logout').onclick = () => MDQ.auth.logout();
    root.querySelectorAll('[data-f]').forEach(i => { i.onchange = () => { st.f[i.dataset.f] = i.value; st.page = 0; render(); }; });
    const qi = $('#fq'); if (qi) qi.oninput = debounce(() => { st.f.q = qi.value; render(); const n = $('#fq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 350);
    const cf = $('#clearF'); if (cf) cf.onclick = () => { st.f = { q: '', cls: '', lesson: '', from: '', to: '' }; render(); };
    root.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => { st.student = b.dataset.sid; render(); window.scrollTo(0, 0); });
  }
  const debounce = (fn, ms) => { let h; return () => { clearTimeout(h); h = setTimeout(fn, ms); }; };

  function filtersHtml() {
    const regs = st.data.students || [];
    const classes = [...new Set(st.data.events.map(e => e.className || '—').concat(regs.map(r => r.className || '—')))].sort();
    return `<div class="panel filters">
      <label>بحث بالاسم أو الرمز<input id="fq" class="t-input" value="${esc(st.f.q)}" placeholder="اسم الطالبة…"></label>
      <label>الفصل<select data-f="cls"><option value="">الكل</option>${classes.map(c => `<option ${st.f.cls === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label>الدرس<select data-f="lesson"><option value="">الكل</option>${B.LESSONS.map(l => `<option value="${l.id}" ${st.f.lesson === l.id ? 'selected' : ''}>${esc(l.lesson)}</option>`).join('')}</select></label>
      <label>من تاريخ<input type="date" class="t-input" data-f="from" value="${esc(st.f.from)}"></label>
      <label>إلى تاريخ<input type="date" class="t-input" data-f="to" value="${esc(st.f.to)}"></label>
      <button class="btn ghost small" id="clearF">مسح</button></div>`;
  }
  const empty = () => `<div class="panel" style="padding:24px"><h2 style="font-size:1.2rem">لا توجد بيانات بعد</h2><p class="muted">ستظهر النتائج هنا بمجرد أن تبدأ أول طالبة المغامرة وتُحفظ محاولاتها في السجل المركزي.</p></div>`;

  /* ---------------- الملخص العام ---------------- */
  function overviewView(body, m) {
    const o = A.overview(m);
    body.innerHTML = `
      <div class="kpis num">
        <div class="panel kpi"><b>${o.registered}</b><small>طالبة مسجلة</small></div>
        <div class="panel kpi"><b>${o.started}</b><small>بدأن اللعبة</small></div>
        <div class="panel kpi"><b>${o.sessions}</b><small>جلسة مسجلة</small></div>
        <div class="panel kpi"><b>${o.attempts}</b><small>محاولة إجابة</small></div>
        <div class="panel kpi"><b>${o.lessons.reduce((a, l) => a + l.done, 0)}</b><small>مرحلة مكتملة</small></div>
      </div>
      ${!m.students.length ? empty() : `
      <div class="grid2">
        <section class="panel card"><h2>الدروس: الإكمال ومتوسط الإتقان</h2>
          <div class="t-scroll" style="max-height:none"><table class="t-table"><thead><tr><th>الدرس</th><th>بدأن</th><th>أكملن</th><th>إتقان المحاولة الأولى</th><th>النهائية</th></tr></thead><tbody>
          ${o.lessons.map(l => `<tr><td>${esc(l.lesson.stage)}<br><small class="muted">${esc(l.lesson.lesson)}</small></td><td class="num">${l.started}</td><td class="num">${l.done}</td><td>${pill(l.firstPct)}</td><td>${pill(l.finalPct)}</td></tr>`).join('')}
          </tbody></table></div></section>
        <section class="panel card"><h2>أكثر المفاهيم التي تكررت فيها الأخطاء</h2>
          ${o.concepts.slice(0, 7).map(c => `<div class="hbar"><span>${esc(c.concept)}<br><small class="muted">${esc(c.lesson)}</small></span>
            <span class="track"><i class="lv-${lvl(c.firstPct)}" style="width:${Math.min(100, c.wrong / Math.max(1, o.concepts[0].wrong) * 100)}%"></i></span><b class="num">${c.wrong}</b></div>`).join('') || '<p class="muted">لا أخطاء مسجلة.</p>'}
          <p class="muted" style="font-size:.85rem">الرقم = عدد المحاولات الخاطئة. اللون = إتقان المحاولة الأولى.</p></section>
      </div>`}`;
  }

  /* ---------------- جدول المتابعة ---------------- */
  function studentsView(body, m) {
    if (!m.students.length) { body.innerHTML = empty(); return; }
    body.innerHTML = `<p class="muted" style="margin-bottom:8px">اضغطي اسم الطالبة لفتح تقريرها الفردي. (${m.students.length} طالبة)</p>
      <div class="t-scroll"><table class="t-table"><thead><tr><th>الطالبة</th><th>الفصل</th><th>آخر دخول</th><th>آخر نشاط</th><th>الدروس التي بدأتها</th><th>المراحل المكتملة</th>
      ${B.LESSONS.map(l => `<th>إتقان: ${SHORT[l.id]}</th>`).join('')}<th>المحاولات</th><th>التلميحات</th><th></th></tr></thead><tbody>
      ${m.students.map(s => `<tr><td><button class="linkish strong" data-sid="${esc(s.studentId)}">${esc(s.name)}</button><br><small class="muted ltr">${esc(s.code || '')}</small></td>
        <td>${esc(s.className || '—')}</td><td class="num">${T(s.lastLogin)}</td><td class="num">${T(s.lastActivity)}</td>
        <td>${B.LESSONS.filter(l => s.lessonStats[l.id].status !== 'none').map(l => SHORT[l.id]).join('، ') || '<span class="muted">لم تبدأ</span>'}</td><td class="num">${s.stagesDone}/4</td>
        ${B.LESSONS.map(l => `<td>${pill(s.lessonStats[l.id].firstPct)}</td>`).join('')}
        <td class="num">${s.attempts}</td><td class="num">${s.hints}</td><td>${s.needsReview ? '<span class="pill low">مراجعة</span>' : s.firstTryMaster ? '<span class="pill ok">متقنة</span>' : ''}</td></tr>`).join('')}
      </tbody></table></div>`;
  }

  /* ---------------- التقرير الفردي ---------------- */
  function studentView(body, m) {
    const s = m.students.find(x => x.studentId === st.student) || A.build(st.data.events, st.data.students, {}).students.find(x => x.studentId === st.student);
    if (!s) { st.student = null; return render(); }
    const att = m.attemptRows.filter(a => a.studentId === s.studentId).slice().reverse();
    body.innerHTML = `
      <div class="row" style="margin-bottom:12px"><button class="btn ghost small" id="back">${I.back} جدول الطالبات</button>
        <h2 class="grow" style="font-size:1.5rem">${esc(s.name)} <small class="muted">· ${esc(s.className || 'بدون فصل')} · رمز <span class="ltr">${esc(s.code || '—')}</span></small></h2>
        ${s.fileUrl ? `<a class="btn gold small" href="${esc(s.fileUrl)}" target="_blank" rel="noopener">عرض سجل الطالبة في Google Drive</a>` : st.forms && MDQ.forms.cfg.sheetUrl ? `<a class="btn gold small" href="${esc(MDQ.forms.cfg.sheetUrl)}" target="_blank" rel="noopener" title="صفّي عمود «معرف الطالبة» بالقيمة ${esc(s.studentId)}">عرض سجلها في جدول الردود (Drive)</a>` : `<span class="muted small-print">${st.demo ? 'رابط Drive يظهر بعد الربط' : ''}</span>`}
        <button class="btn small" id="xStudent">${I.download} تصدير سجلها</button></div>
      <div class="kpis num">
        <div class="panel kpi"><b>${s.sessions.size}</b><small>جلسة</small></div>
        <div class="panel kpi"><b>${s.stagesDone}/4</b><small>مراحل مكتملة</small></div>
        <div class="panel kpi"><b>${s.firstPct == null ? '—' : s.firstPct + '%'}</b><small>دقة المحاولة الأولى</small></div>
        <div class="panel kpi"><b>${s.finalPct == null ? '—' : s.finalPct + '%'}</b><small>النسبة النهائية</small></div>
        <div class="panel kpi"><b>${s.hintBenefit == null ? '—' : s.hintBenefit + '%'}</b><small>الاستفادة من التلميحات (${s.helped}/${s.hintQs})</small></div>
      </div>
      <div class="grid2">
        <section class="panel card"><h2>التقدم في المراحل</h2>
          <div class="t-scroll" style="max-height:none"><table class="t-table"><thead><tr><th>الدرس</th><th>الحالة</th><th>البدء</th><th>الإنهاء</th><th>الوقت</th><th>الأولى</th><th>النهائية</th><th>تلميحات</th></tr></thead><tbody>
          ${B.LESSONS.map(l => { const x = s.lessonStats[l.id]; return `<tr><td>${esc(l.lesson)}</td><td><span class="pill ${x.status === 'done' ? 'ok' : x.status === 'active' ? 'mid' : 'na'}">${x.statusAr}</span></td><td class="num">${T(x.startedAt)}</td><td class="num">${T(x.completedAt)}</td><td class="num">${x.durSec ? Tm.duration(x.durSec) : '—'}</td><td>${pill(x.firstPct)}</td><td>${pill(x.finalPct)}</td><td class="num">${x.hints}</td></tr>`; }).join('')}
          </tbody></table></div></section>
        <section class="panel card"><h2>التوصيات العلاجية</h2>
          ${s.recommendations.length ? `<ul class="rec-list">${s.recommendations.map(c => `<li><span class="pill ${c.category.startsWith('تحتاج') ? 'low' : 'mid'}">${esc(c.category)}</span> <b>${esc(c.concept)}</b><br><span>${esc(c.remedy)}</span></li>`).join('')}</ul>`
            : '<p>لا توجد مفاهيم تحتاج دعمًا. أداء متقن.</p>'}
          <p class="muted small-print">«تحسّن بعد التلميح» ليس ضعفًا: الطالبة وصلت للإجابة بنفسها بعد توجيه بسيط. كثرة المحاولات وحدها ليست دليلًا قاطعًا.</p></section>
      </div>
      <section class="panel card" style="margin-top:16px"><h2>المفاهيم</h2>
        <div class="t-scroll" style="max-height:none"><table class="t-table"><thead><tr><th>الدرس</th><th>المفهوم</th><th>أسئلة</th><th>الأولى</th><th>النهائية</th><th>محاولات خاطئة</th><th>التصنيف</th></tr></thead><tbody>
        ${s.concepts.map(c => `<tr><td>${esc(c.lesson)}</td><td>${esc(c.concept)}</td><td class="num">${c.n}</td><td>${pill(c.firstPct)}</td><td>${pill(c.finalPct)}</td><td class="num">${c.wrong}</td><td>${esc(c.category)}</td></tr>`).join('')}
        </tbody></table></div></section>
      <section class="panel card" style="margin-top:16px"><h2>الأسئلة التي أخطأت فيها (${s.wrongQuestions.length})</h2>
        ${s.wrongQuestions.map(w => `<div class="wq"><b>${esc(B.lesson(w.q.lessonId).lesson)} · ${esc(w.def ? w.def.no : w.q.qid)}</b> — ${esc(w.def ? w.def.text : '')}
          <div class="small-print">إجاباتها: ${w.q.attempts.map(a => `<span class="pill ${(a.isCorrect === true || a.isCorrect === 'true') ? 'ok' : 'low'}">${esc(a.choiceText || a.choice)}</span>`).join(' ')} · ${w.q.done ? 'وصلت للصحيحة' : w.q.unsolved ? 'لم يُحل' : 'قيد المحاولة'}</div></div>`).join('') || '<p class="muted">لا أخطاء.</p>'}</section>
      <section class="panel card" style="margin-top:16px"><h2>الجلسات (${s.sessionList.length})</h2>
        <div class="t-scroll" style="max-height:300px"><table class="t-table"><thead><tr><th>الدخول</th><th>آخر نشاط</th><th>الخروج</th><th>المدة</th><th>المحاولات</th><th>الدروس</th></tr></thead><tbody>
        ${s.sessionList.map(x => `<tr><td class="num">${T(x.start)}</td><td class="num">${T(x.last)}</td><td class="num">${x.end ? T(x.end) : '<small class="muted">غير مسجل</small>'}</td><td class="num">${Tm.duration(Tm.secsBetween(x.start, x.end || x.last))}</td><td class="num">${x.attempts}</td><td>${[...x.lessons].map(l => esc(B.lesson(l).lesson)).join('، ')}</td></tr>`).join('')}
        </tbody></table></div><p class="muted small-print">وقت الخروج يُسجَّل عند إغلاق الصفحة إن سمح المتصفح بذلك؛ وإلا فآخر نشاط هو المرجع.</p></section>
      <section class="panel card" style="margin-top:16px"><h2>جميع المحاولات (${att.length})</h2>
        <div class="t-scroll"><table class="t-table"><thead><tr><th>الوقت</th><th>الدرس</th><th>السؤال</th><th>المفهوم</th><th>الإجابة</th><th>النتيجة</th><th>المحاولة</th><th>تلميحات</th><th>المدة</th></tr></thead><tbody>
        ${att.map(a => `<tr><td class="num">${T(a.time)}</td><td>${esc(a.lesson)}</td><td>${esc(a.qNo)}</td><td>${esc(a.concept)}</td><td>${esc(a.chosen)}</td><td><span class="pill ${a.isCorrect ? 'ok' : 'low'}">${a.isCorrect ? 'صحيحة' : 'خاطئة'}</span></td><td class="num">${a.attemptNo}</td><td class="num">${a.hints}</td><td class="num">${a.durationSec} ث</td></tr>`).join('')}
        </tbody></table></div></section>`;
    $('#back').onclick = () => { st.student = null; st.tab = 'students'; render(); };
    $('#xStudent').onclick = () => doExport('student', m, { studentId: s.studentId });
  }

  /* ---------------- جوانب الضعف ---------------- */
  function weakView(body, m) {
    if (!m.students.length) { body.innerHTML = empty(); return; }
    const w = A.weakness(m);
    const names = list => list.map(s => `<button class="linkish" data-sid="${esc(s.studentId)}">${esc(s.name)}</button>`).join('، ') || '<span class="muted">لا يوجد</span>';
    body.innerHTML = `
      <div class="banner info" style="margin-bottom:14px">نميّز بين <b>ضعف الفهم من المحاولة الأولى</b> و<b>التحسن بعد التلميحات</b>. الطالبة التي أخطأت ثم وصلت للإجابة بتلميح أو اثنين تُصنَّف «تحسّن بعد التلميح» وليست ضعيفة. كثرة المحاولات وحدها لا تُعد دليلًا قاطعًا.</div>
      <div class="grid2">
        <section class="panel card"><h2>مفاهيم انخفضت فيها الإجابات الصحيحة من أول محاولة</h2>
          ${w.lowConcepts.slice(0, 8).map(c => `<div class="hbar"><span>${esc(c.concept)}<br><small class="muted">${esc(c.lesson)} · تحسّنت ${c.improved.size} · دعم ${c.support.size}</small></span><span class="track"><i class="lv-${lvl(c.firstPct)}" style="width:${c.firstPct}%"></i></span><b class="num">${c.firstPct}%</b></div>`).join('')}</section>
        <section class="panel card"><h2>مفاهيم احتاجت محاولات متكررة</h2>
          ${w.retryConcepts.slice(0, 8).map(c => `<div class="hbar"><span>${esc(c.concept)}<br><small class="muted">${esc(c.lesson)} · نهائية ${c.finalPct == null ? '—' : c.finalPct + '%'}</small></span><span class="track"><i class="lv-${c.avgAttempts >= 2 ? 'low' : c.avgAttempts >= 1.5 ? 'mid' : 'ok'}" style="width:${Math.min(100, (c.avgAttempts - 1) / 3 * 100)}%"></i></span><b class="num">${c.avgAttempts}</b></div>`).join('')}
          <p class="muted small-print">الرقم = متوسط المحاولات لكل سؤال (1 = من أول مرة).</p></section>
      </div>
      <section class="panel card" style="margin-top:16px"><h2>أسئلة تكرر فيها الخطأ لدى أكثر من طالبة</h2>
        <div class="t-scroll" style="max-height:360px"><table class="t-table"><thead><tr><th>الدرس</th><th>السؤال</th><th>المفهوم</th><th>أخطأن من أول محاولة</th><th>الطالبات</th></tr></thead><tbody>
        ${w.sharedErrors.map(q => `<tr><td>${esc(B.lesson(q.lessonId).lesson)}</td><td>${esc(q.def ? q.def.no + ' — ' + q.def.text.slice(0, 70) + '…' : q.qid)}</td><td>${esc(q.concept)}</td><td class="num">${q.firstWrong.size}</td><td>${esc(q.names.join('، '))}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">لا يوجد</td></tr>'}
        </tbody></table></div></section>
      <div class="grid2" style="margin-top:16px">
        <section class="panel card"><h2>طالبات يحتجن مراجعة إضافية (${w.needReview.length})</h2><p>${names(w.needReview)}</p></section>
        <section class="panel card"><h2>إتقان من المحاولة الأولى (${w.masters.length})</h2><p>${names(w.masters)}</p></section>
      </div>
      <section class="panel card" style="margin-top:16px"><h2>مقترحات علاجية حسب المفهوم</h2>
        <div class="t-scroll" style="max-height:none"><table class="t-table"><thead><tr><th>المفهوم</th><th>يحتجن دعمًا</th><th>المقترح</th></tr></thead><tbody>
        ${w.lowConcepts.filter(c => c.support.size).map(c => `<tr><td>${esc(c.concept)}<br><small class="muted">${esc(c.lesson)}</small></td><td class="num">${c.support.size}</td><td>${esc(c.remedy)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">لا توجد مفاهيم تحتاج دعمًا علاجيًا.</td></tr>'}
        </tbody></table></div></section>`;
    body.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => { st.student = b.dataset.sid; render(); });
  }



  /* ---------------- نواتج التعلم ومدى تحققها ---------------- */
  function outcomesView(body, m) {
    if (!m.students.length) { body.innerHTML = empty(); return; }
    const rows = MDQ.outcomes.compute(m);
    const nm = (list, tag) => list.map(w => `<button class="linkish" data-sid="${esc(w.studentId)}">${esc(w.name)}</button>${tag ? ` <small class="muted num">(${w.tries === Infinity ? 'لم تُصب بعد · ' + w.attempts + ' محاولة' : 'أصابت في المحاولة ' + w.tries})</small>` : ''}`).join('، ');
    const cellPct = (r, j) => r.pct[j] == null ? '—' : `${pill(r.pct[j])}<br><small class="muted num">${r.ok[j]}/${r.n}</small>`;
    body.innerHTML = `
      <div class="banner info" style="margin-bottom:14px"><div>كل ناتج تعلم مرتبط بالسؤال الذي يقيسه. <b>نسبة التحقق تراكمية</b>: «الثانية» = من أجابت صحيحًا في المحاولة الأولى أو الثانية، و«الثالثة» = خلال ثلاث محاولات. النسبة محسوبة من الطالبات اللاتي حاولن السؤال فعلًا (العدد تحت النسبة). «أخفقن» = لم تتحقق الإجابة الصحيحة خلال ثلاث محاولات (أو لم يكملن بعد). في أسئلة الصواب والخطأ تكون الثانية غالبًا مرتفعة لأن الخيارات اثنان فقط. المرشحات أعلاه (الفصل، التاريخ) تنطبق على الجدول.</div></div>
      <div class="row" style="margin-bottom:10px"><button class="btn gold small" id="xOut">${I.download} تنزيل الجدول (CSV)</button></div>
      ${B.LESSONS.map(l => { const rs = rows.filter(r => r.lesson === l.id); return `
        <section class="panel card" style="margin-bottom:16px"><h2>${esc(l.stage)} · ${esc(l.lesson)}</h2>
        <div class="t-scroll" style="max-height:none"><table class="t-table"><thead><tr><th>ناتج التعلم</th><th>السؤال الذي يقيسه</th><th>المحاولة الأولى</th><th>حتى الثانية</th><th>حتى الثالثة</th><th>الطالبات المخفقات</th></tr></thead><tbody>
        ${rs.map(r => r.missing ? `<tr><td>${esc(r.outcome)}</td><td>${esc(r.question)}</td><td colspan="4" class="muted">لا يوجد سؤال مقابل لهذا الناتج في الموقع حاليًا (موجود في مصفوفة القياس فقط).</td></tr>`
          : `<tr><td>${esc(r.outcome)}<br><small class="muted">${esc(r.bloom)}</small></td><td>${esc(r.question)}<br><small class="muted ltr">${esc(r.qid)} · ${esc(r.type)}</small></td>
          <td>${cellPct(r, 0)}</td><td>${cellPct(r, 1)}</td><td>${cellPct(r, 2)}</td>
          <td>${r.n ? (r.failAll.length ? `<b class="num">${r.failAll.length}</b>: ${nm(r.failAll, true)}` : '<span class="pill ok">لا إخفاق</span>')
            + (r.failFirst.length ? `<details style="margin-top:4px"><summary class="muted small-print">أخفقن في المحاولة الأولى (${r.failFirst.length})</summary>${nm(r.failFirst)}</details>` : '') : '<span class="muted">لم تحاول أحد</span>'}</td></tr>`).join('')}
        </tbody></table></div></section>`; }).join('')}`;
    body.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => { st.student = b.dataset.sid; render(); });
    $('#xOut').onclick = async () => {
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const lines = [['الدرس', 'ناتج التعلم', 'السؤال', 'عدد من حاولن', 'الأولى %', 'حتى الثانية %', 'حتى الثالثة %', 'المخفقات (بعد 3 محاولات)', 'أخفقن في الأولى'].map(q).join(',')];
      rows.forEach(r => lines.push([B.lesson(r.lesson).lesson, r.outcome, r.question, r.missing ? '' : r.n, r.pct[0] ?? '', r.pct[1] ?? '', r.pct[2] ?? '',
        r.missing ? 'لا سؤال مقابل في الموقع' : r.failAll.map(w => w.name).join('، '), r.failFirst.map(w => w.name).join('، ')].map(q).join(',')));
      const res = await MDQ.saveFile('نواتج_التعلم_ومدى_تحققها.csv', new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      $('#tmsg').innerHTML = `<div class="banner info" style="margin-bottom:12px">${res === 'declined' ? 'أُلغي حفظ الملف.' : 'جُهّز ملف نواتج التعلم.'}</div>`;
    };
  }

  /* ---------------- وكيل الأهداف ---------------- */
  function goalsView(body) {
    const model = A.build(st.data.events, st.data.students, {});
    if (!model.students.length) { body.innerHTML = empty(); return; }
    MDQ.goals.view(body, { model, esc, pill, T, I, B, render, openStudent: id => { st.student = id; render(); }, msg: t => { $('#tmsg').innerHTML = `<div class="banner info" style="margin-bottom:12px">${esc(t)}</div>`; } });
  }

  /* ---------------- أداة الرصد (استشارية — للمعلمة فقط) ---------------- */
  function agentView(body, m) {
    if (!m.students.length) { body.innerHTML = empty(); return; }
    if (MDQ.agent.stopped()) { body.innerHTML = `<div class="banner info"><div>أداة الرصد متوقفة بقرارك. لا تُعرض فئات ولا مسارات.<br><button class="btn small" id="agResume" style="margin-top:8px">استئناف الأداة</button></div></div>`; $('#agResume').onclick = () => { MDQ.agent.resume(); render(); }; return; }
    const R = MDQ.agent.run(m, st.data), Ag = MDQ.agent;
    const tierCls = { 'متميزة': 'ok', 'متقدمة': 'ok', 'في الطريق': 'mid', 'تحتاج دعمًا': 'low' };
    body.innerHTML = `
      <div class="banner info" style="margin-bottom:14px">أداة رصد استشارية بقواعد ثابتة (ليست وكيل ذكاء اصطناعي بتعريف المركز الوطني): تحلّل وتقترح فقط. لا يعدّل الأسئلة ولا المحتوى ولا بيانات الطالبات، ولا يرسل شيئًا خارج هذا المتصفح. كل مقترح مسار يحتاج اعتمادك، ويُسجَّل قرارك. الفئات وصفية وليست درجات رسمية. <b>تنبيه صلاحية:</b> الأجهزة ليست مشتركة بين المجموعات؛ لكل طالبة جهازها في المركز، فقد تعكس إجابات الطالبة المسجَّلة أداءها وحدها؛ فاقرئي «أعلى النتائج» والفئات بحذر قبل أي قرار.</div>
      <div class="row" style="margin-bottom:12px"><button class="btn ghost small" id="agStop">إيقاف الأداة</button><button class="btn ghost small" id="agWipe">مسح سجل قراراتي</button></div>
      ${MDQ.agent.cardHTML(esc)}
      ${govCard()}
      <section class="panel card"><h2>فحص جودة البيانات</h2>
        ${R.quality.issues.length ? `<ul>${R.quality.issues.map(i => `<li><span class="pill ${i.lvl === 'warn' ? 'mid' : 'na'}">${i.lvl === 'warn' ? 'انتبهي' : 'معلومة'}</span> ${esc(i.t)}</li>`).join('')}</ul>` : '<p>لا ملاحظات على جودة البيانات.</p>'}
        <p class="muted small-print">هذا الفحص لا يحذف شيئًا؛ يعرض ما يستحق مراجعتك قبل تفسير النتائج.</p></section>
      <section class="panel card" style="margin-top:16px"><h2>فئات التميّز</h2>
        <p class="muted small-print">${esc(R.tiers.formula)} ${R.tiers.notEligible ? `لم تُصنَّف ${R.tiers.notEligible} طالبة (أجبن أقل من ٥ أسئلة).` : ''} ${R.tiers.tieAtTop ? 'يوجد تعادل في الفئة العليا، فلا تُرقَّم المراكز.' : ''}</p>
        <div class="banner info" style="margin:8px 0"><div><b>أعلى النتائج (أعلى ١٠ مع التعادل — ${R.tiers.leaders.length} طالبة):</b><br>${R.tiers.leaders.map(r => `<button class="linkish" data-sid="${esc(r.s.studentId)}">${esc(r.s.name)}</button> <small class="muted num">${r.score}</small>`).join('، ')}</div></div>
        <div class="grid2">${R.tiers.order.map(o => `<details><summary><span class="pill ${tierCls[o]}">${o}</span> <span class="num">${R.tiers.groups[o].length}</span></summary>
          <p>${R.tiers.groups[o].map(r => `<button class="linkish" data-sid="${esc(r.s.studentId)}">${esc(r.s.name)}</button> <small class="muted num" title="${esc(Ag.explain(r.s).text)}">${r.score}</small>`).join('، ') || '<span class="muted">لا يوجد</span>'}</p></details>`).join('')}</div>
        <details style="margin-top:8px"><summary>لماذا هذه الدرجة؟ (مثال من أول طالبة مصنَّفة)</summary><p class="small-print">${(() => { const f = R.tiers.order.map(o => R.tiers.groups[o][0]).find(Boolean); return f ? esc(f.s.name + ': ' + Ag.explain(f.s).text) : 'لا توجد طالبات مصنَّفات.'; })()}</p><p class="muted small-print">مرّري المؤشر فوق أي درجة لقراءة تفصيلها.</p></details></section>
      <section class="panel card" style="margin-top:16px"><h2>مقارنة الفصول (فحص إنصاف)</h2>
        ${R.byClass.note ? `<div class="banner info" style="margin-bottom:8px">${esc(R.byClass.note)}</div>` : ''}
        <div class="t-scroll" style="max-height:none"><table class="t-table"><thead><tr><th>الفصل</th><th>مصنَّفات</th><th>متوسط الدرجة</th><th>٪ تحتاج دعمًا</th><th>٪ متميزة</th></tr></thead><tbody>${R.byClass.rows.map(x => `<tr><td>${esc(x.cls)}${x.small ? ' <small class="muted">(عدد صغير)</small>' : ''}</td><td class="num">${x.n}</td><td class="num">${x.avg}</td><td class="num">${x.supportPct}</td><td class="num">${x.topPct}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted small-print">الفروق بين الفصول لا تعني بالضرورة فرقًا في التعلم؛ تتأثر بوقت التسجيل والأجهزة وعدد الأسئلة المجابة.</p></section>
      <section class="panel card" style="margin-top:16px"><h2>مسار التقدم بين المراحل</h2>
        <div class="t-scroll" style="max-height:none"><table class="t-table"><thead><tr><th>المرحلة</th><th>بدأن</th><th>أكملن</th><th>توقفن قبل الإكمال</th></tr></thead><tbody>
        ${R.funnel.map(f => `<tr><td>${esc(f.lesson.stage)}<br><small class="muted">${esc(f.lesson.lesson)}</small></td><td class="num">${f.started}</td><td class="num">${f.done}</td><td class="num">${f.dropped}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="panel card" style="margin-top:16px"><h2>تحليل الأسئلة (للمراجعة البشرية)</h2>
        <div class="t-scroll" style="max-height:340px"><table class="t-table"><thead><tr><th>السؤال</th><th>المفهوم</th><th>أجبن</th><th>صواب من الأولى</th><th>متوسط الأخطاء</th><th>ملاحظة</th></tr></thead><tbody>
        ${R.items.map(i => `<tr><td>${esc(i.def ? i.def.no : i.qid)}</td><td>${esc(i.concept)}</td><td class="num">${i.n}</td><td>${pill(i.firstPct)}</td><td class="num">${i.avgWrong}</td><td>${esc(i.flag)}</td></tr>`).join('')}</tbody></table></div>
        <p class="muted small-print">لا يُعدَّل أي سؤال تلقائيًا؛ الملاحظات لتقرري أنتِ.</p></section>
      <section class="panel card" style="margin-top:16px"><h2>مسارات تعلم مقترحة (بانتظار اعتمادك)</h2>
        <p class="muted small-print">مبنية من محتوى الدروس القائم ونواتجه فقط. «اعتماد» علامة متابعة خاصة بكِ تُسجَّل في هذا المتصفح (مع لقطة المسار والفئة وقتها) ولا يصل منها شيء للطالبة. يمكنكِ تنزيل السجل بملف CSV لحفظه.</p>
        ${(() => { const card = p => { const d = MDQ.agent.decisionOf(p.studentId); return `<div class="wq" data-p="${esc(p.studentId)}"><b>${esc(p.name)}</b> <small class="muted">${esc(p.className || '')}</small>
          <ol style="margin:6px 0">${p.steps.map(x => `<li><span class="pill na">${x.kind}</span> ${esc(x.text)}</li>`).join('')}</ol>
          <span class="row"><input class="t-input" data-note placeholder="ملاحظتكِ (اختياري)" style="max-width:260px" value="${esc(d ? d.note : '')}"><button class="btn small" data-dec="approved">اعتماد</button><button class="btn ghost small" data-dec="rejected">رفض</button>
          <small class="muted">${d ? 'القرار: ' + (d.decision === 'approved' ? 'معتمد' : 'مرفوض') + ' · ' + esc(T(d.at)) : 'لم يُقرَّر بعد'}</small></span></div>`; };
          const rem = R.paths.filter(p => p.steps.some(x => x.kind === 'علاج')), oth = R.paths.filter(p => !p.steps.some(x => x.kind === 'علاج'));
          return `<details open><summary><b>تحتاج علاجًا (${rem.length})</b></summary>${rem.map(card).join('') || '<p class="muted">لا يوجد.</p>'}</details>
            <details><summary><b>إكمال / تقدّم / إثراء (${oth.length})</b></summary>${oth.map(card).join('') || '<p class="muted">لا يوجد.</p>'}</details>`; })()}
        </section>
      <section class="panel card" style="margin-top:16px"><h2>سجل قراراتكِ (${MDQ.agent.audit().length})</h2>
        <p class="muted small-print">محفوظ في هذا المتصفح فقط؛ نزّليه للاحتفاظ به. مسحُ بيانات المتصفح يحذفه.</p>
        <div class="t-scroll" style="max-height:260px"><table class="t-table"><thead><tr><th>الوقت</th><th>الطالبة</th><th>القرار</th><th>ملاحظة</th><th>الفئة وقتها</th></tr></thead><tbody>
        ${MDQ.agent.audit().slice(-50).reverse().map(x => `<tr><td class="num">${esc(T(x.at))}</td><td>${esc(nameOf(x.studentId))}</td><td>${x.decision === 'approved' ? 'معتمد' : 'مرفوض'}</td><td>${esc(x.note || '')}</td><td>${esc(x.snap ? x.snap.tier : '')}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">لا قرارات بعد.</td></tr>'}</tbody></table></div>
        <div class="row" style="margin-top:8px"><button class="btn gold small" id="xAudit">${I.download} تنزيل السجل (CSV)</button></div></section>
      <section class="panel card" style="margin-top:16px"><h2>ملخص مجهَّل الهوية للذكاء الاصطناعي (اختياري)</h2>
        <p class="muted small-print">بلا أسماء ولا رموز. انسخيه إن رغبتِ بتحليل إضافي بأداة خارجية؛ لا تلصقي فيها أسماء الطالبات.</p>
        <textarea class="t-input" id="agSum" rows="7" readonly style="width:100%">${esc(MDQ.agent.pseudoSummary(m))}</textarea></section>`;
    body.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => { st.student = b.dataset.sid; render(); });
    body.querySelectorAll('[data-p] [data-dec]').forEach(b => b.onclick = () => {
      const card = b.closest('[data-p]'), id = card.dataset.p, p = R.paths.find(x => x.studentId === id);
      const tr = [].concat(...R.tiers.order.map(o => R.tiers.groups[o].map(r => ({ id: r.s.studentId, tier: o, score: r.score })))).find(x => x.id === id) || {};
      MDQ.agent.decide(id, b.dataset.dec, (card.querySelector('[data-note]') || {}).value || '', { tier: tr.tier || '', score: tr.score == null ? '' : tr.score, steps: p ? p.steps.map(x => x.kind + ': ' + x.text) : [], source: (st.data && st.data.fileName) || '' });
      render();
    });
    $('#agStop').onclick = () => { MDQ.agent.stop(); render(); };
    $('#agWipe').onclick = () => { if (confirm('يمسح هذا سجل قراراتكِ المحفوظ في هذا المتصفح (أداة الرصد). متابعة؟')) { MDQ.agent.wipe(); render(); } };
    $('#xAudit').onclick = async () => {
      const res = await MDQ.saveFile('سجل_قرارات_أداة_الرصد.csv', new Blob([MDQ.agent.auditCsv(nameOf)], { type: 'text/csv;charset=utf-8' }));
      $('#tmsg').innerHTML = `<div class="banner info" style="margin-bottom:12px">${res === 'declined' ? 'أُلغي حفظ الملف.' : 'جُهّز ملف سجل القرارات.'}</div>`;
    };
  }
  function govCard() {
    const g = (window.MDQ_CONFIG || {}).GOVERNANCE || {};
    const val = v => v ? esc(v) : '<span class="pill mid">لم تُحدَّد بعد — يُكمَل في js/config.js</span>';
    return `<section class="panel card" style="margin-bottom:16px"><h2>بطاقة التصنيف والحوكمة</h2>
      <div class="t-scroll" style="max-height:none"><table class="t-table"><tbody>
      <tr><th>التصنيف</th><td>${val(g.classification)}</td></tr>
      <tr><th>الغرض</th><td>مساعدة المعلمة على رصد التعثر والتميّز وتخطيط الدعم؛ لا تُستخدم للدرجات الرسمية ولا للجزاءات ولا لقرارات القبول.</td></tr>
      <tr><th>المسؤول</th><td>${val(g.owner)}</td></tr>
      <tr><th>البيانات المستخدمة</th><td>ردود نموذج Google التي تستوردينها (اسم، فصل، رمز، إجابات، أوقات). لا تُرسل خارج هذا المتصفح.</td></tr>
      <tr><th>حدود الأداة</th><td>قواعد ثابتة ومعادلة معلنة؛ تتأثر بالتسجيل المكرر؛ ولكل طالبة جهازها فتعكس الإجابات أداءها الفردي في الغالب؛ لم يُقَس أثرها على التعلم بعد.</td></tr>
      <tr><th>التصحيح والإيقاف</th><td>القرار لكِ دائمًا. تُوقف الأداة بتغيير <span class="ltr">FEATURES.agent</span> إلى <span class="ltr">false</span>. طلبات الطالبات/أولياء الأمور للتصحيح أو الحذف تصل إليكِ مباشرة.</td></tr>
      <tr><th>مدة الاحتفاظ بالبيانات</th><td>${val(g.retention)}</td></tr>
      <tr><th>إشعار أولياء الأمور</th><td>${val(g.guardianNotice)}</td></tr>
      </tbody></table></div></section>`;
  }
  function nameOf(id) { const s = (st.data && st.data.events || []).find(e => e.studentId === id && e.studentName); return s ? s.studentName : id; }

  /* ---------------- سجل المحاولات ---------------- */
  function attemptsView(body, m) {
    if (!m.attemptRows.length) { body.innerHTML = empty(); return; }
    const per = 100, rows = m.attemptRows.slice().reverse(), pages = Math.ceil(rows.length / per), pg = Math.min(st.page, pages - 1);
    body.innerHTML = `<div class="row" style="margin-bottom:8px"><span class="muted grow num">${rows.length} محاولة · الأحدث أولًا · كل محاولة صف مستقل</span>
      ${pages > 1 ? `<button class="btn ghost small" id="pPrev" ${pg === 0 ? 'disabled' : ''}>السابق</button><span class="num">${pg + 1}/${pages}</span><button class="btn ghost small" id="pNext" ${pg >= pages - 1 ? 'disabled' : ''}>التالي</button>` : ''}</div>
      <div class="t-scroll"><table class="t-table"><thead><tr><th>الوقت</th><th>الطالبة</th><th>الفصل</th><th>الدرس</th><th>السؤال</th><th>المفهوم</th><th>الإجابة</th><th>النتيجة</th><th>المحاولة</th><th>تلميحات</th><th>XP</th></tr></thead><tbody>
      ${rows.slice(pg * per, pg * per + per).map(a => `<tr><td class="num">${T(a.time)}</td><td><button class="linkish" data-sid="${esc(a.studentId)}">${esc(a.studentName)}</button></td><td>${esc(a.className || '—')}</td><td>${esc(a.lesson)}</td><td>${esc(a.qNo)}</td><td>${esc(a.concept)}</td><td>${esc(a.chosen)}</td><td><span class="pill ${a.isCorrect ? 'ok' : 'low'}">${a.isCorrect ? 'صحيحة' : 'خاطئة'}</span></td><td class="num">${a.attemptNo}</td><td class="num">${a.hints}</td><td class="num">${a.xp}</td></tr>`).join('')}
      </tbody></table></div>`;
    const p = $('#pPrev'), n = $('#pNext');
    if (p) p.onclick = () => { st.page = pg - 1; render(); };
    if (n) n.onclick = () => { st.page = pg + 1; render(); };
    body.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => { st.student = b.dataset.sid; render(); });
  }

  /* ---------------- التصدير ---------------- */
  function exportView(body, m) {
    body.innerHTML = `
      <p class="muted" style="margin-bottom:12px">${st.demo ? 'التصدير هنا من البيانات التجريبية.' : 'كل ملف يُبنى من السجل المركزي في Google Drive لحظة الضغط (بعد «تحديث البيانات»)، وليس من بيانات هذا الجهاز.'} المرشحات أعلاه تُطبَّق على التصدير.</p>
      <div class="export-grid">
        <div class="panel card"><h2>جميع بيانات الطالبات</h2><p class="muted">ملخص الأداء، وسجل المحاولات، وجوانب الضعف، والجلسات.</p><button class="btn gold" data-x="all">${I.download} تصدير Excel</button></div>
        <div class="panel card"><h2>سجل محاولات طالبة</h2><select class="t-input" id="xS">${m.students.map(s => `<option value="${esc(s.studentId)}">${esc(s.name)} — ${esc(s.className || '')} ${esc(s.code || '')}</option>`).join('')}</select><button class="btn gold" data-x="student">${I.download} تصدير Excel</button></div>
        <div class="panel card"><h2>نتائج درس لجميع الطالبات</h2><select class="t-input" id="xL">${B.LESSONS.map(l => `<option value="${l.id}">${esc(l.lesson)}</option>`).join('')}</select><button class="btn gold" data-x="lesson">${I.download} تصدير Excel</button></div>
        <div class="panel card"><h2>تقرير جوانب الضعف</h2><p class="muted">المفاهيم الأضعف، والأسئلة المتكرر خطؤها، والطالبات اللاتي يحتجن مراجعة، والمقترحات.</p><button class="btn gold" data-x="weakness">${I.download} تصدير Excel</button></div>
        <div class="panel card"><h2>ملخص الأداء حسب الفصل</h2><p class="muted">الإكمال والإتقان لكل درس في كل فصل.</p><button class="btn gold" data-x="class">${I.download} تصدير Excel</button></div>
      </div>`;
    body.querySelectorAll('[data-x]').forEach(b => b.onclick = () => doExport(b.dataset.x, m, { studentId: ($('#xS') || {}).value, lesson: ($('#xL') || {}).value }));
  }
  async function doExport(kind, m, o) {
    const msg = $('#tmsg');
    msg.innerHTML = '<div class="banner info" style="margin-bottom:12px">جارٍ إنشاء الملف…</div>';
    try {
      if (!m.students.length) throw new Error('لا توجد بيانات للتصدير بالمرشحات الحالية.');
      const f = st.f;
      const ft = [f.q && 'بحث: ' + f.q, f.cls && 'الفصل: ' + f.cls, f.lesson && 'الدرس: ' + B.lesson(f.lesson).lesson, f.from && 'من ' + f.from, f.to && 'إلى ' + f.to].filter(Boolean).join(' · ');
      const r = await MDQ.excel.build(kind, m, Object.assign({ demo: st.demo, filtersText: ft, source: st.forms ? 'ملف ردود نموذج Google: ' + st.data.fileName : 'السجل المركزي في Google Drive' }, o));
      const res = await MDQ.saveFile(r.name, r.blob);
      msg.innerHTML = `<div class="banner info" style="margin-bottom:12px">${res === 'declined' ? 'أُلغي حفظ الملف.' : `جُهّز الملف «${esc(r.name)}» (${Math.round(r.blob.size / 1024)} ك.ب).`}</div>`;
    } catch (e) { msg.innerHTML = `<div class="banner bad" style="margin-bottom:12px">تعذر التصدير: ${esc(e.message || e)}</div>`; }
  }

  /* ---------------- بنك الأسئلة ---------------- */
  function bankView(body) {
    const s = MDQ.settings.get();
    const en = new Set(s.enabledSuggested || []), dis = new Set(s.disabledFile || []);
    const flags = B.REVIEW_FLAGS;
    body.innerHTML = `
      <section class="panel card" style="margin-bottom:16px"><h2>قائمة مراجعة المعلمة قبل الاعتماد</h2>
        <p class="muted" style="margin-bottom:8px">لم يُعدَّل أي مفتاح إجابة. ملاحظات على الصياغة أو الدقة العلمية لتقرري بشأنها.</p>
        <div class="t-scroll" style="max-height:none"><table class="t-table"><thead><tr><th>السؤال</th><th>الأولوية</th><th>الملاحظة</th></tr></thead><tbody>
        ${flags.map(f => { const q = f.qid && B.question(f.qid); return `<tr><td>${q ? `${esc(B.lesson(q.lesson).lesson)} — ${esc(q.no)}` : 'عام'}</td><td>${esc(f.level)}</td><td>${esc(f.note)}</td></tr>`; }).join('')}
        </tbody></table></div></section>
      ${B.LESSONS.map(l => `<h2 style="font-size:1.25rem;margin:18px 0 8px">${esc(l.stage)} · ${esc(l.lesson)}</h2>
        <div class="qbank ${l.color}">${B.QUESTIONS.filter(q => q.lesson === l.id).map(q => {
          const f = flags.find(x => x.qid === q.id);
          const active = q.source === 'file' ? !dis.has(q.id) : en.has(q.id);
          return `<article class="panel qitem ${f ? 'flagged' : ''}">
            <div class="qmeta"><span class="tag">${esc(q.no)}</span><span class="tag ltr">${q.id}</span><span class="tag concept">${esc(q.concept)}</span><span class="tag">${q.source === 'file' ? 'من ملف المعلمة' : 'أسئلة إضافية مقترحة'}</span></div>
            <p style="font-weight:700">${esc(q.text)}</p>
            <ol style="margin:0;padding-inline-start:22px">${q.options.map(o => `<li style="${o.k === q.answer ? 'color:var(--ok);font-weight:700' : ''}">${esc(o.text)}${o.k === q.answer ? ' ← المفتاح المعتمد' : ''}</li>`).join('')}</ol>
            ${q.correction ? `<p><b>التصويب:</b> ${esc(q.correction)}</p>` : ''}
            <details><summary>التلميحات والشرح</summary><p><b>تلميح 1:</b> ${esc(q.hint1)}</p><p><b>تلميح 2:</b> ${esc(q.hint2)}</p><p><b>شرح:</b> ${esc(q.teach)}</p></details>
            ${f ? `<div class="flag">${esc(f.note)}</div>` : ''}
            <label class="switch"><input type="checkbox" data-qtoggle="${q.id}" data-src="${q.source}" ${active ? 'checked' : ''}> ${q.source === 'file' ? 'السؤال مفعّل' : 'اعتماد السؤال وإظهاره للطالبات'}</label>
          </article>`; }).join('')}</div>`).join('')}
      <button class="btn" id="saveBank" style="margin-top:12px">حفظ اختيارات بنك الأسئلة</button>`;
    $('#saveBank').onclick = () => {
      const s2 = MDQ.settings.get(); s2.enabledSuggested = []; s2.disabledFile = [];
      body.querySelectorAll('[data-qtoggle]').forEach(c => {
        if (c.dataset.src === 'suggested' && c.checked) s2.enabledSuggested.push(c.dataset.qtoggle);
        if (c.dataset.src === 'file' && !c.checked) s2.disabledFile.push(c.dataset.qtoggle);
      });
      persist(s2);
    };
  }

  /* ---------------- الإعدادات ---------------- */
  function settingsView(body) {
    const s = MDQ.settings.get();
    body.innerHTML = `
      <section class="panel card"><h2>النقاط والشارات</h2><div class="setgrid">
        <label>نقاط المحاولة الأولى<input class="t-input num" type="number" min="0" max="100" id="xp1" value="${s.xpFirst}"></label>
        <label>بعد التلميح الأول<input class="t-input num" type="number" min="0" max="100" id="xp2" value="${s.xpSecond}"></label>
        <label>بعد تلميحات إضافية<input class="t-input num" type="number" min="0" max="100" id="xp3" value="${s.xpLater}"></label>
        <label>معيار «نجمة الإتقان» %<input class="t-input num" type="number" min="1" max="100" id="mt" value="${s.masteryThreshold}"></label>
        <label>«المثابرة»: أسئلة مصححة بعد خطأ<input class="t-input num" type="number" min="1" max="20" id="pm" value="${s.persistenceMin}"></label>
      </div></section>
      <section class="panel card" style="margin-top:16px"><h2>بيانات الطالبة في البداية</h2><div class="setgrid">
        <label>حقل الفصل<select class="t-input" id="cf"><option value="optional" ${s.classField === 'optional' ? 'selected' : ''}>اختياري</option><option value="required" ${s.classField === 'required' ? 'selected' : ''}>إلزامي</option><option value="hidden" ${s.classField === 'hidden' ? 'selected' : ''}>مخفي</option></select></label>
        <label style="grid-column:span 2">قائمة الشعب (بفواصل)<input class="t-input" id="co" value="${esc((s.classOptions || []).join('، '))}" placeholder="3/1، 3/2"></label>
      </div></section>
      <section class="panel card" style="margin-top:16px"><h2>مواد شرح إضافية</h2><p class="muted">سطر لكل رابط: العنوان | الرابط</p>
        <div class="setgrid">${B.LESSONS.map(l => `<label>${esc(l.lesson)}<textarea class="t-input" rows="3" data-res="${l.id}">${esc(((s.resources || {})[l.id] || []).map(r => `${r.title} | ${r.url}`).join('\n'))}</textarea></label>`).join('')}</div></section>
      <div class="row" style="margin-top:16px"><button class="btn" id="saveSet">حفظ الإعدادات</button></div>`;
    const n = (id, d) => { const v = parseInt($('#' + id).value, 10); return isNaN(v) ? d : Math.max(0, v); };
    $('#saveSet').onclick = () => {
      const s2 = MDQ.settings.get();
      s2.xpFirst = n('xp1', 10); s2.xpSecond = n('xp2', 6); s2.xpLater = n('xp3', 3);
      s2.masteryThreshold = Math.min(100, n('mt', 80)); s2.persistenceMin = Math.max(1, n('pm', 2));
      s2.classField = $('#cf').value;
      s2.classOptions = $('#co').value.split(/[,،]/).map(x => x.trim()).filter(Boolean).slice(0, 40);
      s2.resources = {};
      body.querySelectorAll('[data-res]').forEach(t => { s2.resources[t.dataset.res] = t.value.split('\n').map(line => { const [title, url] = line.split('|').map(x => (x || '').trim()); return url && /^https?:\/\/|^resources\//.test(url) ? { title: title || url, url } : null; }).filter(Boolean).slice(0, 10); });
      persist(s2);
    };
  }
  async function persist(s2) {
    if (st.forms || (st.demo && !MDQ.api.enabled)) {
      const snip = 'DEFAULT_SETTINGS: ' + JSON.stringify(s2, null, 2) + ',';
      st.msg = '';
      render();
      const box = document.createElement('section');
      box.className = 'panel card'; box.style.marginTop = '16px';
      box.innerHTML = `<h2>انسخي الإعدادات إلى js/config.js</h2><p class="muted">في وضع نماذج Google لا يوجد خادم يحفظ الإعدادات؛ استبدلي كتلة DEFAULT_SETTINGS في ملف js/config.js بهذا النص ثم ارفعي الملف إلى GitHub لتطبيقها على جميع الأجهزة.</p><textarea class="t-input code-area" rows="10" readonly>${esc(snip)}</textarea><button class="btn small" id="cpSet">نسخ</button>`;
      $('#tbody').appendChild(box);
      $('#cpSet').onclick = () => copy(snip, $('#cpSet'));
      return;
    }
    const t = MDQ.teacherSession.get();
    if (!t) return gate('انتهت جلسة المعلمة، أدخلي الرقم السري مرة أخرى.');
    try { await MDQ.api.saveSettings(t.token, s2); MDQ.settings._remote = s2; MDQ.store.set(MDQ.KEYS.settings, s2); st.msg = 'حُفظت الإعدادات في الخادم وتطبق على جميع الأجهزة.'; }
    catch (e) { if (e.code === 'auth') { MDQ.teacherSession.clear(); return gate('انتهت جلسة المعلمة.'); } st.msg = 'تعذر الحفظ: ' + e.message; }
    render();
  }

  /* ---------------- الربط وDrive ---------------- */
  function copy(text, btn) {
    const done = () => { if (btn) { const o = btn.textContent; btn.textContent = 'نُسخ ✓'; setTimeout(() => btn.textContent = o, 1500); } };
    try { navigator.clipboard.writeText(text).then(done, () => { const t = btn && btn.previousElementSibling; if (t && t.select) t.select(); }); } catch (e) { const t = btn && btn.previousElementSibling; if (t && t.select) t.select(); }
  }
  function formsSetupView(body) {
    const F = MDQ.forms, cfg = F.cfg;
    body.innerHTML = `
      <section class="panel card"><h2>حالة الربط</h2>
        ${F.configured ? `<div class="banner info">الموقع مربوط بنموذج Google. كل محاولة تُرسل ردًّا مستقلًا إلى النموذج فيُحفظ صفًّا في جدول الردود في Drive. ${cfg.sheetUrl ? `<a href="${esc(cfg.sheetUrl)}" target="_blank" rel="noopener">فتح جدول الردود</a>` : ''}</div>`
          : '<div class="banner"><b>يتطلب إكمال إعداد الربط.</b>&nbsp;اتبعي الخطوات أدناه مرة واحدة.</div>'}
      </section>
      <section class="panel card" style="margin-top:16px"><h2>1) أنشئي النموذج</h2>
        <p>في <a href="https://forms.google.com" target="_blank" rel="noopener">forms.google.com</a> أنشئي نموذجًا فارغًا باسم «مغامرة المهارات الرقمية - بيانات الطالبات»، وأضيفي <b>${F.FIELDS.length} سؤالًا من نوع «إجابة قصيرة»</b> بهذه العناوين وبهذا الترتيب تمامًا (غير إلزامية):</p>
        <textarea class="t-input code-area" rows="7" readonly>${F.FIELDS.map(f => f[1]).join('\n')}</textarea><button class="btn small" id="cpTitles">نسخ العناوين</button>
        <p class="muted small-print">أو وفّري الوقت: شغّلي الملف <span class="ltr">backend/create-form.gs</span> مرة واحدة في script.google.com فيُنشئ النموذج وجدول الردود ويطبع الرابط المطلوب في الخطوة 3.</p>
      </section>
      <section class="panel card" style="margin-top:16px"><h2>2) إعدادات النموذج</h2>
        <ul class="steps-doc">
          <li>الإعدادات ← الردود: <b>جمع عناوين البريد الإلكتروني: لا تجمع</b>.</li>
          <li>ألغي «حصر الردود على مستخدمي مؤسستكِ» و«حصر الردود في رد واحد» (حتى ترسل الطالبات دون تسجيل دخول).</li>
          <li>تبويب «الردود» ← «ربط بجداول البيانات» ← جدول جديد. هذا هو السجل المركزي في Drive.</li>
        </ul>
      </section>
      <section class="panel card" style="margin-top:16px"><h2>3) الصقي الرابط المعبأ مسبقًا</h2>
        <p>في النموذج: ⋮ ← <b>الحصول على رابط معبأ مسبقًا</b> ← اكتبي حرف <b>x</b> في كل الأسئلة ← «الحصول على رابط» ← «نسخ الرابط»، ثم الصقيه هنا:</p>
        <input class="t-input ltr-plain" id="pre" placeholder="https://docs.google.com/forms/d/e/.../viewform?usp=pp_url&entry...">
        <label style="display:grid;gap:4px;margin-top:8px">رابط جدول الردود (اختياري)<input class="t-input ltr-plain" id="sheetUrl" value="${esc(cfg.sheetUrl || '')}" placeholder="https://docs.google.com/spreadsheets/d/..."></label>
        <div class="row" style="margin-top:10px"><button class="btn" id="genCfg">إنشاء الإعدادات</button></div>
        <div id="cfgOut"></div>
      </section>
      <section class="panel card" style="margin-top:16px"><h2>تغيير الرقم السري (اختياري)</h2>
        <p class="muted">لتغيير الرقم السري أدخلي رقمًا جديدًا وانسخي البصمة إلى <span class="ltr">pinHash</span> في config.js. البصمة لا تكشف الرقم.</p>
        <div class="row"><input class="t-input" id="newPin" type="password" inputmode="numeric" maxlength="12" style="max-width:200px"><button class="btn small" id="genPin">إنشاء البصمة</button></div><div id="pinOut"></div>
      </section>`;
    $('#cpTitles').onclick = () => copy(F.FIELDS.map(f => f[1]).join('\n'), $('#cpTitles'));
    $('#genCfg').onclick = () => {
      const out = $('#cfgOut');
      try {
        const c = F.parsePrefilled($('#pre').value);
        const snip = `FORMS: {\n    formUrl: '${c.formUrl}',\n    entries: ${JSON.stringify(c.entries)},\n    sheetUrl: '${($('#sheetUrl').value || '').trim().replace(/'/g, '')}',\n    pinHash: '${cfg.pinHash || ''}',\n    teacherSessionMin: ${cfg.teacherSessionMin || 60}\n  },`;
        out.innerHTML = `<div class="banner info" style="margin-top:10px">تم التعرف على ${c.entries.length} سؤالًا. استبدلي كتلة FORMS في ملف <span class="ltr">js/config.js</span> بهذا النص، ثم ارفعي الملف إلى GitHub.</div>
          <textarea class="t-input code-area" rows="8" readonly>${esc(snip)}</textarea><div class="row"><button class="btn small" id="cpCfg">نسخ</button><button class="btn small gold" id="testSend">إرسال رد تجريبي إلى النموذج</button><span id="testOut" class="muted"></span></div>`;
        $('#cpCfg').onclick = () => copy(snip, $('#cpCfg'));
        $('#testSend').onclick = async () => {
          const o = $('#testOut'); o.textContent = 'جارٍ الإرسال…';
          const now = new Date().toISOString();
          try {
            await F.send({ eventId: 'test-' + Date.now(), type: 'session_start', studentId: 'ST-CODETEST00', studentName: 'اختبار الربط', className: '', sessionId: 'S-test-' + Date.now(), clientTime: now }, c);
            o.textContent = 'أُرسل. افتحي جدول الردود وتأكدي من ظهور صف «اختبار الربط» (ثم احذفيه).';
          } catch (e) { o.textContent = 'تعذر الإرسال: ' + e.message; }
        };
      } catch (e) { out.innerHTML = `<div class="banner bad" style="margin-top:10px">${esc(e.message)}</div>`; }
    };
    $('#genPin').onclick = async () => {
      const v = $('#newPin').value.trim();
      if (!/^\d{4,12}$/.test(v)) { $('#pinOut').innerHTML = '<p class="auth-msg">الرقم من 4 إلى 12 خانة.</p>'; return; }
      const h = await F.pinHash(v);
      $('#pinOut').innerHTML = `<textarea class="t-input code-area" rows="2" readonly>pinHash: '${h}',</textarea><button class="btn small" id="cpPin">نسخ</button>`;
      $('#cpPin').onclick = () => copy(`pinHash: '${h}',`, $('#cpPin'));
    };
  }

  function connectView(body) {
    if (!MDQ.api.enabled) return formsSetupView(body);
    body.innerHTML = `
      <section class="panel card"><h2>حالة الربط</h2>
        ${MDQ.api.enabled ? `<div class="banner info">الموقع مربوط بخادم Apps Script. ${st.data.masterUrl ? `<a href="${esc(st.data.masterUrl)}" target="_blank" rel="noopener">فتح ملف السجل المركزي</a> · ` : ''}${st.data.driveFolderUrl ? `<a href="${esc(st.data.driveFolderUrl)}" target="_blank" rel="noopener">فتح مجلد Drive</a>` : ''}</div>
          <div class="row" style="margin-top:10px"><button class="btn small" id="ping">اختبار الاتصال</button><span id="pingOut" class="muted"></span></div>`
          : '<div class="banner"><b>يتطلب إكمال إعداد الربط.</b>&nbsp;لم يُضبط رابط الخادم في js/config.js بعد.</div>'}
      </section>
      <section class="panel card" style="margin-top:16px"><h2>خطوات الربط بـ Google Drive</h2>
        <ol class="steps-doc">
          <li>من حسابك في Google أنشئي ملف Google Sheets جديدًا (أي اسم).</li>
          <li><b>Extensions ← Apps Script</b>، احذفي المحتوى والصقي ملف <span class="ltr">backend/Code.gs</span> كاملًا، واحفظي.</li>
          <li><b>Project Settings ← Script properties</b>: أضيفي <span class="ltr">TEACHER_PIN</span> = الرقم السري الذي تختارينه (واختياريًا <span class="ltr">TEACHER_SESSION_MIN</span> = 60).</li>
          <li>اختاري الدالة <span class="ltr">setup</span> واضغطي Run ووافقي على الصلاحيات. يُنشأ مجلد «مغامرة المهارات الرقمية - بيانات الطالبات» وينتقل الملف إليه.</li>
          <li><b>Deploy ← New deployment ← Web app</b>: Execute as <b>Me</b>، Who has access <b>Anyone</b>. انسخي رابط /exec.</li>
          <li>ضعي الرابط في <span class="ltr">js/config.js</span> ثم ارفعي الموقع إلى GitHub Pages.</li>
          <li>اختبري: سجّلي طالبة تجريبية وأجيبي سؤالًا، ثم افتحي ورقة «المحاولات» في الملف المركزي وتأكدي من ظهور الصف.</li>
        </ol></section>`;
    const p = $('#ping');
    if (p) p.onclick = async () => { const o = $('#pingOut'); o.textContent = 'جارٍ…'; try { const r = await fetch(MDQ_CONFIG.BACKEND_URL + '?action=ping'); const j = await r.json(); o.textContent = j.ok ? (j.ready ? 'متصل ✓ والإعداد مكتمل' : 'متصل، لكن setup لم يُشغَّل') : 'رد غير متوقع'; } catch (e) { o.textContent = 'تعذر الاتصال: ' + e.message; } };
  }

  /* ---------------- بيانات تجريبية (للمعاينة قبل الربط فقط) ---------------- */
  function demoData() {
    const events = [], students = [];
    const names = ['ليان', 'جود', 'رهف', 'شهد', 'غلا', 'دانة', 'لمى', 'ريناد', 'جنى', 'سديم', 'وعد', 'تالا', 'رغد', 'مرام', 'ليان'];
    const hard = { 'cy-05': .45, 'cy-08': .5, 'dv-01': .65, 'db-03': .45, 'db-04': .5, 'db-07': .55, 'qr-04': .55, 'qr-06': .5, 'qr-08': .6 };
    const settings = MDQ.settings.get();
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const t0 = Date.now() - 5 * 864e5;
    names.forEach((n, i) => {
      const studentId = 'ST-demo-' + (1000 + i), code = 'DEMO' + String.fromCharCode(65 + i) + (i % 9 + 1);
      const name = 'تجريبية — ' + n, className = i % 2 ? '3/2' : '3/1';
      students.push({ studentId, code, name, className, firstSeen: '', lastLogin: '', lastActivity: '', folderUrl: '', fileUrl: '' });
      const skill = .45 + (i % 7) * .07;
      let t = t0 + i * 3 * 3600e3;
      const nStages = 1 + (i % 4);
      let sid = 'S-demo-' + i + '-1';
      const E = (type, d) => { t += 15000 + rnd() * 40000; const iso = new Date(t).toISOString(); events.push(Object.assign({ eventId: 'demo-' + events.length, type, studentId, sessionId: sid, studentName: name, className, lessonId: '', questionId: '', concept: '', choice: '', choiceText: '', correctKey: '', isCorrect: '', attemptNo: '', hintsUsed: '', xp: '', questionDone: '', durationSec: '', badgeId: '', clientTime: iso, riyadhTime: Tm.riyadh(iso) }, d)); };
      E('session_start', {});
      B.LESSONS.slice(0, nStages).forEach((l, li) => {
        if (li === 2) { t += 864e5; sid = 'S-demo-' + i + '-2'; E('session_start', {}); }
        E('stage_start', { lessonId: l.id });
        B.activeFor(l.id, settings).forEach(q => {
          const p = Math.min(.95, skill * (hard[q.id] ? hard[q.id] / .6 : 1.25));
          const wrong = q.options.map(o => o.k).filter(k => k !== q.answer);
          let k = 1;
          while (rnd() > p + (k - 1) * .2 && k <= wrong.length) {
            E('attempt', { lessonId: l.id, questionId: q.id, concept: q.concept, choice: wrong[k - 1], choiceText: B.optionText(q, wrong[k - 1]), correctKey: q.answer, isCorrect: false, attemptNo: k, hintsUsed: Math.min(k - 1, 3), xp: 0, questionDone: 'قيد المحاولة', durationSec: 20 + Math.round(rnd() * 60) });
            k++;
          }
          E('attempt', { lessonId: l.id, questionId: q.id, concept: q.concept, choice: q.answer, choiceText: B.optionText(q, q.answer), correctKey: q.answer, isCorrect: true, attemptNo: k, hintsUsed: Math.min(k - 1, 3), xp: MDQ.rules.xpFor(k, settings), questionDone: 'مكتمل', durationSec: 15 + Math.round(rnd() * 50) });
        });
        if (!(i % 5 === 0 && li === nStages - 1)) { E('stage_complete', { lessonId: l.id }); E('badge', { lessonId: l.id, badgeId: l.badge }); }
      });
      E('session_end', {});
    });
    return { students, events, driveFolderUrl: '', masterUrl: '', loadedAt: new Date().toISOString() };
  }

  window.MDQ = window.MDQ || {};
  MDQ.teacher = { mount };
})();
