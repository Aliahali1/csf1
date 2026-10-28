/* واجهة وكيل الأهداف في لوحة المعلمة */
(function () {
  const G = MDQ.goals;
  function view(body, ctx) {
    const { esc, pill, T, I, B, model } = ctx;
    const goals = G.list(), outcomes = MDQ.outcomes.ROWS.filter(r => r.qid), classes = G.classes(model);
    const lessonName = id => (B.lesson(id) || {}).lesson || id;
    const statusCls = s => ({ 'تحقق الهدف': 'ok', 'تحسّن': 'ok', 'لم يتحسن': 'low', 'بيانات قليلة': 'mid' }[s] || 'na');



    const resTable = rows => `<div class="t-scroll"><table class="t-table"><thead><tr><th>الهدف</th><th>الأساس (بيانات الموقع)</th><th>المتحقق (الاختبار البعدي)</th><th>المستهدف</th><th>الأثر</th><th>التوصيات</th></tr></thead><tbody>
      ${rows.map(x => `<tr><td>${esc(x.goal)}</td><td class="num">${esc(x.base)}</td><td class="num">${esc(x.after)}</td><td class="num">${esc(x.target)}</td><td>${esc(x.impact)}</td><td><ul style="margin:0;padding-inline-start:18px">${x.recs.map(t => `<li>${esc(t)}</li>`).join('')}</ul></td></tr>`).join('')}</tbody></table></div>`;

    /* ---- تحليل الاختبار البعدي (رفع واحد) ---- */
    const lessonOrder = { db: 'إنشاء قاعدة البيانات', query: 'الاستعلام والتقارير', device: 'حماية جهاز الحاسب', cyber: 'مقدمة في الأمن السيبراني' };
    const postAuto = () => {
      const P = MDQ.post, set = P.getSet();
      let h = `<section class="panel card" id="pAuto" style="margin-bottom:16px"><h2>تحليل الاختبار البعدي (ارفعي الملف مرة واحدة)</h2>
        <details><summary class="muted small-print">هيكل التحليل: كيف يعمل الوكيل فور رفع الملف</summary><ol class="small-print">
          <li><b>القراءة:</b> يقرأ ملف النتائج المُصدَّر من النموذج (اسم الطالبة، الفصل، ونقاط كل سؤال).</li>
          <li><b>مطابقة الأسئلة:</b> يطابق نص كل سؤال بسؤال الموقع، فيعرف ناتج التعلم تلقائيًا. تُحلَّل النواتج المذكورة في البعدي فقط.</li>
          <li><b>مطابقة الأسماء:</b> التام يُقبل، والمشابه أو غير المطابق أو المكرر يتوقف عنده ويطلب موافقتكِ.</li>
          <li><b>الأساس:</b> نتيجة الطالبة في الموقع من المحاولة الأولى. <b>المتحقق:</b> نقطة السؤال في البعدي. <b>المستهدف:</b> تحدّدينه (أو هدفكِ المسجّل للناتج).</li>
          <li><b>الأثر:</b> الفرق بالنقاط، ونسبة الأثر العائد، والمكسب المُطبَّع، ودلالة ماكنمار، ثم <b>التوصيات</b>. النواتج المتحققة قبليًا (≥${P.CEIL}٪) تُعلَّم «سقف» ولا يُحكم عليها بأثر.</li></ol></details>`;
      if (!set) return h + `<p class="muted small-print">ارفعي الملف كما صدّرتِه من النموذج (Excel أو CSV). يبقى في متصفحكِ ولا يُرسل لأي جهة، ويبدأ التحليل فور رفعه.</p>
        <div class="row"><input type="file" accept=".xlsx,.csv" id="pFile"><button class="btn gold" id="pGo">ارفعي وحلّلي</button></div></section>`;
      const A = P.analyze(set, model, goals), t = A.tally;
      h += `<p class="muted small-print">${esc(set.file)} · ${esc(T(set.at))} · ${t.rows} صفًا · ${set.items.length} ناتجًا مطابقًا${set.dups.length ? ' · سؤال مكرر في النموذج اعتمدتُ أوله فقط (' + esc(set.dups.join('، ')) + ')' : ''}${set.unmapped.length ? ' · أعمدة لم تُطابَق: ' + set.unmapped.length : ''}${t.empty ? ' · ' + t.empty + ' صف بلا اسم (تجاهلتُه)' : ''}</p>
        <div class="kpis num"><div class="panel kpi"><b>${t.exact}</b><small>مطابقة تامة</small></div><div class="panel kpi"><b>${t.byTeacher}</b><small>أقرّتها المعلمة</small></div><div class="panel kpi"><b>${t.excluded}</b><small>مستبعدة</small></div><div class="panel kpi"><b>${t.pending}</b><small>بانتظار قراركِ</small></div></div>
        <div class="row" style="margin:8px 0"><label>المستهدف الافتراضي ٪ <input type="number" id="pTar" min="1" max="100" value="${set.target}" class="t-input" style="width:80px"></label><button class="btn ghost small" id="pTarGo">طبّقي</button><span class="muted small-print">للنواتج التي لا هدف مسجّل لها؛ أما التي لها هدف فيُستخدم هدفها (ومقياسها).</span></div>`;
      const asks = A.ms.filter(m => m.needs);
      if (asks.length) {
        const all = model.students.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'));
        h += `<div class="banner bad" style="margin:8px 0"><div><b>توقفتُ وأحتاج قراركِ:</b> هذه الأسماء ليست مطابقة تامة لطالبات الموقع (أو مكررة). لن تدخل في التحليل حتى تقرّري، والتحليل أدناه يخص المقبولات فقط.</div></div>
          <div class="row" style="margin:6px 0"><label><input type="checkbox" id="pAll"> تحديد الكل</label><button class="btn small" data-xa="acc">اقبلي أقرب مرشح للمحددات</button><button class="btn ghost small" data-xa="x">استبعدي المحددات</button></div>
          <div class="t-scroll" style="max-height:320px"><table class="t-table"><thead><tr><th></th><th>الاسم في الملف</th><th>الحالة</th><th>القرار</th></tr></thead><tbody>
          ${asks.map(m => { const cs = m.cands.map(c => [c.s.studentId, `${c.s.name} · ${G.normCls(c.s.className)}${c.score < 1 ? ' · ' + Math.round(c.score * 100) + '٪' : ''}`]), rest = all.filter(x => !m.cands.some(c => c.s.studentId === x.studentId)).map(x => [x.studentId, `${x.name} · ${G.normCls(x.className)}`]);
            return `<tr data-xr="${esc(m.row.key)}"><td><input type="checkbox" data-xk></td><td>${esc(m.name)}</td><td><span class="pill ${m.status === 'similar' ? 'mid' : 'low'}">${esc(m.multi ? 'صفّان لطالبة واحدة' : stLbl[m.status])}</span></td>
              <td><select class="t-input" data-xd><option value="">— اختاري —</option><option value="x">استبعاد</option>${cs.length ? `<optgroup label="مرشحات">${optS(cs, '')}</optgroup>` : ''}<optgroup label="كل الطالبات">${optS(rest, '')}</optgroup></select></td></tr>`; }).join('')}</tbody></table></div>`;
      }
      const R = A.rows;
      h += `<h3 style="margin:12px 0 4px">نتائج الأثر لكل ناتج (${R.length} ناتجًا مذكورًا في الاختبار البعدي · ${A.accepted} طالبة مقبولة)</h3>
        <div style="overflow-x:auto"><table class="t-table"><thead><tr><th>الهدف (ناتج التعلم)</th><th>الأساس</th><th>المتحقق</th><th>المستهدف</th><th>الأثر</th><th>التوصيات</th></tr></thead><tbody>
        ${Object.keys(lessonOrder).map(l => { const rs = R.filter(x => x.lesson === l); if (!rs.length) return ''; return `<tr><td colspan="6" style="background:var(--surface-2,#f7eef6)"><b>${esc(lessonOrder[l])}</b></td></tr>` + rs.map(x =>
          `<tr><td>${esc(x.outcome)}${x.targeted ? ' <span class="pill ok">له هدف</span>' : ''}<br><span class="pill ${x.status === 'تحقق الهدف' || x.status === 'تحسّن' ? 'ok' : x.status === 'لم يتحسن' ? 'low' : 'mid'}">${esc(x.status)}</span></td>
            <td class="num">${x.base == null ? '—' : x.base + '٪'}</td><td class="num">${x.after == null ? '—' : x.after + '٪'}</td><td class="num">${x.target}٪</td>
            <td class="num">${x.n ? (x.gain >= 0 ? '+' : '') + x.gain + ' نقطة' + (x.ceil ? '' : ' · أثر ' + (x.roi == null ? '—' : x.roi + '٪') + (x.hake == null ? '' : ' · مكسب ' + x.hake + '٪')) + '<br><small class="muted">ن=' + x.n + ' · تحسّن ' + x.up + ' / تراجع ' + x.down + (x.p == null ? '' : ' · ف=' + (x.p < 0.001 ? '<0.001' : x.p.toFixed(3))) + '</small>' : '—'}</td>
            <td><ul style="margin:0;padding-inline-start:16px">${x.recs.map(r => `<li>${esc(r)}</li>`).join('')}</ul></td></tr>`).join(''); }).join('')}</tbody></table></div>`;
      if (A.did) h += `<div class="banner info" style="margin:8px 0"><div><b>مقارنة داخلية (مجموعة ضابطة بديلة):</b> متوسط تحسّن النواتج التي نفّذتِ عليها تدخلًا = <b>${A.did.t >= 0 ? '+' : ''}${A.did.t}</b> نقطة (${A.did.nt} نواتج)، مقابل <b>${A.did.c >= 0 ? '+' : ''}${A.did.c}</b> للنواتج الأخرى لنفس الطالبات (${A.did.nc} نواتج)؛ الفرق <b>${A.did.diff >= 0 ? '+' : ''}${A.did.diff}</b>. هذا أقرب لأثر التدخل لأن أثر التذكر يمس النوعين معًا.</div></div>`;
      else h += `<p class="muted small-print">المقارنة الداخلية (نواتج التدخل مقابل غيرها) تظهر حين يكون لديكِ هدف مسجّل لناتج واحد على الأقل وثلاثة نواتج أخرى دون السقف.</p>`;
      h += `<div class="banner info" style="margin:8px 0"><div><b>تنبيه قراءة:</b> الاختبار البعدي بنفس أسئلة الموقع، فجزء من التحسّن قد يكون تذكّرًا للإجابة لا تعلّمًا؛ والمقارنة وصفية ولا تثبت أن التدخل وحده هو السبب. النواتج المتحققة قبليًا لا تُظهر تحسّنًا بحكم السقف.</div></div>
        <h3 style="margin:10px 0 4px">طالبات لم يتحققن (حدّدي ثم نفّذي)</h3>
        <div class="row"><label>الناتج<select class="t-input" id="pOut">${R.filter(x => x.fail.length).map(x => `<option value="${esc(x.qid)}">${esc(x.outcome.slice(0, 70))} (${x.fail.length})</option>`).join('') || '<option value="">لا طالبات</option>'}</select></label>
          <label><input type="checkbox" id="pAllF"> تحديد الكل</label><button class="btn small" data-xa="copy">انسخي الأسماء</button><button class="btn small" data-xa="csv">قائمة CSV</button><button class="btn small" data-xa="print">قائمة دعم (Word)</button></div>
        <div id="pFail" class="t-scroll" style="max-height:220px"></div>
        <div class="row" style="margin-top:10px"><button class="btn gold small" data-xa="tbl">${I.download} تنزيل جدول الأثر (CSV)</button><button class="btn gold small" data-xa="rec">سجّلي النتائج في سجل الوكيل</button><button class="btn ghost small" data-xa="del">حذف ملف الاختبار البعدي</button></div></section>`;
      return h;
    };

    /* ---- الاختبار البعدي ---- */
    const PEND = (MDQ.post._pending = MDQ.post._pending || {});
    const optS = (arr, sel) => arr.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(t)}</option>`).join('');
    const stLbl = {exact: 'مطابق تام', similar: 'اسم مشابه', none: 'لا مطابق', dupe: 'اسم مكرر في الموقع', empty: 'اسم فارغ'};
    const postSection = g => {
      const P = MDQ.post, pend = PEND[g.id];
      let h = `<h3 style="margin:14px 0 4px">الاختبار البعدي وقياس الأثر</h3>`;
      if (!g.post && !pend) {
        return h + `<p class="muted small-print">ارفعي ملف Excel/CSV فيه عمود أسماء الطالبات وعمود نتيجة هذا الناتج. بيانات الطالبات في الموقع هي خط الأساس، والمستهدف (${g.target}٪) هو ما حدّدتِه. يبقى الملف في متصفحكِ ولا يُرسل لأي جهة.</p>
          <div class="row"><input type="file" accept=".xlsx,.csv" data-postfile><button class="btn small" data-act="postload">قراءة الملف</button></div>`;
      }
      if (!g.post && pend) {
        const sh = pend.shape, def = B.question(g.qid), vals = c => sh.rows.map(r => r.cells[c]);
        const vc = pend.valCol != null ? pend.valCol : (sh.valCols[0] ?? 0), mode = pend.mode || P.detectMode(vals(vc), def);
        return h + `<div class="banner info"><div><b>الملف:</b> ${esc(pend.file)} · ${sh.rows.length} صفًا. حدّدي الأعمدة ثم اضغطي «ابدئي المطابقة».</div></div>
          <div class="filters" style="display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:8px 0">
            <label>عمود الأسماء<select class="t-input" data-pn>${optS(sh.headers.map((x, i) => [i, x || 'عمود ' + (i + 1)]), sh.nameCol)}</select></label>
            <label>عمود نتيجة هذا الناتج<select class="t-input" data-pv>${optS(sh.headers.map((x, i) => [i, x || 'عمود ' + (i + 1)]), vc)}</select></label>
            <label>طريقة التصحيح<select class="t-input" data-pm>${optS([['choice', 'الخلية = الخيار المختار (يُصحَّح بمفتاح السؤال)'], ['score', 'الخلية = صح/خطأ أو 0/1 أو درجة']], mode)}</select></label>
            <label>الدرجة العظمى<input class="t-input" data-pmax type="number" min="1" value="${pend.max || 1}" style="width:80px"></label>
            <label>النجاح عند ٪<input class="t-input" data-ppass type="number" min="1" max="100" value="${pend.pass || 100}" style="width:80px"></label></div>
          <p class="muted small-print">معاينة (أول 3 صفوف): ${sh.rows.slice(0, 3).map(r => esc((r.cells[sh.nameCol] || '—') + ' ← ' + (r.cells[vc] || '—'))).join(' | ')}<br>في وضع «الخيار المختار» تُقبل الحروف (أ ب ج د) بترتيب خيارات السؤال في بنك الموقع، أو نص الخيار نفسه. راجعي المعاينة بعد المطابقة.</p>
          <div class="row"><button class="btn gold small" data-act="postgo">ابدئي المطابقة</button><button class="btn ghost small" data-act="postcancel">إلغاء</button></div>`;
      }
      const r = P.impact(g, g.post, model), t = r.tally, ok = !t.pending;
      const scopeSt = G.scope(model, g.cls, g.answers).students.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'));
      const asks = r.ms.filter(m => m.needs);
      h += `<p class="muted small-print">${esc(g.post.file)} · ${esc(T(g.post.at))} · العمود «${esc(g.post.valName)}»</p>
        <div class="kpis num"><div class="panel kpi"><b>${t.rows}</b><small>صفوف في الملف</small></div><div class="panel kpi"><b>${t.exact}</b><small>مطابقة تامة (قُبلت آليًا)</small></div>
          <div class="panel kpi"><b>${t.byTeacher}</b><small>أقرّتها المعلمة</small></div><div class="panel kpi"><b>${t.excluded}</b><small>مستبعدة</small></div>
          <div class="panel kpi"><b>${t.pending}</b><small>بانتظار قراركِ</small></div></div>`;
      if (asks.length) {
        h += `<div class="banner bad" style="margin:8px 0"><div><b>توقفتُ وأحتاج قراركِ:</b> الأسماء التالية ليست مطابقة تامة لطالبات الموقع (أو مكررة). لن تدخل في القياس حتى تقرّري.</div></div>
          <div class="t-scroll" style="max-height:340px"><div class="row" style="margin:6px 0"><label><input type="checkbox" data-allpend> تحديد الكل</label><button class="btn small" data-act="bulkacc">اقبلي أقرب مرشح للمحددات</button><button class="btn ghost small" data-act="bulkx">استبعدي المحددات</button><span class="muted small-print">حدّدي الطالبات ثم نفّذي الأمر دفعة واحدة، أو اختاري لكل اسم على حدة.</span></div><table class="t-table"><thead><tr><th></th><th>الاسم في ملف الاختبار</th><th>الحالة</th><th>القرار</th></tr></thead><tbody>
          ${asks.map(m => {
            const cs = m.cands.map(c => [c.s.studentId, `${c.s.name} · ${G.normCls(c.s.className)}${c.score < 1 ? ' · تشابه ' + Math.round(c.score * 100) + '٪' : ''}`]);
            const rest = scopeSt.filter(s => !m.cands.some(c => c.s.studentId === s.studentId)).map(s => [s.studentId, `${s.name} · ${G.normCls(s.className)}`]);
            const why = m.multi ? 'صفّان لطالبة واحدة' : stLbl[m.status];
            return `<tr data-row="${esc(m.row.key)}"><td><input type="checkbox" data-pk></td><td>${esc(m.name)}</td><td><span class="pill ${m.status === 'similar' ? 'mid' : 'low'}">${esc(why)}</span></td>
              <td><select class="t-input" data-dec><option value="">— اختاري —</option><option value="x">استبعاد هذه الطالبة</option>${cs.length ? `<optgroup label="مرشحات من الموقع">${optS(cs, m.final ? m.final.studentId : '')}</optgroup>` : ''}<optgroup label="كل طالبات النطاق">${optS(rest, '')}</optgroup></select></td></tr>`;
          }).join('')}</tbody></table></div>`;
      }
      const autos = r.ms.filter(m => m.final && !m.needs);
      h += `<details style="margin:6px 0"><summary class="muted small-print">الطالبات المقبولة في القياس (${autos.length}) — راجعي أنها صحيحة</summary><div class="t-scroll" style="max-height:220px"><table class="t-table"><tbody>
        ${autos.map(m => `<tr data-row="${esc(m.row.key)}"><td>${esc(m.name)}</td><td>${esc(m.final.name)}</td><td><span class="pill ${m.byTeacher ? 'mid' : 'ok'}">${m.byTeacher ? 'بقرارك' : 'تام'}</span></td><td><button class="linkish" data-undo>إلغاء القبول</button></td></tr>`).join('') || '<tr><td class="muted">لا شيء بعد.</td></tr>'}</tbody></table></div></details>`;
      if (ok) {
        const cls = r.status.startsWith('تحقق') ? 'ok' : r.status.startsWith('تحسّن') ? 'mid' : 'low';
        h += `<h3 style="margin:12px 0 4px">نتيجة قياس الأثر <span class="pill ${cls}">${esc(r.status)}</span></h3>
          ${resTable([P.row(g, model)])}
          <p>من ${r.n} طالبة مقارَنة: <b>${r.up}</b> انتقلت من «لم تتحقق» إلى «تحققت»، و<b>${r.down}</b> تراجعت، و<b>${r.stayLow.length}</b> لم تتحقق في الموقع ولا في البعدي.
          ${r.noBase ? ` · ${r.noBase} مقبولة بلا محاولات في الموقع على هذا السؤال (خارج المقارنة).` : ''}${r.noPost ? ` · ${r.noPost} بلا إجابة مفهومة في البعدي.` : ''}</p>
          <h3 style="margin:10px 0 4px">الطالبات: حدّدي ثم نفّذي أمرًا</h3>
          <div class="row" style="margin:4px 0"><label>عرض<select class="t-input" data-sfilter><option value="">الكل (${r.paired.length})</option><option value="low">لم تتحقق في البعدي (${r.paired.filter(p => !p.post).length})</option><option value="stay">لم تتحقق في الموقع ولا البعدي (${r.stayLow.length})</option><option value="down">تراجعت (${r.down})</option><option value="up">تحسّنت (${r.up})</option></select></label>
            <label><input type="checkbox" data-allst> تحديد المعروض</label>
            <button class="btn small" data-act="stcopy">انسخي أسماء المحددات</button><button class="btn small" data-act="stcsv">${I.download} قائمة المحددات (CSV)</button><button class="btn small" data-act="stprint">اطبعي قائمة دعم للمحددات</button></div>
          <div class="t-scroll" style="max-height:300px"><table class="t-table"><thead><tr><th></th><th>الطالبة</th><th>الفصل</th><th>الأساس</th><th>البعدي</th><th>التغير</th></tr></thead><tbody>
          ${r.paired.map(p => { const ch = !p.base.pass && p.post ? 'up' : p.base.pass && !p.post ? 'down' : (!p.base.pass && !p.post ? 'stay' : 'same');
            return `<tr data-st="${esc(p.s.studentId)}" data-tags="${[!p.post ? 'low' : '', ch].join(' ')}"><td><input type="checkbox" data-sk></td><td><button class="linkish" data-sid="${esc(p.s.studentId)}">${esc(p.name)}</button></td><td>${esc(G.normCls(p.s.className))}</td><td>${p.base.pass ? 'تحققت' : 'لم تتحقق'}</td><td>${p.post ? 'تحققت' : 'لم تتحقق'}</td><td><span class="pill ${ch === 'up' ? 'ok' : ch === 'down' || ch === 'stay' ? 'low' : 'na'}">${{ up: 'تحسّنت', down: 'تراجعت', stay: 'لم تتحقق', same: 'ثابتة' }[ch]}</span></td></tr>`; }).join('')}</tbody></table></div>
          <div class="banner info" style="margin:8px 0"><div><b>كيف تُقرأ النتيجة:</b> «الأثر العائد» = (البعدي − الأساس) ÷ (المستهدف − الأساس). أي ما أُغلق من الفجوة التي حدّدتِها (100٪ فأكثر = بلغتِ المستهدف). هذه مقارنة وصفية لنفس الطالبات؛ <b>لا تثبت أن التدخل وحده هو السبب</b> لأنه لا توجد مجموعة ضابطة، ولأن أداة الموقع (محاولات بتلميحات) تختلف عن الاختبار البعدي، وقد تدخل عوامل أخرى (تكرار الشرح، التعوّد على السؤال). تقرأها المعلمة مع ملاحظاتها.</div></div>
          <div class="row"><button class="btn gold small" data-act="postrec">سجّلي النتيجة في سجل الوكيل</button><button class="btn ghost small" data-act="postcsv">${I.download} تنزيل تفاصيل المقارنة (CSV)</button><button class="btn ghost small" data-act="postdel">حذف الاختبار البعدي</button></div>`;
      } else {
        h += `<div class="row"><button class="btn ghost small" data-act="postdel">حذف الاختبار البعدي</button></div>`;
      }
      return h;
    };

    const goalCard = g => {
      const ev = G.evaluate(g, model), dg = G.diagnose(model, g);
      const blocking = dg.clarify.filter(c => c.blocking && g.answers[c.id] == null);
      const open = dg.clarify.filter(c => g.answers[c.id] == null);
      const step = blocking.length || g.paused ? null : G.planStep(g, dg);
      const ms = G.mats().filter(m => m.goalId === g.id);
      const lastC = (g.cycles || []).slice(-1)[0];
      return `<section class="panel card" data-g="${esc(g.id)}" style="margin-bottom:16px">
        <div class="row"><h2 class="grow">${esc(g.outcome)}</h2><span class="pill ${statusCls(ev.status)}">${esc(g.paused ? 'متوقف' : ev.status)}</span></div>
        <p class="muted small-print">${esc(lessonName(B.question(g.qid).lesson))} · ${esc(g.cls || 'كل الفصول')} · ${g.metric === 'first' ? 'التحقق من الأولى' : 'التحقق حتى الثالثة'} · ${g.due ? 'حتى ' + esc(g.due) : 'بلا موعد'}${g.note ? ' · ' + esc(g.note) : ''}</p>
        <div class="kpis num"><div class="panel kpi"><b>${g.baseline.pct}٪</b><small>عند بدء الهدف (ن=${g.baseline.n})</small></div>
          <div class="panel kpi"><b>${ev.cur == null ? '—' : ev.cur + '٪'}</b><small>الآن (ن=${ev.n})</small></div>
          <div class="panel kpi"><b>${g.target}٪</b><small>المستهدف</small></div>
          <div class="panel kpi"><b>${ev.newPct == null ? '—' : ev.newPct + '٪'}</b><small>طالبات جدد بعد البدء (ن=${ev.newN})</small></div></div>
        ${g.paused ? '<div class="banner info">أوقفتِ الوكيل لهذا الهدف؛ لا تحليل ولا اقتراحات حتى تستأنفي.</div>' : `
        <h3 style="margin:10px 0 4px">ما رصده الوكيل</h3>
        ${dg.note ? `<p>${esc(dg.note)}</p>` : ''}
        ${dg.causes.length ? `<ul>${dg.causes.map(c => `<li><b>${esc(c.label)}</b> <span class="pill ${c.hits >= 3 ? 'low' : c.hits === 2 ? 'mid' : 'na'}">دليل ${esc(c.strength)}</span><br><small class="muted">${c.ev.map(esc).join(' · ')}</small></li>`).join('')}</ul>` : (dg.note ? '' : '<p class="muted">لا أسباب مرجّحة بالقواعد الحالية.</p>')}
        ${dg.failing && dg.failing.length ? `<details><summary class="muted small-print">طالبات لم يتحققن (${dg.failing.length})</summary>${dg.failing.map(f => `<button class="linkish" data-sid="${esc(f.id)}">${esc(f.name)}</button>`).join('، ')}</details>` : ''}
        ${open.map(c => `<div class="banner ${c.blocking ? 'bad' : 'info'}" style="margin:8px 0"><div><b>${c.blocking ? 'توقفتُ وأسألكِ:' : 'سؤال توضيحي:'}</b> ${esc(c.text)}<div class="row" style="margin-top:6px">${c.options.map(o => `<button class="btn small ${c.blocking ? '' : 'ghost'}" data-ans="${esc(c.id)}" data-k="${esc(o.k)}" data-l="${esc(o.label)}">${esc(o.label)}</button>`).join('')}</div></div></div>`).join('')}
        <h3 style="margin:10px 0 4px">الخطة المقترحة</h3>
        ${blocking.length ? '<p class="muted">لن أقترح خطة قبل أن تجيبي عن السؤال أعلاه؛ لا أفترض.</p>' : !step ? '<p class="muted">لا خطة مطلوبة الآن.</p>' : step.exhausted ?
          `<div class="banner bad"><div>جرّبنا الأسباب المرجّحة كلها (${step.tried.map(k => esc(G.CAUSES[k])).join('، ')}) دون تحسن كافٍ. لا أملك خطوة أخرى من المحتوى القائم؛ أحيلكِ لقرارك: راجعي السؤال والدرس أو غيّري الهدف.</div></div>` :
          `<p><b>الخطوة التالية:</b> معالجة «${esc(step.label)}» <span class="pill na">دليل ${esc(step.strength)}</span></p><ol>${step.actions.map(a => `<li>${esc(a)}</li>`).join('')}</ol>
          <div class="row"><button class="btn small" data-act="card">أنشئي بطاقة نشاط (مسودة)</button><button class="btn ghost small" data-act="prompt">انسخي موجّه نموذج لغوي (بلا بيانات طالبات)</button></div>`}
        ${lastC ? `<p class="muted small-print">آخر مراجعة: ${esc(T(lastC.at))} · من ${lastC.before}٪ إلى ${lastC.after}٪ · ${{ done: 'تحقق الهدف', improved: 'تحسّن', no: 'لم يتحسن' }[lastC.verdict]}</p>` : ''}
        <div class="row" style="margin-top:8px"><button class="btn gold small" data-act="review">نفّذتُ الخطوة وأعدتُ الاستيراد: راجعي</button></div>`}
        ${ms.length || !g.paused ? `<h3 style="margin:12px 0 4px">مواد الدعم</h3>
          <div class="row"><textarea class="t-input" data-paste rows="3" placeholder="الصقي هنا ناتج أداة الذكاء الاصطناعي لتحفظيه كمسودة للمراجعة" style="flex:1;min-width:240px"></textarea><button class="btn ghost small" data-act="paste">احفظي كمسودة</button></div>
          ${ms.map(m => `<div class="wq" data-m="${esc(m.id)}"><b>${esc(m.kind)}</b> <span class="pill ${m.status === 'معتمدة' ? 'ok' : 'mid'}">${esc(m.status)}</span> <small class="muted">${esc(T(m.createdAt))}</small>
            <pre style="white-space:pre-wrap;font-family:inherit;margin:6px 0">${esc(m.text)}</pre>
            ${m.status === 'معتمدة' ? '<button class="btn gold small" data-act="dl">تنزيل للطباعة (Word)</button>' : `<div class="small-print">مراجعة بشرية قبل الاعتماد:<br>
              <label><input type="checkbox" data-chk> مطابقة لمحتوى الكتاب ولا تحوي معلومة خارجه</label><br>
              <label><input type="checkbox" data-chk> تقيس ناتج التعلم نفسه وبالمستوى نفسه</label><br>
              <label><input type="checkbox" data-chk> سليمة لغويًا ومناسبة للصف الثالث المتوسط</label></div>
              <button class="btn small" data-act="approve">اعتماد</button>`}</div>`).join('')}` : ''}
        ${g.paused ? '' : postSection(g)}
        <div class="row" style="margin-top:10px"><button class="btn ghost small" data-act="pause">${g.paused ? 'استئناف الوكيل' : 'إيقاف الوكيل لهذا الهدف'}</button><button class="btn ghost small" data-act="del">حذف الهدف</button></div>
      </section>`;
    };

    body.innerHTML = `
      <div class="banner info" style="margin-bottom:14px"><div><b>تفويض الوكيل (استقلالية 1).</b> يقرأ ردود الطالبات التي استوردتِها، ويحلّل ويشخّص ويقترح ويسأل. <b>لا</b> يرسل شيئًا للطالبات أو لأي خدمة خارجية، ولا يعدّل الأسئلة أو الدروس أو البيانات، ولا يقرر درجات. كل مادة دعم مسودة حتى تعتمديها. يُخزَّن عمله في هذا المتصفح فقط. محرّكه قواعد ثابتة معلنة وعتباتها إرشادية غير مُعايَرة.</div></div>
      <section class="panel card" style="margin-bottom:16px"><h2>هدف جديد</h2>
        <div class="filters" style="display:flex;flex-wrap:wrap;gap:10px;align-items:end">
          <label style="flex:2;min-width:260px">ناتج التعلم<select id="gOut" class="t-input">${['db', 'query', 'device', 'cyber'].map(l => `<optgroup label="${esc(lessonName(l))}">${outcomes.filter(o => o.lesson === l).map(o => `<option value="${esc(o.qid)}">${esc(o.outcome.slice(0, 90))}</option>`).join('')}</optgroup>`).join('')}</select></label>
          <label>الفصل<select id="gCls" class="t-input"><option value="">كل الفصول</option>${classes.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
          <label>المقياس<select id="gMet" class="t-input"><option value="first">التحقق من الأولى</option><option value="by3">التحقق حتى الثالثة</option></select></label>
          <label>المستهدف ٪<input id="gTar" type="number" min="1" max="100" value="80" class="t-input" style="width:80px"></label>
          <label>الموعد<input id="gDue" type="date" class="t-input"></label>
          <label style="flex:1;min-width:160px">ملاحظة<input id="gNote" class="t-input" placeholder="اختياري"></label>
          <button class="btn gold" id="gGo">ابدئي الهدف</button></div>
        <p class="muted small-print">يحسب الوكيل خط الأساس الآن من بياناتكِ، ثم يشخّص ويقترح. بعد تنفيذ الخطوة وإعادة استيراد الردود اضغطي «راجعي» ليقيّم الأثر ويعدّل مساره.</p></section>
      ${postAuto()}
      ${goals.some(x => x.post) ? `<section class="panel card" style="margin-bottom:16px"><h2>ملخص أثر الأهداف (بعد الاختبار البعدي)</h2>${resTable(goals.filter(x => x.post).map(x => MDQ.post.row(x, model)))}<div class="row" style="margin-top:8px"><button class="btn gold small" id="gSum">${I.download} تنزيل الجدول (CSV)</button></div></section>` : ''}
      ${goals.length ? goals.map(goalCard).join('') : '<div class="panel" style="padding:20px"><p class="muted">لا أهداف بعد. حدّدي هدفًا ليبدأ الوكيل.</p></div>'}
      <section class="panel card"><h2>سجل عمل الوكيل (${G.log().length})</h2>
        <div class="t-scroll" style="max-height:240px"><table class="t-table"><thead><tr><th>الوقت</th><th>الحدث</th><th>التفصيل</th></tr></thead><tbody>
        ${G.log().slice(-60).reverse().map(x => `<tr><td class="num">${esc(T(x.at))}</td><td>${esc(x.event)}</td><td>${esc(x.detail)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">لا أحداث.</td></tr>'}</tbody></table></div>
        <div class="row" style="margin-top:8px"><button class="btn gold small" id="gLog">${I.download} تنزيل السجل (CSV)</button></div></section>`;


    /* معالجات التحليل الآلي */
    (function () {
      const P = MDQ.post, root = body.querySelector('#pAuto'); if (!root) return;
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const set = P.getSet(), A = set ? P.analyze(set, model, goals) : null;
      const go = root.querySelector('#pGo');
      if (go) go.onclick = async () => {
        const f = root.querySelector('#pFile').files[0]; if (!f) { ctx.msg('اختاري ملف النتائج أولًا.'); return; }
        try { P.ingest(await P.readFile(f), f.name); ctx.render(); } catch (e) { ctx.msg(e.message || 'تعذّرت قراءة الملف.'); }
      };
      if (!set) return;
      root.querySelector('#pTarGo').onclick = () => { const v = +root.querySelector('#pTar').value; if (v >= 1 && v <= 100) { P.setTarget(v); ctx.render(); } };
      const pa = root.querySelector('#pAll'); if (pa) pa.onchange = () => root.querySelectorAll('[data-xk]').forEach(c => c.checked = pa.checked);
      root.querySelectorAll('[data-xd]').forEach(sel => sel.onchange = () => { if (sel.value) { P.setDecide([{ key: sel.closest('tr').dataset.xr, val: sel.value }], sel.value === 'x' ? 'استبعدت المعلمة صفًا' : 'أقرّت المعلمة مطابقة'); ctx.render(); } });
      const fail = () => { const x = A.rows.find(r => r.qid === (root.querySelector('#pOut') || {}).value); return x ? x.fail : []; };
      const drawFail = () => { const el = root.querySelector('#pFail'), f = fail(); el.innerHTML = f.length ? `<table class="t-table"><tbody>${f.map(p => `<tr data-fs="${esc(p.s.studentId)}"><td><input type="checkbox" data-fk></td><td><button class="linkish" data-sid="${esc(p.s.studentId)}">${esc(p.name)}</button></td><td>${esc(G.normCls(p.s.className))}</td><td>${p.base ? 'كانت متحققة قبليًا' : 'لم تتحقق قبليًا'}</td></tr>`).join('')}</tbody></table>` : '<p class="muted small-print">لا طالبات.</p>';
        el.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => ctx.openStudent(b.dataset.sid)); const pf = root.querySelector('#pAllF'); pf.checked = false; };
      const po = root.querySelector('#pOut'); if (po) { po.onchange = drawFail; drawFail(); root.querySelector('#pAllF').onchange = e => root.querySelectorAll('[data-fk]').forEach(c => c.checked = e.target.checked); }
      root.querySelectorAll('[data-xa]').forEach(b => b.onclick = async () => {
        const a = b.dataset.xa;
        if (a === 'acc' || a === 'x') {
          const trs = [...root.querySelectorAll('[data-xk]')].filter(c => c.checked).map(c => c.closest('tr')); if (!trs.length) { ctx.msg('حدّدي اسمًا واحدًا على الأقل.'); return; }
          const ent = []; let skip = 0; trs.forEach(tr => { const m = A.ms.find(z => z.row.key === tr.dataset.xr); if (!m) return; if (a === 'x') ent.push({ key: m.row.key, val: 'x' }); else if (m.status === 'similar' && m.cands.length) ent.push({ key: m.row.key, val: m.cands[0].s.studentId }); else skip++; });
          if (ent.length) P.setDecide(ent, a === 'x' ? 'استبعدت المعلمة مجموعة' : 'أقرّت المعلمة مطابقة مجموعة');
          if (skip) ctx.msg(skip + ' اسم لا مرشح واضحًا له (مكرر أو غير مطابق): اختاري له يدويًا.'); ctx.render(); return;
        }
        if (a === 'copy' || a === 'csv' || a === 'print') {
          const sel = [...root.querySelectorAll('[data-fk]')].filter(c => c.checked).map(c => c.closest('tr')).map(tr => ({ name: tr.children[1].textContent.trim(), cls: tr.children[2].textContent.trim() }));
          if (!sel.length) { ctx.msg('حدّدي طالبة واحدة على الأقل.'); return; }
          const oc = (A.rows.find(r => r.qid === root.querySelector('#pOut').value) || {}).outcome || '';
          if (a === 'copy') { try { await navigator.clipboard.writeText(sel.map(x => x.name).join('\n')); ctx.msg('نُسخت ' + sel.length + ' أسماء.'); } catch (e) { prompt('انسخي الأسماء:', sel.map(x => x.name).join('\n')); } }
          else if (a === 'csv') await MDQ.saveFile('طالبات_لم_يتحققن.csv', new Blob(['﻿' + [['الطالبة', 'الفصل', 'الناتج'].map(q).join(',')].concat(sel.map(x => [x.name, x.cls, oc].map(q).join(','))).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
          else await MDQ.saveFile('قائمة_دعم.doc', new Blob(['﻿<html dir="rtl"><head><meta charset="utf-8"></head><body style="font-family:Times New Roman;font-size:14pt"><h2>قائمة دعم — ' + esc(oc) + '</h2><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>#</th><th>الطالبة</th><th>الفصل</th><th>ملاحظات</th></tr>' + sel.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.cls) + '</td><td></td></tr>').join('') + '</table></body></html>'], { type: 'application/msword' }));
          G.logEvent('post', 'أمر على طالبات محددات', a + ' · ' + sel.length + ' طالبة'); return;
        }
        if (a === 'tbl') { await MDQ.saveFile('جدول_اثر_الاختبار_البعدي.csv', new Blob(['﻿' + [['الدرس', 'الهدف (ناتج التعلم)', 'الأساس', 'المتحقق', 'المستهدف', 'الأثر (نقاط)', 'نسبة الأثر', 'ن', 'تحسّن', 'تراجع', 'الدلالة', 'الحالة', 'التوصيات'].map(q).join(',')]
          .concat(A.rows.map(x => [lessonOrder[x.lesson], x.outcome, x.base == null ? '' : x.base + '%', x.after == null ? '' : x.after + '%', x.target + '%', x.gain == null ? '' : x.gain, x.roi == null || x.ceil ? '' : x.roi + '%', x.n, x.up, x.down, x.p == null ? '' : x.p.toFixed(3), x.status, x.recs.join(' • ')].map(q).join(','))).join('\r\n')], { type: 'text/csv;charset=utf-8' })); return; }
        if (a === 'rec') { A.rows.forEach(x => G.logEvent('post', 'قياس الأثر: ' + x.qid, `ن=${x.n} · ${x.base}٪ ← ${x.after}٪ · ${x.status}`)); ctx.msg('سُجّلت نتائج ' + A.rows.length + ' ناتجًا في سجل الوكيل.'); ctx.render(); return; }
        if (a === 'del') { if (confirm('حذف ملف الاختبار البعدي وقراراتكِ من هذا المتصفح؟')) { P.setClear(); ctx.render(); } }
      });
    })();

    const g = id => G.list().find(x => x.id === id);
    $q('#gGo').onclick = () => {
      const sel = $q('#gOut'), row = MDQ.outcomes.ROWS.find(r => r.qid === sel.value), t = +$q('#gTar').value;
      if (!(t >= 1 && t <= 100)) return;
      G.create(model, { qid: sel.value, outcome: row.outcome, cls: $q('#gCls').value, metric: $q('#gMet').value, target: t, due: $q('#gDue').value, note: $q('#gNote').value.trim() });
      ctx.render();
    };
    function $q(s) { return body.querySelector(s); }
    body.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => ctx.openStudent(b.dataset.sid));
    body.querySelectorAll('[data-g]').forEach(card => {
      const goal = g(card.dataset.g);
      card.querySelectorAll('[data-ans]').forEach(b => b.onclick = () => { G.answer(goal, b.dataset.ans, b.dataset.k, b.dataset.l); ctx.render(); });

      const PM = MDQ.post;

      const checked = sel => [...card.querySelectorAll(sel)].filter(c => c.checked).map(c => c.closest('tr'));
      const ap = card.querySelector('[data-allpend]'); if (ap) ap.onchange = () => card.querySelectorAll('[data-pk]').forEach(c => c.checked = ap.checked);
      const as_ = card.querySelector('[data-allst]'); if (as_) as_.onchange = () => card.querySelectorAll('tr[data-st]').forEach(tr => { if (tr.style.display !== 'none') tr.querySelector('[data-sk]').checked = as_.checked; });
      const sf = card.querySelector('[data-sfilter]'); if (sf) sf.onchange = () => card.querySelectorAll('tr[data-st]').forEach(tr => { const show = !sf.value || tr.dataset.tags.split(' ').includes(sf.value); tr.style.display = show ? '' : 'none'; if (!show) tr.querySelector('[data-sk]').checked = false; });
      const fin = card.querySelector('[data-postfile]');
      card.querySelectorAll('[data-dec]').forEach(sel => sel.onchange = () => { if (!sel.value) return; const tr = sel.closest('[data-row]'); PM.decide(goal, tr.dataset.row, sel.value, tr.querySelector('td:nth-child(2)').textContent + ' ← ' + sel.options[sel.selectedIndex].text); ctx.render(); });
      card.querySelectorAll('[data-undo]').forEach(b => b.onclick = () => { const tr = b.closest('[data-row]'); PM.decide(goal, tr.dataset.row, 'x', 'ألغت المعلمة قبول: ' + tr.children[0].textContent); ctx.render(); });
      card.querySelectorAll('[data-pn],[data-pv],[data-pm],[data-pmax],[data-ppass]').forEach(el => el.onchange = () => {
        const p = PEND[goal.id]; if (!p) return;
        p.shape.nameCol = +card.querySelector('[data-pn]').value; p.valCol = +card.querySelector('[data-pv]').value;
        const m = card.querySelector('[data-pm]').value; p.mode = el.matches('[data-pv]') ? undefined : m;
        p.max = +card.querySelector('[data-pmax]').value || 1; p.pass = +card.querySelector('[data-ppass]').value || 100; ctx.render();
      });
      card.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
        const a = b.dataset.act, dg = G.diagnose(model, goal), step = G.planStep(goal, dg);
        if (a === 'bulkacc' || a === 'bulkx') {
          const trs = checked('[data-pk]'); if (!trs.length) { ctx.msg('حدّدي طالبة واحدة على الأقل من الجدول.'); return; }
          const rr = MDQ.post.impact(goal, goal.post, model), ent = []; let skipped = 0;
          trs.forEach(tr => { const m = rr.ms.find(x => x.row.key === tr.dataset.row); if (!m) return;
            if (a === 'bulkx') ent.push({ key: m.row.key, val: 'x' });
            else if (m.status === 'similar' && m.cands.length) ent.push({ key: m.row.key, val: m.cands[0].s.studentId });
            else skipped++; });
          if (ent.length) MDQ.post.decideMany(goal, ent, a === 'bulkx' ? 'استبعدت المعلمة مجموعة' : 'أقرّت المعلمة مطابقة مجموعة');
          if (skipped) ctx.msg(skipped + ' اسم لا مرشح واضحًا له (مكرر أو غير مطابق): اختاري له يدويًا.');
          ctx.render(); return;
        }
        if (a === 'stcopy' || a === 'stcsv' || a === 'stprint') {
          const sel = checked('[data-sk]').map(tr => ({ name: tr.children[1].textContent.trim(), cls: tr.children[2].textContent.trim(), base: tr.children[3].textContent.trim(), post: tr.children[4].textContent.trim() }));
          if (!sel.length) { ctx.msg('حدّدي طالبة واحدة على الأقل.'); return; }
          if (a === 'stcopy') { try { await navigator.clipboard.writeText(sel.map(x => x.name).join('\n')); ctx.msg('نُسخت ' + sel.length + ' أسماء.'); } catch (e) { prompt('انسخي الأسماء:', sel.map(x => x.name).join('\n')); } }
          else if (a === 'stcsv') { const q = v => '"' + String(v).replace(/"/g, '""') + '"';
            await MDQ.saveFile('قائمة_طالبات_محددات.csv', new Blob(['﻿' + [['الطالبة', 'الفصل', 'الأساس', 'البعدي'].map(q).join(',')].concat(sel.map(x => [x.name, x.cls, x.base, x.post].map(q).join(','))).join('\r\n')], { type: 'text/csv;charset=utf-8' })); }
          else { const html = '<html dir="rtl"><head><meta charset="utf-8"></head><body style="font-family:Times New Roman;font-size:14pt"><h2>قائمة دعم — ' + esc(goal.outcome) + '</h2><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%"><tr><th>#</th><th>الطالبة</th><th>الفصل</th><th>ملاحظات</th></tr>' + sel.map((x, i) => '<tr><td>' + (i + 1) + '</td><td>' + esc(x.name) + '</td><td>' + esc(x.cls) + '</td><td></td></tr>').join('') + '</table></body></html>';
            await MDQ.saveFile('قائمة_دعم.doc', new Blob(['﻿' + html], { type: 'application/msword' })); }
          MDQ.goals.logEvent(goal.id, 'أمر على طالبات محددات', ({ stcopy: 'نسخ', stcsv: 'تنزيل CSV', stprint: 'قائمة دعم' })[a] + ' · ' + sel.length + ' طالبة'); return;
        }
        if (a === 'postload') {
          const f = fin && fin.files[0]; if (!f) { ctx.msg('اختاري ملف Excel أو CSV أولًا.'); return; }
          try { const sh = MDQ.post.shape(await MDQ.post.readFile(f)); PEND[goal.id] = { file: f.name, shape: sh }; ctx.render(); } catch (e) { ctx.msg(e.message || 'تعذّرت قراءة الملف.'); }
          return;
        }
        if (a === 'postcancel') { delete PEND[goal.id]; ctx.render(); return; }
        if (a === 'postgo') {
          const p = PEND[goal.id], sh = p.shape, vc = p.valCol != null ? p.valCol : (sh.valCols[0] ?? 0), def = B.question(goal.qid);
          const mode = p.mode || MDQ.post.detectMode(sh.rows.map(r => r.cells[vc]), def);
          if (vc === sh.nameCol) { ctx.msg('عمود النتيجة يجب أن يختلف عن عمود الأسماء.'); return; }
          MDQ.post.attach(goal, { file: p.file, nameCol: 0, valCol: 1, valName: sh.headers[vc] || ('عمود ' + (vc + 1)), mode, max: p.max || 1, pass: p.pass || 100,
            rows: sh.rows.map(r => ({ key: r.key, line: r.line, cells: [r.cells[sh.nameCol], r.cells[vc]] })) });
          delete PEND[goal.id]; ctx.render(); return;
        }
        if (a === 'postdel') { if (confirm('حذف ملف الاختبار البعدي وقراراتكِ من هذا الهدف؟')) { MDQ.post.clear(goal); ctx.render(); } return; }
        if (a === 'postrec') { const r = MDQ.post.record(goal, model); ctx.msg('سُجّلت النتيجة في سجل الوكيل: الأثر العائد ' + (r.roi == null ? '—' : r.roi + '٪') + '.'); ctx.render(); return; }
        if (a === 'postcsv') {
          const r = MDQ.post.impact(goal, goal.post, model), q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
          const rows = [['الطالبة في الموقع', 'الفصل', 'الاسم في ملف الاختبار', 'الأساس (الموقع)', 'المحاولات في الموقع', 'القيمة في الاختبار البعدي', 'البعدي', 'التغير'].map(q).join(',')]
            .concat(r.per.map(p => { const m = r.ms.find(x => x.final && x.final.studentId === p.s.studentId);
              return [p.name, G.normCls(p.s.className), m ? m.name : '', p.base ? (p.base.pass ? 'تحققت' : 'لم تتحقق') : 'بلا بيانات', p.base ? p.base.attempts : '', p.raw, p.post == null ? 'غير مفهوم' : (p.post ? 'تحققت' : 'لم تتحقق'),
                p.base && p.post != null ? (!p.base.pass && p.post ? 'تحسّنت' : p.base.pass && !p.post ? 'تراجعت' : 'لا تغيّر') : ''].map(q).join(','); }));
          await MDQ.saveFile('مقارنة_الاختبار_البعدي.csv', new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' })); return;
        }
        if (a === 'review') { G.review(goal, model, true); ctx.render(); }
        else if (a === 'pause') { goal.paused = !goal.paused; G.update(goal); ctx.render(); }
        else if (a === 'del') { if (confirm('حذف هذا الهدف ومواده من هذا المتصفح؟')) { G.removeGoal(goal.id); ctx.render(); } }
        else if (a === 'card' && step && step.cause) { G.addMaterial(goal.id, 'بطاقة نشاط', G.cardDraft(goal, step)); ctx.render(); }
        else if (a === 'prompt' && step && step.cause) {
          const txt = G.promptPack(goal, step);
          try { await navigator.clipboard.writeText(txt); ctx.msg('نُسخ الموجّه. الصقيه في أداة الذكاء الاصطناعي التي تعتمدينها، ثم الصقي الناتج في «مواد الدعم» لمراجعته. لا يحوي أسماء ولا بيانات طالبات.'); }
          catch (e) { ctx.msg('تعذّر النسخ تلقائيًا؛ انسخي الموجّه من النافذة التالية.'); prompt('انسخي الموجّه:', txt); }
          G.addMaterial(goal.id, 'موجّه نموذج لغوي (للنسخ)', txt); ctx.render();
        }
        else if (a === 'paste') { const t = (card.querySelector('[data-paste]').value || '').trim(); if (t) { G.addMaterial(goal.id, 'مسودة من أداة ذكاء اصطناعي', t); ctx.render(); } }
        else if (a === 'approve') { const m = G.mats().find(x => x.id === b.closest('[data-m]').dataset.m), chk = [...b.closest('[data-m]').querySelectorAll('[data-chk]')].map(c => c.checked);
          if (!G.approveMaterial(m, chk)) { ctx.msg('أكملي قائمة المراجعة البشرية الثلاثة قبل الاعتماد.'); return; } ctx.render(); }
        else if (a === 'dl') { const m = G.mats().find(x => x.id === b.closest('[data-m]').dataset.m);
          const html = '<html dir="rtl"><head><meta charset="utf-8"></head><body style="font-family:Times New Roman;font-size:14pt"><pre style="white-space:pre-wrap;font-family:inherit">' + esc(m.text) + '</pre></body></html>';
          await MDQ.saveFile('مادة_دعم_معتمدة.doc', new Blob(['﻿' + html], { type: 'application/msword' })); }
      });
    });
    if ($q('#gSum')) $q('#gSum').onclick = async () => {
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const rows = [['الهدف', 'الأساس', 'المتحقق', 'المستهدف', 'الأثر', 'التوصيات'].map(q).join(',')].concat(goals.filter(x => x.post).map(x => { const r = MDQ.post.row(x, model); return [r.goal, r.base, r.after, r.target, r.impact, r.recs.join(' • ')].map(q).join(','); }));
      await MDQ.saveFile('ملخص_أثر_الأهداف.csv', new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    };
    $q('#gLog').onclick = async () => {
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const rows = [['الوقت', 'الهدف', 'الحدث', 'التفصيل', 'إصدار'].map(q).join(',')].concat(G.log().slice().reverse().map(x => [x.at, x.goalId, x.event, x.detail, x.v].map(q).join(',')));
      await MDQ.saveFile('سجل_وكيل_الأهداف.csv', new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    };
  }
  MDQ.goals.view = view;
})();
