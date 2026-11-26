/* ============================================================
   دعم الطالبات بعد الاختبار البعدي + «ما بعد التوصيات: الأثر المقاس» (وكيل الأهداف — للمعلمة فقط)
   مستوى الاستقلالية: يقترح فقط. لا شيء يُنفَّذ ولا يُحسب أثره قبل أن تعتمد المعلمة الخطة وتُدخل بنفسها نتيجة ما بعد المعالجة.
   - المصدر: نتائج المقارنة (اللعبة ← البعدي) لكل ناتج «مُحتسب» فقط؛ الطالبة ضعيفة في الناتج إن لم تتحقق فيه في البعدي.
   - التصنيف: «بقيت ضعيفة» (لم تتحقق قبليًا ولا بعديًا) أو «تراجعت» (تحققت قبليًا ثم لم تتحقق بعديًا).
   - الخطط مقترحات قاعدية عامة قابلة للتعديل، وليست تشخيصًا لسبب الضعف.
   - الأثر المقاس وصفي: لا مجموعة ضابطة، والطالبات المختارات ضعيفات أصلًا (انحدار نحو المتوسط)،
     وإعادة نفس السؤال قد تقيس التذكّر؛ فيُوصى بسؤال مكافئ للقياس بعد المعالجة.
   - كل شيء يُحسب في المتصفح ويُحفظ محليًا فقط.
   ============================================================ */
