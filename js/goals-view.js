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
          <div class="t-scroll" style="max-height:340px"><table class="t-table"><thead><tr><th>الاسم في ملف الاختبار</th><th>الحالة</th><th>القرار</th></tr></thead><tbody>
          ${asks.map(m => {
            const cs = m.cands.map(c => [c.s.studentId, `${c.s.name} · ${G.normCls(c.s.className)}${c.score < 1 ? ' · تشابه ' + Math.round(c.score * 100) + '٪' : ''}`]);
            const rest = scopeSt.filter(s => !m.cands.some(c => c.s.studentId === s.studentId)).map(s => [s.studentId, `${s.name} · ${G.normCls(s.className)}`]);
            const why = m.multi ? 'صفّان لطالبة واحدة' : stLbl[m.status];
            return `<tr data-row="${esc(m.row.key)}"><td>${esc(m.name)}</td><td><span class="pill ${m.status === 'similar' ? 'mid' : 'low'}">${esc(why)}</span></td>
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
          ${r.stayLow.length ? `<details><summary class="muted small-print">لم تتحقق في الموقع ولا في البعدي (${r.stayLow.length})</summary>${r.stayLow.map(p => `<button class="linkish" data-sid="${esc(p.s.studentId)}">${esc(p.name)}</button>`).join('، ')}</details>` : ''}
          ${r.down ? `<details><summary class="muted small-print">تراجعت (${r.down})</summary>${r.paired.filter(p => p.base.pass && !p.post).map(p => `<button class="linkish" data-sid="${esc(p.s.studentId)}">${esc(p.name)}</button>`).join('، ')}</details>` : ''}
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
      ${goals.some(x => x.post) ? `<section class="panel card" style="margin-bottom:16px"><h2>ملخص أثر الأهداف (بعد الاختبار البعدي)</h2>${resTable(goals.filter(x => x.post).map(x => MDQ.post.row(x, model)))}<div class="row" style="margin-top:8px"><button class="btn gold small" id="gSum">${I.download} تنزيل الجدول (CSV)</button></div></section>` : ''}
      ${goals.length ? goals.map(goalCard).join('') : '<div class="panel" style="padding:20px"><p class="muted">لا أهداف بعد. حدّدي هدفًا ليبدأ الوكيل.</p></div>'}
      <section class="panel card"><h2>سجل عمل الوكيل (${G.log().length})</h2>
        <div class="t-scroll" style="max-height:240px"><table class="t-table"><thead><tr><th>الوقت</th><th>الحدث</th><th>التفصيل</th></tr></thead><tbody>
        ${G.log().slice(-60).reverse().map(x => `<tr><td class="num">${esc(T(x.at))}</td><td>${esc(x.event)}</td><td>${esc(x.detail)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">لا أحداث.</td></tr>'}</tbody></table></div>
        <div class="row" style="margin-top:8px"><button class="btn gold small" id="gLog">${I.download} تنزيل السجل (CSV)</button></div></section>`;

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
      const fin = card.querySelector('[data-postfile]');
      card.querySelectorAll('[data-dec]').forEach(sel => sel.onchange = () => { if (!sel.value) return; const tr = sel.closest('[data-row]'); PM.decide(goal, tr.dataset.row, sel.value, tr.children[0].textContent + ' ← ' + sel.options[sel.selectedIndex].text); ctx.render(); });
      card.querySelectorAll('[data-undo]').forEach(b => b.onclick = () => { const tr = b.closest('[data-row]'); PM.decide(goal, tr.dataset.row, 'x', 'ألغت المعلمة قبول: ' + tr.children[0].textContent); ctx.render(); });
      card.querySelectorAll('[data-pn],[data-pv],[data-pm],[data-pmax],[data-ppass]').forEach(el => el.onchange = () => {
        const p = PEND[goal.id]; if (!p) return;
        p.shape.nameCol = +card.querySelector('[data-pn]').value; p.valCol = +card.querySelector('[data-pv]').value;
        const m = card.querySelector('[data-pm]').value; p.mode = el.matches('[data-pv]') ? undefined : m;
        p.max = +card.querySelector('[data-pmax]').value || 1; p.pass = +card.querySelector('[data-ppass]').value || 100; ctx.render();
      });
      card.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
        const a = b.dataset.act, dg = G.diagnose(model, goal), step = G.planStep(goal, dg);
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
