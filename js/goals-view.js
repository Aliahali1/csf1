/* واجهة وكيل الأهداف في لوحة المعلمة */
(function () {
  const G = MDQ.goals;
  function view(body, ctx) {
    const { esc, pill, T, I, B, model } = ctx;
    const goals = G.list(), outcomes = MDQ.outcomes.ROWS.filter(r => r.qid), classes = G.classes(model);
    const lessonName = id => (B.lesson(id) || {}).lesson || id;
    const statusCls = s => ({ 'تحقق الهدف': 'ok', 'تحسّن': 'ok', 'لم يتحسن': 'low', 'بيانات قليلة': 'mid' }[s] || 'na');

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
      card.querySelectorAll('[data-act]').forEach(b => b.onclick = async () => {
        const a = b.dataset.act, dg = G.diagnose(model, goal), step = G.planStep(goal, dg);
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
    $q('#gLog').onclick = async () => {
      const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
      const rows = [['الوقت', 'الهدف', 'الحدث', 'التفصيل', 'إصدار'].map(q).join(',')].concat(G.log().slice().reverse().map(x => [x.at, x.goalId, x.event, x.detail, x.v].map(q).join(',')));
      await MDQ.saveFile('سجل_وكيل_الأهداف.csv', new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    };
  }
  MDQ.goals.view = view;
})();