(function () {
  window.MDQ = window.MDQ || {};
  const SK = 'mdq.agent.support.v1', VERSION = '1.0.0', MIN_GROUP = 3;
  const LN = { db: 'إنشاء قاعدة البيانات', query: 'الاستعلام والتقارير', device: 'حماية جهاز الحاسب', cyber: 'مقدمة في الأمن السيبراني' };
  const rd = () => { try { const v = JSON.parse(localStorage.getItem(SK) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } };
  const get = () => { const s = rd() || {}; return { plans: s.plans || {}, groups: s.groups || {}, results: s.results || {}, minGroup: Math.max(2, Math.min(20, Math.round(+s.minGroup || MIN_GROUP))) }; };
  const put = s => { try { localStorage.setItem(SK, JSON.stringify(s)); } catch (e) {} };
  const log = (ev, d) => { try { if (MDQ.goals) MDQ.goals.logEvent('support', ev, d || ''); } catch (e) {} };
  const pct = (a, b) => b ? Math.round(a / b * 100) : null;
  const sgn = v => v == null ? '—' : (v > 0 ? '+' : '') + v;
  const rk = (sid, qid) => sid + '|' + qid;

  /* ---------- التجميع: طالبة ← نواتج لم تتحقق بعد البعدي ---------- */
  function collect(A, minGroup) {
    const rows = (A && A.rows || []).filter(x => x.counted && x.n > 0);
    const st = {}, outs = {};
    rows.forEach(x => {
      outs[x.qid] = x;
      x.fail.forEach(p => {
        const id = p.s.studentId, o = st[id] = st[id] || { id, name: p.name, cls: p.s.className || '', items: [] };
        o.items.push({ qid: x.qid, outcome: x.outcome, lesson: x.lesson, kind: p.base ? 'drop' : 'stay' });
      });
    });
    const students = Object.values(st).sort((a, b) => b.items.length - a.items.length || String(a.name).localeCompare(String(b.name), 'ar'));
    const groups = rows.filter(x => x.fail.length >= minGroup).map(x => ({ qid: x.qid, outcome: x.outcome, lesson: x.lesson, ids: x.fail.map(p => p.s.studentId), names: x.fail.map(p => p.name), n: x.n, drops: x.fail.filter(p => p.base).length }))
      .sort((a, b) => b.ids.length - a.ids.length);
    return { rows, outs, students, groups };
  }

  /* ---------- اقتراحات قاعدية (عامة، قابلة للتعديل) ---------- */
  function suggestStudent(s) {
    const n = s.items.length, lessons = [...new Set(s.items.map(i => i.lesson))], drops = s.items.filter(i => i.kind === 'drop').length;
    const L = lessons.map(l => LN[l] || l).join('، ');
    const parts = [];
    if (n >= 3 || lessons.length === 1 && n >= 2) {
      parts.push(`خطة علاجية فردية (${n} نواتج${lessons.length === 1 ? ' في درس ' + L : ' في ' + lessons.length + ' دروس'}): جلسة قصيرة (10–15 دقيقة) لمراجعة ملف الدرس، ثم إعادة المرحلة في اللعبة، ثم نشاط تطبيقي واحد.`);
      parts.push('اطلبي منها شرح فكرة واحدة بكلماتها لزميلة أو لكِ (شرح الأقران/الاستجواب القصير) للتحقق من الفهم.');
    } else {
      parts.push(`توصية قصيرة: إعادة قراءة الجزء الخاص بالناتج في ملف الدرس (${L}) ثم إعادة مرحلته في اللعبة، ومتابعة سريعة في الحصة.`);
    }
    if (drops) parts.push(`${drops} من نواتجها تحققت قبليًا ثم لم تتحقق بعديًا: راجعي ثبات التعلّم (تكرار متباعد) بدل إعادة التدريس من الصفر.`);
    return parts.join('\n');
  }
  function suggestGroup(g) {
    const L = LN[g.lesson] || g.lesson;
    let t = `خطة علاجية جماعية (${g.ids.length} طالبات لم يتحققن في هذا الناتج، من ${g.n} مقارَنة): إعادة تدريس مصغّرة في مجموعة صغيرة (15–20 دقيقة) لناتج درس «${L}» بمثال تطبيقي مختلف عن أمثلة الحصة، ثم تدريب موجَّه، ثم إعادة المرحلة في اللعبة.`;
    if (g.drops) t += `\n${g.drops} منهن تحققن قبليًا فتراجعن: ركّزي على سبب التراجع (نسيان/لبس في الصياغة) لا على الشرح من جديد.`;
    t += '\nإن تكرر الضعف عند عدد كبير من الصف فقد يكون في أسلوب الشرح أو صياغة السؤال؛ راجعي ذلك قبل تحميل الطالبات المسؤولية.';
    return t;
  }

  /* ---------- الأزواج المعتمدة (طالبة × ناتج) ---------- */
  function approvedPairs(C, S) {
    const m = {};
    C.students.forEach(s => {
      const pl = S.plans[s.id];
      s.items.forEach(i => {
        const gr = S.groups[i.qid], gOk = gr && gr.status === 'approved' && C.groups.some(g => g.qid === i.qid && g.ids.includes(s.id));
        const iOk = pl && pl.status === 'approved';
        if (iOk || gOk) m[rk(s.id, i.qid)] = { sid: s.id, qid: i.qid, name: s.name, cls: s.cls, outcome: i.outcome, lesson: i.lesson, via: iOk && gOk ? 'فردية + جماعية' : iOk ? 'فردية' : 'جماعية' };
      });
    });
    return Object.values(m);
  }

  /* ---------- الأثر المقاس ---------- */
  function impact(C, S) {
    const pairs = approvedPairs(C, S), meas = pairs.filter(p => S.results[rk(p.sid, p.qid)] && (S.results[rk(p.sid, p.qid)].v === 1 || S.results[rk(p.sid, p.qid)].v === 0));
    const won = meas.filter(p => S.results[rk(p.sid, p.qid)].v === 1);
    const byOut = C.rows.map(x => {
      const ps = pairs.filter(p => p.qid === x.qid), ms = meas.filter(p => p.qid === x.qid), ws = won.filter(p => p.qid === x.qid);
      const passers = x.n - x.fail.length, after = pct(passers + ws.length, x.n);
      return { qid: x.qid, outcome: x.outcome, lesson: x.lesson, n: x.n, base: x.base, post: x.after, target: x.target, approved: ps.length, measured: ms.length, won: ws.length, after,
        gain: ms.length || ps.length ? after - x.after : null, closed: x.after < 100 && ms.length ? pct(ws.length, x.fail.length) : null,
        hake: x.after < 100 && ms.length ? Math.round((after - x.after) / (100 - x.after) * 100) : null,
        roi: x.after < x.target && ms.length ? Math.round((after - x.after) / (x.target - x.after) * 100) : null };
    }).filter(o => o.approved > 0);
    const tot = byOut.reduce((a, o) => { a.n += o.n; a.b += Math.round(o.base * o.n / 100); a.p += o.n - (C.outs[o.qid].fail.length); a.w += o.won; return a; }, { n: 0, b: 0, p: 0, w: 0 });
    // الطالبات: تحقّقت كل نواتجها الضعيفة بعد المعالجة (وكلها مقيسة)
    const sids = [...new Set(pairs.map(p => p.sid))], stu = sids.map(id => {
      const s = C.students.find(x => x.id === id), mine = pairs.filter(p => p.sid === id), mm = mine.filter(p => meas.includes(p)), ww = mm.filter(p => won.includes(p));
      return { id, name: s.name, cls: s.cls, weak: s.items.length, approved: mine.length, measured: mm.length, won: ww.length, score: pct(ww.length, mm.length), full: mm.length === s.items.length && ww.length === mm.length };
    });
    return { pairs: pairs.length, measured: meas.length, won: won.length, recovery: pct(won.length, meas.length), coverage: pct(meas.length, pairs.length),
      byOut, stu, overall: tot.n ? { n: tot.n, base: pct(tot.b, tot.n), post: pct(tot.p, tot.n), after: pct(tot.p + tot.w, tot.n) } : null,
      studentsFull: stu.filter(s => s.full).length, studentsApproved: stu.length, studentsMeasured: stu.filter(s => s.measured).length };
  }

  /* ---------- الواجهة ---------- */
  function html(A, set, model, esc) {
    if (!A || !set) return '';
    const S = get(), C = collect(A, S.minGroup), I = impact(C, S);
    const st = x => x === 'approved' ? '<span class="pill ok">معتمدة</span>' : x === 'rejected' ? '<span class="pill low">غير معتمدة</span>' : '<span class="pill mid">بانتظار قراركِ</span>';
    const kind = k => k === 'drop' ? '<span class="pill low">تراجعت</span>' : '<span class="pill mid">بقيت ضعيفة</span>';
    const decBtns = (type, id, cur) => `<div class="row" style="gap:6px;margin-top:4px"><button class="btn small ${cur === 'approved' ? 'gold' : ''}" data-sp="ok" data-spt="${type}" data-spi="${esc(id)}">اعتماد</button><button class="btn small" data-sp="no" data-spt="${type}" data-spi="${esc(id)}">عدم اعتماد</button>${cur ? `<button class="btn small" data-sp="reset" data-spt="${type}" data-spi="${esc(id)}">إعادة للانتظار</button>` : ''}</div>`;
    let h = `<section id="spSec" style="margin-top:16px"><h3 style="margin:10px 0 4px">دعم الطالبات بعد المقارنة والاختبار البعدي (جميع الأهداف)</h3>
      <div class="banner info"><div><b>كيف يعمل:</b> يجمع الوكيل الطالبات اللواتي لم يتحققن في ناتج بعد الاختبار البعدي، ويقترح خطة لكل طالبة وخطة جماعية عند اشتراك ${S.minGroup} طالبات فأكثر في ناتج واحد. هذه <b>مقترحات عامة</b> لا تشخّص سبب الضعف؛ لا يُنفَّذ ولا يُحتسب شيء قبل اعتمادكِ. بعد التنفيذ تُدخلين نتيجة كل طالبة بعد المعالجة ليُحسب الأثر.</div></div>`;
    if (!C.students.length) return h + '<p class="muted">لا طالبات لم يتحققن في أي ناتج محتسَب (أو لا مقارنات كافية).</p></section>';
    h += `<div class="row" style="margin:6px 0"><label>حد الخطة الجماعية (عدد الطالبات)<input type="number" min="2" max="20" class="t-input" id="spMin" value="${S.minGroup}" style="width:70px"></label>
      <span class="muted small-print">${C.students.length} طالبة تحتاج دعمًا · ${C.groups.length} ناتجًا مشتركًا في الضعف</span></div>`;
    // خطط جماعية
    h += `<h4 style="margin:10px 0 4px">خطط جماعية مقترحة</h4>`;
    h += C.groups.length ? C.groups.map(g => { const p = S.groups[g.qid] || {}, txt = p.text != null ? p.text : suggestGroup(g);
      return `<div class="card" style="padding:10px;margin:6px 0" data-spg="${esc(g.qid)}"><div class="row"><b class="grow">${esc(g.outcome)}</b>${st(p.status)}</div>
        <div class="small-print muted">${esc(LN[g.lesson] || g.lesson)} · ${g.ids.length} من ${g.n} · ${esc(g.names.join('، '))}</div>
        <textarea class="t-input" data-sptx="g" data-spi="${esc(g.qid)}" rows="4" style="width:100%;margin-top:6px">${esc(txt)}</textarea>${decBtns('g', g.qid, p.status)}</div>`; }).join('')
      : `<p class="muted small-print">لا ناتج اشترك في الضعف فيه ${S.minGroup} طالبات فأكثر.</p>`;
    // خطط فردية
    h += `<h4 style="margin:12px 0 4px">خطة/توصية لكل طالبة</h4><div class="t-scroll" style="max-height:420px">`;
    h += C.students.map(s => { const p = S.plans[s.id] || {}, txt = p.text != null ? p.text : suggestStudent(s);
      return `<div class="card" style="padding:10px;margin:6px 0" data-sps="${esc(s.id)}"><div class="row"><button class="link" data-sid="${esc(s.id)}"><b>${esc(s.name)}</b></button><span class="muted small-print grow">${esc(s.cls)}</span>${st(p.status)}</div>
        <ul style="margin:4px 0;padding-inline-start:18px">${s.items.map(i => `<li>${kind(i.kind)} ${esc(i.outcome)} <span class="muted small-print">(${esc(LN[i.lesson] || i.lesson)})</span></li>`).join('')}</ul>
        <textarea class="t-input" data-sptx="s" data-spi="${esc(s.id)}" rows="${s.items.length >= 3 ? 5 : 3}" style="width:100%">${esc(txt)}</textarea>${decBtns('s', s.id, p.status)}</div>`; }).join('');
    h += `</div>`;
    // إدخال النتائج بعد المعالجة
    const pairs = approvedPairs(C, S);
    h += `<h3 style="margin:16px 0 4px">ما درجة الطالبة بعد المعالجة؟</h3>`;
    if (!pairs.length) h += `<p class="muted small-print">يظهر الإدخال للطالبات اللواتي اعتمدتِ خطتهن (الفردية أو الجماعية) فقط. اعتمدي خطة واحدة على الأقل.</p>`;
    else {
      h += `<p class="muted small-print">بعد تنفيذ الخطة، سجّلي لكل ناتج: «تحقق» أو «لم يتحقق». يفضَّل قياسه بسؤال <b>مكافئ</b> لا بنفس السؤال حتى لا يُقاس التذكّر. ما لم يُدخَل يُعدّ غير متحقق في حساب إتقان النواتج (ويظهر ضمن «التغطية»).</p>
        <div class="t-scroll" style="max-height:360px"><table class="t-table"><thead><tr><th>الطالبة</th><th>الناتج</th><th>الخطة</th><th>بعد المعالجة</th></tr></thead><tbody>${pairs.map(p => { const r = S.results[rk(p.sid, p.qid)]; const v = r ? r.v : '';
        return `<tr><td>${esc(p.name)}</td><td>${esc(p.outcome)}</td><td>${p.via}</td><td><select class="t-input" data-spr="${esc(rk(p.sid, p.qid))}"><option value="">— لم يُقَس</option><option value="1" ${v === 1 ? 'selected' : ''}>تحقق</option><option value="0" ${v === 0 ? 'selected' : ''}>لم يتحقق</option></select></td></tr>`; }).join('')}</tbody></table></div>`;
    }
    h += impactHtml(I, esc);
    return h + '</section>';
  }
  function impactHtml(I, esc) {
    let h = `<h3 style="margin:18px 0 4px">ما بعد التوصيات: الأثر المقاس</h3>`;
    if (!I.pairs) return h + '<p class="muted small-print">لم تُعتمد خطة بعد؛ لا أثر يُحسب.</p>';
    if (!I.measured) return h + `<p class="muted small-print">اعتُمدت ${I.pairs} حالة (طالبة × ناتج) ولم تُدخلي أي نتيجة بعد المعالجة؛ أدخليها أعلاه ليُحسب الأثر.</p>`;
    const P = v => v == null ? '—' : v + '٪';
    h += `<div class="row" style="flex-wrap:wrap;gap:10px;margin:6px 0">
      <div class="card" style="padding:10px"><div class="muted small-print">معدل التعافي</div><b style="font-size:1.4rem">${P(I.recovery)}</b><div class="small-print">${I.won} من ${I.measured} حالة مقيسة تحققت</div></div>
      <div class="card" style="padding:10px"><div class="muted small-print">تغطية القياس</div><b style="font-size:1.4rem">${P(I.coverage)}</b><div class="small-print">${I.measured} من ${I.pairs} حالة معتمدة</div></div>
      <div class="card" style="padding:10px"><div class="muted small-print">طالبات أغلقن كل فجواتهن</div><b style="font-size:1.4rem">${I.studentsFull} من ${I.studentsApproved}</b><div class="small-print">(شرطه قياس كل نواتجها الضعيفة)</div></div>
      ${I.overall ? `<div class="card" style="padding:10px"><div class="muted small-print">إتقان النواتج المعالَجة (مجمَّع)</div><b style="font-size:1.1rem">${P(I.overall.base)} ← ${P(I.overall.post)} ← ${P(I.overall.after)}</b><div class="small-print">الأساس ← البعدي ← بعد التوصيات (ن=${I.overall.n} مقارَنة)</div></div>` : ''}</div>`;
    h += `<div class="t-scroll"><table class="t-table"><thead><tr><th>الناتج</th><th>الأساس</th><th>البعدي</th><th>بعد التوصيات</th><th>التغير عن البعدي</th><th>أُغلقت الفجوة</th><th>مكسب نسبي</th><th>أثر نحو المستهدف</th><th>مقيس/معتمد</th></tr></thead><tbody>${I.byOut.map(o => `<tr><td>${esc(o.outcome)}</td><td class="num">${P(o.base)}</td><td class="num">${P(o.post)}</td><td class="num">${P(o.after)}</td><td class="num">${o.measured ? sgn(o.gain) + ' نقطة' : '—'}</td><td class="num">${P(o.closed)}</td><td class="num">${P(o.hake)}</td><td class="num">${P(o.roi)}</td><td class="num">${o.measured}/${o.approved}</td></tr>`).join('')}</tbody></table></div>
      <details style="margin:6px 0"><summary class="small-print"><b>درجة كل طالبة بعد المعالجة</b></summary><div class="t-scroll"><table class="t-table"><thead><tr><th>الطالبة</th><th>نواتج ضعيفة</th><th>معتمدة</th><th>مقيسة</th><th>تحققت</th><th>درجتها بعد المعالجة</th></tr></thead><tbody>${I.stu.map(s => `<tr><td>${esc(s.name)}</td><td class="num">${s.weak}</td><td class="num">${s.approved}</td><td class="num">${s.measured}</td><td class="num">${s.won}</td><td class="num">${P(s.score)}</td></tr>`).join('')}</tbody></table></div></details>
      <div class="banner info" style="margin:8px 0"><div><b>كيف تُقرأ الأرقام:</b> «معدل التعافي» = المتحقق ÷ المقيس. «بعد التوصيات» = (المتحققات في البعدي + المتحققات بعد المعالجة) ÷ المقارَنات، وغير المقيس يُعدّ غير متحقق. «أُغلقت الفجوة» = المتحققات بعد المعالجة ÷ غير المتحققات في البعدي. «المكسب النسبي» = (بعد التوصيات − البعدي) ÷ (100 − البعدي). «الأثر نحو المستهدف» = التغير ÷ (المستهدف − البعدي).</div></div>
      <div class="banner bad" style="margin:8px 0"><div><b>حدود لا يجوز تجاوزها عند القراءة:</b> (1) لا مجموعة ضابطة، فالأرقام وصفية ولا تُثبت أن الخطة هي السبب. (2) اختير هؤلاء لأنهن الأضعف، وجزء من تحسّنهن متوقع إحصائيًا بلا تدخل (الانحدار نحو المتوسط). (3) إعادة نفس السؤال قد تقيس التذكّر لا التعلّم. ${I.coverage < 100 ? '(4) المقيس ' + I.coverage + '٪ فقط من الحالات المعتمدة؛ معدل التعافي يخص المقيسات وحدها.' : ''}</div></div>
      <div class="row"><button class="btn gold small" data-sp="csv">تنزيل الأثر المقاس (CSV)</button><button class="btn small" data-sp="log">سجّلي الأثر في سجل الوكيل</button></div>`;
    return h;
  }

  function bind(root, A, set, model, ctx) {
    const sec = root.querySelector('#spSec'); if (!sec || !A) return;
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const S0 = () => get(), C0 = () => collect(A, S0().minGroup);
    const textOf = (type, id) => { const el = sec.querySelector(`[data-sptx="${type}"][data-spi="${CSS.escape ? CSS.escape(id) : id}"]`); return el ? el.value : null; };
    sec.querySelectorAll('[data-sptx]').forEach(el => el.onchange = () => { const S = get(), t = el.dataset.sptx, id = el.dataset.spi, box = t === 'g' ? S.groups : S.plans; box[id] = Object.assign({}, box[id] || {}, { text: el.value }); put(S); });
    const mn = sec.querySelector('#spMin'); if (mn) mn.onchange = () => { const S = get(); S.minGroup = +mn.value; put(S); ctx.render(); };
    sec.querySelectorAll('[data-spr]').forEach(sel => sel.onchange = () => { const S = get(); if (sel.value === '') delete S.results[sel.dataset.spr]; else S.results[sel.dataset.spr] = { v: +sel.value, at: new Date().toISOString() }; put(S); ctx.render(); });
    sec.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => ctx.openStudent(b.dataset.sid));
    sec.querySelectorAll('[data-sp]').forEach(b => b.onclick = async () => {
      const a = b.dataset.sp, S = get(), C = collect(A, S.minGroup);
      if (a === 'ok' || a === 'no' || a === 'reset') {
        const t = b.dataset.spt, id = b.dataset.spi, box = t === 'g' ? S.groups : S.plans, o = Object.assign({}, box[id] || {});
        const tx = textOf(t, id); if (tx != null) o.text = tx;
        if (a === 'reset') { delete o.status; delete o.approvedAt; } else { o.status = a === 'ok' ? 'approved' : 'rejected'; o.approvedAt = new Date().toISOString(); }
        box[id] = o; put(S);
        const who = t === 'g' ? ((C.groups.find(g => g.qid === id) || {}).outcome || id) : ((C.students.find(s => s.id === id) || {}).name || id);
        log(a === 'ok' ? 'اعتمدت المعلمة خطة' : a === 'no' ? 'لم تعتمد المعلمة خطة' : 'أُعيدت خطة للانتظار', (t === 'g' ? 'جماعية: ' : 'فردية: ') + who);
        ctx.render(); return;
      }
      const I = impact(C, S);
      if (a === 'log') { log('الأثر المقاس بعد التوصيات', `معدل التعافي ${I.recovery == null ? '—' : I.recovery + '٪'} (${I.won}/${I.measured}) · تغطية ${I.coverage == null ? '—' : I.coverage + '٪'}` + (I.overall ? ` · إتقان ${I.overall.base}٪←${I.overall.post}٪←${I.overall.after}٪` : '')); ctx.msg('سُجّل الأثر في سجل الوكيل.'); return; }
      if (a === 'csv') {
        const head = ['الطالبة', 'الفصل', 'الناتج', 'نوع الخطة', 'بعد المعالجة'];
        const R = approvedPairs(C, S).map(p => { const r = S.results[rk(p.sid, p.qid)]; return [p.name, p.cls, p.outcome, p.via, r ? (r.v === 1 ? 'تحقق' : 'لم يتحقق') : 'لم يُقَس']; });
        const sum = [[], ['ملخص'], ['معدل التعافي', I.recovery == null ? '' : I.recovery + '%'], ['تغطية القياس', I.coverage == null ? '' : I.coverage + '%']];
        if (I.overall) sum.push(['إتقان مجمّع: الأساس / البعدي / بعد التوصيات', I.overall.base + '% / ' + I.overall.post + '% / ' + I.overall.after + '%']);
        const lines = [head.map(q).join(',')].concat(R.map(r => r.map(q).join(','))).concat(sum.map(r => r.map(q).join(',')));
        await MDQ.saveFile('الأثر_المقاس_بعد_التوصيات.csv', new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      }
    });
  }
  const wipe = () => { try { localStorage.removeItem(SK); } catch (e) {} };

  MDQ.support = { VERSION, SK, MIN_GROUP, collect, suggestStudent, suggestGroup, approvedPairs, impact, get, put, wipe, html, bind };
})();
