/* ============================================================
   دعم الطالبات بعد الاختبار البعدي + «ما بعد التوصيات: الأثر المقاس» (وكيل الأهداف — للمعلمة فقط)
   مستوى الاستقلالية: يقترح فقط. لا شيء يُنفَّذ ولا يُحسب أثره قبل أن:
     (1) تعتمد المعلمة الخطة (أيقونة الاعتماد)، (2) تُدخل بنفسها درجة الطالبة بعد المعالجة، (3) يعتمد الوكيل الدرجة (صالحة 0–100).
   - المصدر: نتائج المقارنة (اللعبة ← البعدي) لكل ناتج «مُحتسب» فقط؛ الطالبة ضعيفة في الناتج إن لم تتحقق فيه في البعدي.
   - التصنيف: «بقيت ضعيفة» (لم تتحقق قبليًا ولا بعديًا) أو «تراجعت» (تحققت قبليًا ثم لم تتحقق بعديًا).
   - تحقق الناتج بعد المعالجة: الدرجة ≥ حد التحقق (مستهدف الناتج). نسبة الطالبة = نواتجها المتحققة ÷ نواتجها المقارَنة.
   - الخطط مقترحات قابلة للتعديل مبنية على موضع الناتج في كتاب المهارات الرقمية للصف الثالث المتوسط (الفصل الأول، الوحدتان 1 و2) وأنشطته «لنطبق معًا»
     من ملف js/textbook.js؛ وإن لم يوجد ربط للناتج فتُقترح مراجعة ملف الدرس عمومًا. ليست تشخيصًا لسبب الضعف.
   - الأثر المقاس وصفي: لا مجموعة ضابطة، والطالبات المختارات ضعيفات أصلًا (انحدار نحو المتوسط)،
     وإعادة نفس السؤال قد تقيس التذكّر؛ فيُوصى بسؤال مكافئ للقياس بعد المعالجة.
   - كل شيء يُحسب في المتصفح ويُحفظ محليًا فقط.
   ============================================================ */
(function () {
  window.MDQ = window.MDQ || {};
  const SK = 'mdq.agent.support.v1', VERSION = '1.3.0', MIN_GROUP = 3;
  const LN = { db: 'إنشاء قاعدة البيانات', query: 'الاستعلام والتقارير', device: 'حماية جهاز الحاسب', cyber: 'مقدمة في الأمن السيبراني' };
  let MEM = null, LSFAIL = false;   // احتياط في الذاكرة إن تعذّر localStorage (وضع خاص/حظر) كي لا يتعطل الاعتماد بصمت
  const rd = () => { try { const v = JSON.parse(localStorage.getItem(SK) || 'null'); if (!LSFAIL) return v && typeof v === 'object' ? v : null; } catch (e) { LSFAIL = true; } return MEM; };
  const get = () => { const s = rd() || {}; return { plans: s.plans || {}, groups: s.groups || {}, results: s.results || {}, drafts: s.drafts || {}, mem: s.mem || {}, minGroup: Math.max(2, Math.min(20, Math.round(+s.minGroup || MIN_GROUP))) }; };
  const put = s => { MEM = JSON.parse(JSON.stringify(s)); try { localStorage.setItem(SK, JSON.stringify(s)); LSFAIL = false; } catch (e) { LSFAIL = true; } };
  const log = (ev, d) => { try { if (MDQ.goals) MDQ.goals.logEvent('support', ev, d || ''); } catch (e) {} };
  const pct = (a, b) => b ? Math.round(a / b * 100) : null;
  const sgn = v => v == null ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
  const rk = (sid, qid) => sid + '|' + qid;
  const thr = x => (x && +x.target > 0) ? +x.target : 80;                 // حد التحقق = مستهدف الناتج
  const measured = r => !!r && (r.score != null ? r.confirmed === true : (r.v === 1 || r.v === 0));
  const isWon = (r, t) => r.score != null ? r.score >= t : r.v === 1;
  const short = t => { const first = String(t || '').split('\n').map(x => x.replace(/\s+/g, ' ').trim()).find(Boolean) || ''; return first.length > 150 ? first.slice(0, 148) + '…' : first; };
  const TB = () => MDQ.textbook || null;
  /** إشارة مختصرة إلى موضع الناتج في الكتاب (صفحات + أنشطة) أو '' إن لم يوجد ربط */
  const bookRef = qid => { const tb = TB(), e = tb && tb.get(qid); return e ? 'الكتاب: ' + tb.brief(e) : ''; };

  /* ---------- ذاكرة الوكيل الفرعي: مستوى الطالبة وسجل ما بعد المعالجة (محلية، لاتساق الخطط عبر الجولات) ---------- */
  const lastOf = (mem, sid, qid) => { const h = ((mem || {})[sid] || {}).hist || []; for (let i = h.length - 1; i >= 0; i--) if (h[i].q === qid) return h[i]; return null; };
  const remember = (S, sid, qid, score, won) => { const m = S.mem[sid] = S.mem[sid] || { hist: [] }; m.hist = (m.hist || []).concat([{ q: qid, score, won: !!won, at: new Date().toISOString() }]).slice(-60); };
  /** مستوى الدعم (قاعدة إرشادية معلنة): مكثف إن كانت نسبتها قبل الخطة ≤ 25٪ أو لديها 4 نواتج فأكثر؛ متوسط إن لديها ناتجان فأكثر؛ وإلا خفيف */
  function levelOf(s) {
    const n = s.items.length, b = s.before == null ? 100 : s.before;
    return b <= 25 || n >= 4 ? { k: 'int', label: 'دعم مكثف' } : n >= 2 ? { k: 'mid', label: 'دعم متوسط' } : { k: 'low', label: 'دعم خفيف' };
  }
  const firstPage = qid => { const tb = TB(), e = tb && tb.get(qid); return e && e.pages && e.pages.length ? e.pages[0] : 9999; };

  /* ---------- التجميع: طالبة ← نواتج لم تتحقق بعد البعدي ---------- */
  function collect(A, minGroup) {
    const rows = (A && A.rows || []).filter(x => x.counted && x.n > 0);
    const st = {}, cmp = {}, outs = {};
    rows.forEach(x => {
      outs[x.qid] = x;
      (x.per && x.per.length ? x.per : x.fail).forEach(p => { const id = p.s.studentId, c = cmp[id] = cmp[id] || { n: 0, ok: 0 }; c.n++; if (p.post) c.ok++; });
      x.fail.forEach(p => {
        const id = p.s.studentId, o = st[id] = st[id] || { id, name: p.name, cls: p.s.className || '', items: [] };
        o.items.push({ qid: x.qid, outcome: x.outcome, lesson: x.lesson, kind: p.base ? 'drop' : 'stay' });
      });
    });
    Object.values(st).forEach(s => { const c = cmp[s.id] || { n: s.items.length, ok: 0 }; s.compared = c.n; s.passed = c.ok; s.before = pct(c.ok, c.n); });
    const students = Object.values(st).sort((a, b) => b.items.length - a.items.length || String(a.name).localeCompare(String(b.name), 'ar'));
    const groups = rows.filter(x => x.fail.length >= minGroup).map(x => ({ qid: x.qid, outcome: x.outcome, lesson: x.lesson, ids: x.fail.map(p => p.s.studentId), names: x.fail.map(p => p.name), n: x.n, drops: x.fail.filter(p => p.base).length }))
      .sort((a, b) => b.ids.length - a.ids.length);
    return { rows, outs, students, groups };
  }

  /* ---------- اقتراحات قاعدية (عامة، قابلة للتعديل) ---------- */
  function suggestStudent(s, mem) {
    const tb = TB(), n = s.items.length, lv = levelOf(s), drops = s.items.filter(i => i.kind === 'drop').length;
    const lessons = [...new Set(s.items.map(i => i.lesson))], L = lessons.map(l => LN[l] || l).join('، ');
    const items = s.items.slice().sort((x, y) => lv.k === 'int' ? firstPage(x.qid) - firstPage(y.qid) : x.kind === y.kind ? 0 : x.kind === 'drop' ? -1 : 1);   // المكثف: الأسبق في الكتاب أولًا؛ غيره: من تراجعت أولًا
    const compact = n > 3 || lv.k === 'int' && n > 2, plan = n >= 3 || lessons.length === 1 && n >= 2;
    const out = [(plan ? 'خطة علاجية فردية' : 'توصية مقترحة') + ` (${n} ${n === 1 ? 'ناتج' : 'نواتج'}${lessons.length === 1 ? ' في درس ' + L : ' في ' + lessons.length + ' دروس'}) مبنية على كتاب المهارات الرقمية للصف الثالث المتوسط:`];
    out.push(`مستوى الدعم: ${lv.label}` + (lv.k === 'int' ? ' — ابدئي بالناتج 1 ثم 2 فقط في الجلسة الأولى، وأجّلي الباقي لجلسات لاحقة كي لا يتراكم العبء.' : lv.k === 'low' ? ' — نشاط واحد قصير وتحقق ذاتي يكفيان.' : ' — جلسة واحدة قصيرة لكل ناتجين.'));
    items.forEach((i, k) => {
      const e = tb && tb.get(i.qid), tag = i.kind === 'drop' ? ' (تراجعت)' : '', lo = lastOf(mem, s.id, i.qid);
      const prev = lo && !lo.won ? `\n   سبقت معالجته ولم يتحقق (${lo.score != null ? lo.score + '٪' : 'لم يتحقق'}): غيّري المدخل (مثال محسوس أو تعلّم ثنائي) وراجعي المتطلب السابق قبل إعادة النشاط.` : '';
      if (lo && lo.won) { out.push(`${k + 1}) ${i.outcome}${tag}: تحقق بعد معالجة سابقة (${lo.score != null ? lo.score + '٪' : 'تحقق'}) — يكفي سؤال مراجعة متباعد بعد أسبوعين للتأكد من ثباته.`); return; }
      if (!e) { out.push(`${k + 1}) ${i.outcome}${tag}${prev}\n   راجعي الجزء الخاص بالناتج في ملف درس «${LN[i.lesson] || i.lesson}» ثم أعيدي مرحلته في اللعبة.`); return; }
      out.push(`${k + 1}) ${i.outcome}${tag}${prev}\n   الكتاب: درس «${tb.lessonTitle(e.file)}»، ${tb.pg(e)} — ${e.section}.`
        + (compact ? '' : `\n   المراجعة: ${e.points}`) + `\n   النشاط: ${tb.act(e)}.` + (compact ? '' : `\n   تحقق: ${e.check}`));
    });
    out.push('طريقة التنفيذ: جلسة قصيرة (10–15 دقيقة) لقراءة المواضع المذكورة ثم تنفيذ نشاط الكتاب، ثم إعادة المرحلة في اللعبة، ثم سؤال مكافئ (لا السؤال نفسه) بعد المعالجة.');
    if (plan) out.push('اطلبي منها شرح فكرة واحدة بكلماتها لزميلة أو لكِ (شرح الأقران/استجواب قصير) للتحقق من الفهم.');
    if (drops) out.push(`${drops} من نواتجها تحققت قبليًا ثم لم تتحقق بعديًا: راجعي ثبات التعلّم (تكرار متباعد) بدل إعادة التدريس من الصفر.`);
    return out.join('\n');
  }
  function suggestGroup(g, mem) {
    const tb = TB(), e = tb && tb.get(g.qid), L = LN[g.lesson] || g.lesson;
    const out = [`خطة علاجية جماعية (${g.ids.length} طالبات لم يتحققن في هذا الناتج، من ${g.n} مقارَنة):`];
    if (e) {
      out.push(`1) إعادة تدريس مصغّرة (15–20 دقيقة) لموضع الكتاب: درس «${tb.lessonTitle(e.file)}»، ${tb.pg(e)} — ${e.section}.\n   المراجعة: ${e.points}`);
      out.push(`2) تدريب موجَّه من الكتاب: ${tb.act(e)}.`);
      out.push(`3) تحقق جماعي: ${e.check}`);
      out.push('4) إعادة المرحلة في اللعبة، ثم سؤال مكافئ (لا السؤال نفسه) بعد المعالجة، وبمثال تطبيقي مختلف عن أمثلة الحصة.');
    } else {
      out.push(`إعادة تدريس مصغّرة في مجموعة صغيرة (15–20 دقيقة) لناتج درس «${L}» بمثال تطبيقي مختلف عن أمثلة الحصة، ثم تدريب موجَّه، ثم إعادة المرحلة في اللعبة.`);
    }
    const again = g.ids.filter(id => { const lo = lastOf(mem, id, g.qid); return lo && !lo.won; }).length;
    if (again) out.push(`${again} منهن سبقت معالجتهن في هذا الناتج ولم يتحققن: غيّري المدخل (مثال محسوس أو تعلّم ثنائي) وأعيدي المتطلب السابق قبل تكرار النشاط.`);
    if (g.drops) out.push(`${g.drops} منهن تحققن قبليًا فتراجعن: ركّزي على سبب التراجع (نسيان/لبس في الصياغة) لا على الشرح من جديد.`);
    out.push('إن تكرر الضعف عند عدد كبير من الصف فقد يكون في أسلوب الشرح أو صياغة السؤال؛ راجعي ذلك قبل تحميل الطالبات المسؤولية.');
    return out.join('\n');
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
  /** الخطط المعتمدة لطالبة (للعرض في جدول الأثر) */
  function plansOf(s, C, S) {
    const out = [], pl = S.plans[s.id];
    if (pl && pl.status === 'approved') out.push({ type: 'فردية', text: short(pl.text != null ? pl.text : suggestStudent(s, S.mem)) });
    s.items.forEach(i => {
      const gr = S.groups[i.qid], g = C.groups.find(x => x.qid === i.qid);
      if (gr && gr.status === 'approved' && g && g.ids.includes(s.id)) out.push({ type: 'جماعية', text: short(gr.text != null ? gr.text : suggestGroup(g, S.mem)), outcome: i.outcome });
    });
    return out;
  }

  /* ---------- الأثر المقاس ---------- */
  function impact(C, S) {
    const pairs = approvedPairs(C, S), key = p => rk(p.sid, p.qid);
    const meas = pairs.filter(p => measured(S.results[key(p)]));
    const won = meas.filter(p => isWon(S.results[key(p)], thr(C.outs[p.qid]))), wonK = new Set(won.map(key)), measK = new Set(meas.map(key));
    const byOut = C.rows.map(x => {
      const ps = pairs.filter(p => p.qid === x.qid), ms = meas.filter(p => p.qid === x.qid), ws = won.filter(p => p.qid === x.qid);
      const passers = x.n - x.fail.length, after = pct(passers + ws.length, x.n);
      return { qid: x.qid, outcome: x.outcome, lesson: x.lesson, n: x.n, base: x.base, post: x.after, target: x.target, approved: ps.length, measured: ms.length, won: ws.length, after,
        gain: ms.length || ps.length ? after - x.after : null, closed: x.after < 100 && ms.length ? pct(ws.length, x.fail.length) : null,
        hake: x.after < 100 && ms.length ? Math.round((after - x.after) / (100 - x.after) * 100) : null,
        roi: x.after < x.target && ms.length ? Math.round((after - x.after) / (x.target - x.after) * 100) : null };
    }).filter(o => o.approved > 0);
    const tot = byOut.reduce((a, o) => { a.n += o.n; a.b += Math.round(o.base * o.n / 100); a.p += o.n - (C.outs[o.qid].fail.length); a.w += o.won; return a; }, { n: 0, b: 0, p: 0, w: 0 });
    // الطالبات: نسبتها قبل الخطة (بعد البعدي) وبعدها، والخطة المعتمدة
    const sids = [...new Set(pairs.map(p => p.sid))], stu = sids.map(id => {
      const s = C.students.find(x => x.id === id), mine = pairs.filter(p => p.sid === id), mm = mine.filter(p => measK.has(key(p))), ww = mm.filter(p => wonK.has(key(p)));
      const before = s.before, after = mm.length ? pct(s.passed + ww.length, s.compared) : null;
      return { id, name: s.name, cls: s.cls, weak: s.items.length, compared: s.compared, passed: s.passed, approved: mine.length, measured: mm.length, won: ww.length, score: pct(ww.length, mm.length),
        before, after, delta: after == null || before == null ? null : after - before, plans: plansOf(s, C, S), partial: mm.length > 0 && mm.length < mine.length,
        full: mm.length === s.items.length && ww.length === mm.length };
    });
    const withAfter = stu.filter(s => s.after != null), avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
    return { pairs: pairs.length, measured: meas.length, won: won.length, recovery: pct(won.length, meas.length), coverage: pct(meas.length, pairs.length),
      byOut, stu, overall: tot.n ? { n: tot.n, base: pct(tot.b, tot.n), post: pct(tot.p, tot.n), after: pct(tot.p + tot.w, tot.n) } : null,
      avgBefore: avg(withAfter.map(s => s.before)), avgAfter: avg(withAfter.map(s => s.after)), avgDelta: avg(withAfter.map(s => s.delta)),
      studentsFull: stu.filter(s => s.full).length, studentsApproved: stu.length, studentsMeasured: withAfter.length,
      detail: meas.map(p => { const r = S.results[key(p)], t = thr(C.outs[p.qid]); return { name: p.name, outcome: p.outcome, score: r.score != null ? r.score : null, target: t, ok: wonK.has(key(p)) }; }) };
  }

  /* ---------- الواجهة ---------- */
  const ICO = k => (MDQ.icons && MDQ.icons[k]) || (k === 'check' ? '✓' : '✕');
  function apBtns(type, id, cur) {
    const on = cur === 'approved', off = cur === 'rejected';
    return `<div class="sp-ap"><button type="button" class="ap-btn ok ${on ? 'is-on' : ''}" data-sp="${on ? 'reset' : 'ok'}" data-spt="${type}" data-spi="${id}" aria-pressed="${on}" title="${on ? 'إلغاء الاعتماد' : 'اعتمدي الخطة'}" aria-label="${on ? 'إلغاء اعتماد الخطة' : 'اعتماد الخطة'}">${ICO('check')}</button>`
      + `<button type="button" class="ap-btn no ${off ? 'is-on' : ''}" data-sp="${off ? 'reset' : 'no'}" data-spt="${type}" data-spi="${id}" aria-pressed="${off}" title="${off ? 'إعادة للانتظار' : 'عدم الاعتماد'}" aria-label="${off ? 'إعادة الخطة للانتظار' : 'عدم اعتماد الخطة'}">${ICO('x')}</button>`
      + `<span class="ap-lbl ${on ? 'ok' : off ? 'bad' : ''}">${on ? 'تم اعتماد الخطة' : off ? 'غير معتمدة' : 'بانتظار اعتمادكِ'}</span></div>`;
  }
  function scoreBox(p, S, C, esc) {
    const k = rk(p.sid, p.qid), r = S.results[k], d = S.drafts[k], t = thr(C.outs[p.qid]);
    if (measured(r)) {
      const w = isWon(r, t);
      return `<div class="sp-box done"><span class="muted small-print">${esc(p.lab || p.outcome)}</span> <b class="num">${r.score != null ? r.score + '٪' : '—'}</b> <span class="pill ${w ? 'ok' : 'low'}">${w ? 'تحقق' : 'لم يتحقق'} (حد ${t}٪)</span> <span class="pill ok">اعتمد الوكيل الدرجة</span> <button type="button" class="btn ghost small" data-sp="edit" data-spk="${esc(k)}">تعديل</button></div>`;
    }
    return `<label class="sp-box"><span class="small-print">${esc(p.lab || p.outcome)} <span class="muted">(حد التحقق ${t}٪)</span></span><input type="number" min="0" max="100" step="1" inputmode="numeric" class="t-input" data-spd="${esc(k)}" value="${d == null ? '' : esc(d)}" placeholder="الدرجة ٪" aria-label="درجة ${esc(p.name)} في ${esc(p.outcome)} بعد المعالجة"></label>`;
  }
  const confRow = (cnt, total, type, id) => `<div class="row" style="margin-top:6px"><button type="button" class="btn gold small" data-sp="conf" data-spt="${type}" data-spi="${id}">اعتماد الدرجات (الوكيل)</button><span class="muted small-print">اعتمد الوكيل ${cnt} من ${total} · الصالح من 0 إلى 100، وما لم يُعتمد لا يدخل الحساب.</span></div>`;

  function html(A, set, model, esc) {
    if (!A || !set) return '';
    const S = get(), C = collect(A, S.minGroup), I = impact(C, S);
    const kind = k => k === 'drop' ? '<span class="pill low">تراجعت</span>' : '<span class="pill mid">بقيت ضعيفة</span>';
    let h = `<div id="spSec"><section class="panel card" style="margin:16px 0"><h3 style="margin:0 0 4px">دعم الطالبات بعد المقارنة والاختبار البعدي (جميع الأهداف)</h3>
      <div class="banner info"><div><b>كيف يعمل:</b> يجمع الوكيل الطالبات اللواتي لم يتحققن في ناتج بعد الاختبار البعدي، ويقترح <b>خطة لكل طالبة</b> مبنية على <b>موضع الناتج في كتاب المهارات الرقمية للصف الثالث المتوسط وأنشطته</b> (الوحدتان 1 و2)، و<b>خطة جماعية في جدول</b> عند اشتراك ${S.minGroup} طالبات فأكثر في ناتج واحد. هذه <b>مقترحات عامة</b> لا تشخّص سبب الضعف. اضغطي أيقونة <b>✓</b> لاعتماد الخطة، فيظهر مربع درجة الطالبة بعد المعالجة؛ تُدخلينها ويعتمدها الوكيل ثم يحسب التحسن. لا يُنفَّذ ولا يُحتسب شيء قبل اعتمادكِ.</div></div>`;
    h += agentCard(S);
    if (!C.students.length) return h + '<p class="muted">لا طالبات لم يتحققن في أي ناتج محتسَب (أو لا مقارنات كافية).</p></section></div>';
    const apCnt = Object.values(S.plans).filter(p => p.status === 'approved').length + Object.values(S.groups).filter(p => p.status === 'approved').length;
    h += `<div class="kpis num" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:8px 0">
      <div class="panel kpi"><b>${C.students.length}</b><small>طالبة تحتاج دعمًا بعد المقارنة</small></div>
      <div class="panel kpi"><b>${C.groups.length}</b><small>ناتجًا مشتركًا في الضعف (≥ ${S.minGroup} طالبات)</small></div>
      <div class="panel kpi"><b>${apCnt}</b><small>خطة معتمدة (فردية وجماعية)</small></div></div>
      <div class="row" style="margin:6px 0"><label>حد الخطة الجماعية (عدد الطالبات)<input type="number" min="2" max="20" class="t-input" id="spMin" value="${S.minGroup}" style="width:70px"></label></div>`;
    // خطط جماعية: جدول
    h += `<h4 style="margin:10px 0 4px">خطط جماعية مقترحة (طالبات اشتركن في الضعف)</h4>`;
    h += C.groups.length ? `<div class="t-scroll" style="max-height:480px"><table class="t-table sp-table"><thead><tr><th>الناتج</th><th>الطالبات المشتركات</th><th>الخطة الجماعية المقترحة</th><th>اعتماد المعلمة</th></tr></thead><tbody>${C.groups.map(g => {
        const p = S.groups[g.qid] || {}, txt = p.text != null ? p.text : suggestGroup(g, S.mem), id = esc(g.qid);
        let r = `<tr data-spg="${id}"><td><b>${esc(g.outcome)}</b><br><span class="muted small-print">${esc(LN[g.lesson] || g.lesson)}</span>${bookRef(g.qid) ? `<br><span class="sp-book">${esc(bookRef(g.qid))}</span>` : ''}</td><td><span class="pill mid">${g.ids.length} من ${g.n}</span><br><span class="small-print">${esc(g.names.join('، '))}</span></td>
          <td><textarea class="t-input" data-sptx="g" data-spi="${id}" rows="9" style="min-width:260px">${esc(txt)}</textarea></td><td>${apBtns('g', id, p.status)}</td></tr>`;
        if (p.status === 'approved') {
          const ps = g.ids.map((sid, i) => ({ sid, qid: g.qid, name: g.names[i], outcome: g.outcome, lab: g.names[i] }));
          const conf = ps.filter(x => measured(S.results[rk(x.sid, x.qid)])).length;
          r += `<tr class="sp-sub"><td colspan="4"><b class="ok-t">تم اعتماد الخطة الجماعية.</b> أدخلي درجة كل طالبة في «${esc(g.outcome)}» بعد المعالجة (حد التحقق ${thr(C.outs[g.qid])}٪):<div class="sp-grid">${ps.map(x => scoreBox(x, S, C, esc)).join('')}</div>${confRow(conf, ps.length, 'g', id)}</td></tr>`;
        }
        return r; }).join('')}</tbody></table></div>`
      : `<p class="muted small-print">لا ناتج اشترك في الضعف فيه ${S.minGroup} طالبات فأكثر؛ تظهر الخطط الفردية أدناه.</p>`;
    // خطط فردية: جدول
    h += `<h4 style="margin:14px 0 4px">خطة/توصية مقترحة لكل طالبة</h4><div class="t-scroll" style="max-height:560px"><table class="t-table sp-table"><thead><tr><th>الطالبة</th><th>نواتج لم تتحقق</th><th>الخطة/التوصية المقترحة</th><th>اعتماد المعلمة</th></tr></thead><tbody>${C.students.map(s => {
      const p = S.plans[s.id] || {}, txt = p.text != null ? p.text : suggestStudent(s, S.mem), id = esc(s.id);
      let r = `<tr data-sps="${id}"><td><button type="button" class="link" data-sid="${id}"><b>${esc(s.name)}</b></button><br><span class="muted small-print">${esc(s.cls)}</span><br><span class="pill sp-lv-${levelOf(s).k}">${levelOf(s).label}</span></td>
        <td><ul style="margin:0;padding-inline-start:16px">${s.items.map(i => `<li>${kind(i.kind)} ${esc(i.outcome)} <span class="muted small-print">(${esc(LN[i.lesson] || i.lesson)})</span>${bookRef(i.qid) ? `<br><span class="sp-book">${esc(bookRef(i.qid))}</span>` : ''}${(lo => lo ? `<br><span class="pill ${lo.won ? 'ok' : 'low'}">${lo.won ? 'تحقق بعد معالجة سابقة' : 'سبقت معالجته ولم يتحقق'}</span>` : '')(lastOf(S.mem, s.id, i.qid))}</li>`).join('')}</ul></td>
        <td><textarea class="t-input" data-sptx="s" data-spi="${id}" rows="${Math.min(14, 3 + s.items.length * (s.items.length > 3 ? 2 : 4))}" style="min-width:260px">${esc(txt)}</textarea></td><td>${apBtns('s', id, p.status)}</td></tr>`;
      if (p.status === 'approved') {
        const ps = s.items.map(i => ({ sid: s.id, qid: i.qid, name: s.name, outcome: i.outcome })), conf = ps.filter(x => measured(S.results[rk(x.sid, x.qid)])).length;
        r += `<tr class="sp-sub"><td colspan="4"><b class="ok-t">تم اعتماد الخطة.</b> أدخلي درجة ${esc(s.name)} في كل ناتج بعد المعالجة:<div class="sp-grid">${ps.map(x => scoreBox(x, S, C, esc)).join('')}</div>${confRow(conf, ps.length, 's', id)}</td></tr>`;
      }
      return r; }).join('')}</tbody></table></div></section>`;
    return h + impactHtml(I, S, esc) + '</div>';
  }
  function impactHtml(I, S, esc) {
    const P = v => v == null ? '—' : v + '٪';
    let h = `<section class="panel card" style="margin:16px 0"><h3 style="margin:0 0 4px">ما بعد التوصيات: الأثر المقاس</h3>`;
    if (!I.pairs) return h + '<p class="muted small-print">لم تُعتمد خطة بعد؛ لا أثر يُحسب. اعتمدي خطة بأيقونة ✓ ثم أدخلي الدرجات بعد المعالجة.</p></section>';
    if (!I.measured) return h + `<p class="muted small-print">اعتُمدت ${I.pairs} حالة (طالبة × ناتج) ولم يعتمد الوكيل أي درجة بعد المعالجة؛ أدخلي الدرجات في الجداول أعلاه ثم اضغطي «اعتماد الدرجات».</p></section>`;
    h += `<div class="banner info" style="margin:6px 0"><div>يحسب الوكيل أثر تنفيذ التوصيات من الدرجات التي أدخلتِها واعتمدها. النسبة = النواتج المتحققة ÷ النواتج المقارَنة للطالبة. غير المقيس يُعدّ غير متحقق.</div></div>
      <div class="kpis num" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:8px 0">
      <div class="panel kpi"><b>${I.studentsMeasured} من ${I.studentsApproved}</b><small>طالبات اعتُمدت درجاتهن بعد المعالجة</small></div>
      <div class="panel kpi"><b>${P(I.avgBefore)} ← ${P(I.avgAfter)}</b><small>متوسط نسبة تحقق النواتج: قبل الخطة ← بعدها</small></div>
      <div class="panel kpi"><b>${sgn(I.avgDelta)} نقطة</b><small>متوسط أثر تنفيذ التوصيات</small></div>
      <div class="panel kpi"><b>${P(I.recovery)}</b><small>معدل التعافي: ${I.won} من ${I.measured} حالة مقيسة تحققت</small></div>
      <div class="panel kpi"><b>${P(I.coverage)}</b><small>تغطية القياس: ${I.measured} من ${I.pairs} حالة معتمدة</small></div></div>
      <h4 style="margin:10px 0 4px">أثر الخطة على كل طالبة</h4>
      <div class="t-scroll" style="max-height:520px"><table class="t-table sp-table"><thead><tr><th>الطالبة</th><th>نسبتها قبل الخطة</th><th>الخطة المعتمدة</th><th>نسبتها بعد الخطة</th><th>الأثر</th></tr></thead><tbody>${I.stu.map(s => `<tr><td><b>${esc(s.name)}</b><br><span class="muted small-print">${esc(s.cls)}</span></td>
        <td class="num"><b>${P(s.before)}</b><br><span class="muted small-print">${s.passed} من ${s.compared} نواتج</span></td>
        <td>${s.plans.length ? s.plans.map(p => `<div class="small-print"><span class="pill ok">${p.type}</span> ${p.outcome ? esc(p.outcome) + ': ' : ''}${esc(p.text)}</div>`).join('') : '<span class="muted">—</span>'}</td>
        <td class="num"><b>${P(s.after)}</b><br><span class="muted small-print">${s.measured ? 'تحقق ' + s.won + ' من ' + s.measured + ' بعد المعالجة' + (s.partial ? ' · قياس جزئي (' + s.measured + '/' + s.approved + ')' : '') : 'بانتظار اعتماد الدرجات'}</span></td>
        <td class="num">${s.delta == null ? '—' : `<span class="pill ${s.delta > 0 ? 'ok' : s.delta < 0 ? 'low' : 'na'}">${sgn(s.delta)} نقطة</span>`}</td></tr>`).join('')}</tbody></table></div>
      <details open style="margin:10px 0"><summary class="small-print"><b>تحقق نواتج التعلم قبل الخطة وبعدها (حسب الناتج)</b></summary><div class="t-scroll"><table class="t-table"><thead><tr><th>الناتج</th><th>الأساس</th><th>البعدي (قبل الخطة)</th><th>بعد الخطة</th><th>التغير</th><th>أُغلقت الفجوة</th><th>مكسب نسبي</th><th>أثر نحو المستهدف</th><th>مقيس/معتمد</th></tr></thead><tbody>${I.byOut.map(o => `<tr><td>${esc(o.outcome)}</td><td class="num">${P(o.base)}</td><td class="num">${P(o.post)}</td><td class="num">${P(o.after)}</td><td class="num">${o.measured ? sgn(o.gain) + ' نقطة' : '—'}</td><td class="num">${P(o.closed)}</td><td class="num">${P(o.hake)}</td><td class="num">${P(o.roi)}</td><td class="num">${o.measured}/${o.approved}</td></tr>`).join('')}</tbody></table></div></details>
      <details style="margin:6px 0"><summary class="small-print"><b>الدرجات المعتمدة بعد المعالجة (${I.detail.length})</b></summary><div class="t-scroll"><table class="t-table"><thead><tr><th>الطالبة</th><th>الناتج</th><th>الدرجة</th><th>حد التحقق</th><th>النتيجة</th></tr></thead><tbody>${I.detail.map(d => `<tr><td>${esc(d.name)}</td><td>${esc(d.outcome)}</td><td class="num">${d.score == null ? '—' : d.score + '٪'}</td><td class="num">${d.target}٪</td><td><span class="pill ${d.ok ? 'ok' : 'low'}">${d.ok ? 'تحقق' : 'لم يتحقق'}</span></td></tr>`).join('')}</tbody></table></div></details>
      ${I.overall ? `<p class="small-print">إتقان النواتج المعالَجة (مجمَّع): الأساس ${P(I.overall.base)} ← البعدي ${P(I.overall.post)} ← بعد التوصيات ${P(I.overall.after)} (ن=${I.overall.n} مقارَنة).</p>` : ''}
      <div class="banner info" style="margin:8px 0"><div><b>كيف تُقرأ الأرقام:</b> «معدل التعافي» = المتحقق ÷ المقيس. «أُغلقت الفجوة» = المتحققات بعد المعالجة ÷ غير المتحققات في البعدي. «المكسب النسبي» = (بعد الخطة − البعدي) ÷ (100 − البعدي). «الأثر نحو المستهدف» = التغير ÷ (المستهدف − البعدي).</div></div>
      <div class="banner bad" style="margin:8px 0"><div><b>حدود لا يجوز تجاوزها عند القراءة:</b> (1) لا مجموعة ضابطة، فالأرقام وصفية ولا تُثبت أن الخطة هي السبب. (2) اختير هؤلاء لأنهن الأضعف، وجزء من تحسّنهن متوقع إحصائيًا بلا تدخل (الانحدار نحو المتوسط). (3) إعادة نفس السؤال قد تقيس التذكّر لا التعلّم. ${I.coverage < 100 ? '(4) المقيس ' + I.coverage + '٪ فقط من الحالات المعتمدة؛ معدل التعافي يخص المقيسات وحدها.' : ''}</div></div>
      <div class="row"><button type="button" class="btn gold small" data-sp="csv">تنزيل الأثر المقاس (CSV)</button><button type="button" class="btn small" data-sp="log">سجّلي الأثر في سجل الوكيل</button></div></section>`;
    return h;
  }

  /** بطاقة تعريف الوكيل الفرعي (المثير/الهدف/السياق/القيود/الإجراءات/الأدوات/الذاكرة) — وصف صادق لما ينفّذه الكود فعلًا */
  function agentCard(S) {
    const nMem = Object.keys(S.mem || {}).length;
    const rows = [
      ['المثير', 'نواتج التعلم التي لم تتحقق فيها الطالبة بعد مقارنة نتائجها (اللعبة ← الاختبار البعدي) في جميع الأهداف المحتسَبة.'],
      ['الهدف', 'خطة تدخل متكاملة لسدّ الفجوة: فردية لكل طالبة، وجماعية في جدول عند اشتراك ' + S.minGroup + ' طالبات فأكثر في الناتج.'],
      ['السياق', 'مستشار علاج وتدخلات تعليمية: مهام متمايزة بحسب مستوى الدعم (خفيف / متوسط / مكثف) وتعامل مع الضعف التراكمي بإرجاع الطالبة إلى المتطلب السابق عند تكرار التعثر.'],
      ['القيود', 'تدخلات قصيرة قابلة للتطبيق بلا أوراق إضافية؛ التزام بالنواتج المخفقة فقط؛ المحتوى من كتاب المهارات الرقمية للصف الثالث المتوسط (الفصل الأول، الوحدتان 1 و2) دون تجاوزه؛ المكثف يبدأ بناتجين فقط.'],
      ['الإجراءات', 'تحليل النواتج المخفقة ← اقتراح الخطة ← اعتماد المعلمة (✓) ← إدخال الدرجة بعد المعالجة ← اعتماد الوكيل للدرجات ← حساب الأثر المقاس.'],
      ['الأدوات', 'خريطة الكتاب (js/textbook.js) المستخرجة من ملفات دروس الكتاب بأرقام الصفحات المطبوعة وأنشطته مع صياغة دليل المعلم؛ لا يقرأ الوكيل الملفات لحظيًا ولا يتصل بالإنترنت.'],
      ['الذاكرة', 'يحفظ في متصفح المعلمة: مستوى كل طالبة، ودرجاتها المعتمدة بعد المعالجة لكل ناتج (' + nMem + ' طالبة مسجَّلة الآن)، ويستخدمها في الجولة التالية: ما تحقق يُراجَع بتباعد، وما تعثر بعد معالجة يُغيَّر مدخله.']];
    return `<details class="sp-agent"><summary><b>الوكيل الفرعي: وكيل العلاج والتدخل</b> <span class="muted small-print">(المثير · الهدف · السياق · القيود · الإجراءات · الأدوات · الذاكرة)</span></summary><dl>${rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl><p class="small-print muted">قاعدة مستوى الدعم إرشادية: «مكثف» إن كانت نسبتها قبل الخطة 25٪ فأقل أو لديها 4 نواتج فأكثر، «متوسط» لناتجين فأكثر، وإلا «خفيف». يقترح الوكيل ولا ينفّذ؛ القرار للمعلمة.</p></details>`;
  }
  function bind(root, A, set, model, ctx) {
    const sec = root.querySelector('#spSec'); if (!sec || !A) return;
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const keep = fn => { const y = window.scrollY; fn(); try { (window.requestAnimationFrame || setTimeout)(() => window.scrollTo(0, y)); } catch (e) {} };
    const textOf = (type, id) => { const els = sec.querySelectorAll('[data-sptx="' + type + '"]'); for (const el of els) if (el.dataset.spi === id) return el.value; return null; };
    const boxVal = k => { const els = sec.querySelectorAll('[data-spd]'); for (const el of els) if (el.dataset.spd === k) return el.value; return null; };
    sec.querySelectorAll('[data-sptx]').forEach(el => el.onchange = () => { const S = get(), t = el.dataset.sptx, id = el.dataset.spi, box = t === 'g' ? S.groups : S.plans; box[id] = Object.assign({}, box[id] || {}, { text: el.value }); put(S); });
    const mn = sec.querySelector('#spMin'); if (mn) mn.onchange = () => { const S = get(); S.minGroup = +mn.value; put(S); keep(() => ctx.render()); };
    sec.querySelectorAll('[data-spd]').forEach(el => el.onchange = () => { const S = get(); if (el.value === '') delete S.drafts[el.dataset.spd]; else S.drafts[el.dataset.spd] = el.value; put(S); });
    sec.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => ctx.openStudent(b.dataset.sid));
    sec.querySelectorAll('[data-sp]').forEach(b => b.onclick = async () => {
      const a = b.dataset.sp, S = get(), C = collect(A, S.minGroup);
      if (a === 'ok' || a === 'no' || a === 'reset') {
        const t = b.dataset.spt, id = b.dataset.spi, box = t === 'g' ? S.groups : S.plans, o = Object.assign({}, box[id] || {});
        const tx = textOf(t, id); if (tx != null) o.text = tx;
        if (a === 'reset') { delete o.status; delete o.approvedAt; } else { o.status = a === 'ok' ? 'approved' : 'rejected'; o.approvedAt = new Date().toISOString(); }
        box[id] = o;
        if (a === 'ok' && t === 's') { const st0 = C.students.find(x => x.id === id); if (st0) { const m0 = S.mem[id] = S.mem[id] || { hist: [] }; m0.lv = levelOf(st0).label; m0.lvAt = new Date().toISOString(); } }
        put(S);
        const who = t === 'g' ? ((C.groups.find(g => g.qid === id) || {}).outcome || id) : ((C.students.find(s => s.id === id) || {}).name || id);
        log(a === 'ok' ? 'اعتمدت المعلمة خطة' : a === 'no' ? 'لم تعتمد المعلمة خطة' : 'أُعيدت خطة للانتظار', (t === 'g' ? 'جماعية: ' : 'فردية: ') + who);
        keep(() => ctx.render());
        if (a === 'ok') try { setTimeout(() => { const r = document.querySelector('#spSec'); const el = r && [...r.querySelectorAll('[data-spd]')].find(e => (t === 'g' ? e.dataset.spd.endsWith('|' + id) : e.dataset.spd.startsWith(id + '|'))); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } }, 60); } catch (e) {}
        return;
      }
      if (a === 'edit') { const k = b.dataset.spk, r = S.results[k]; if (r) { S.drafts[k] = r.score != null ? String(r.score) : ''; delete S.results[k]; put(S); log('فُتحت درجة للتعديل', k.split('|')[0]); } keep(() => ctx.render()); return; }
      if (a === 'conf') {
        const t = b.dataset.spt, id = b.dataset.spi;
        const keys = t === 'g' ? (C.groups.find(g => g.qid === id) || { ids: [] }).ids.map(sid => rk(sid, id)) : ((C.students.find(s => s.id === id) || { items: [] }).items).map(i => rk(id, i.qid));
        let ok = 0, bad = 0;
        keys.forEach(k => {
          if (measured(S.results[k])) return;
          const dom = boxVal(k), raw = dom != null ? dom : S.drafts[k];
          if (raw == null || String(raw).trim() === '') return;
          const n = Number(raw);
          if (!isFinite(n) || n < 0 || n > 100) { bad++; return; }
          S.results[k] = { score: Math.round(n * 10) / 10, confirmed: true, at: new Date().toISOString() }; delete S.drafts[k]; ok++;
          const [sid0, qid0] = k.split('|'); remember(S, sid0, qid0, S.results[k].score, S.results[k].score >= thr(C.outs[qid0]));
        });
        put(S);
        const who = t === 'g' ? ((C.groups.find(g => g.qid === id) || {}).outcome || id) : ((C.students.find(s => s.id === id) || {}).name || id);
        if (ok) log('اعتمد الوكيل درجات ما بعد المعالجة', (t === 'g' ? 'جماعية: ' : 'فردية: ') + who + ' · ' + ok + ' درجة');
        ctx.msg(ok ? 'اعتمد الوكيل ' + ok + ' درجة' + (bad ? ' وتجاهل ' + bad + ' قيمة غير صالحة (المسموح من 0 إلى 100).' : '؛ حُسب الأثر أدناه.') : bad ? 'لم يُعتمد شيء: القيمة يجب أن تكون بين 0 و100.' : 'لم يُعتمد شيء: أدخلي الدرجة أولًا.');
        keep(() => ctx.render()); return;
      }
      const I = impact(C, S);
      if (a === 'log') { log('الأثر المقاس بعد التوصيات', `طالبات ${I.studentsMeasured}/${I.studentsApproved} · نسبة التحقق ${I.avgBefore == null ? '—' : I.avgBefore + '٪'}←${I.avgAfter == null ? '—' : I.avgAfter + '٪'} · أثر ${I.avgDelta == null ? '—' : sgn(I.avgDelta)} نقطة · تعافٍ ${I.recovery == null ? '—' : I.recovery + '٪'} (${I.won}/${I.measured}) · تغطية ${I.coverage == null ? '—' : I.coverage + '٪'}`); ctx.msg('سُجّل الأثر في سجل الوكيل.'); return; }
      if (a === 'csv') {
        const head = ['الطالبة', 'الفصل', 'نسبتها قبل الخطة %', 'الخطة المعتمدة', 'نسبتها بعد الخطة %', 'الأثر (نقاط)', 'مقيس/معتمد'];
        const R = I.stu.map(s => [s.name, s.cls, s.before == null ? '' : s.before, s.plans.map(p => p.type + (p.outcome ? ' (' + p.outcome + ')' : '') + ': ' + p.text).join(' | '), s.after == null ? '' : s.after, s.delta == null ? '' : s.delta, s.measured + '/' + s.approved]);
        const D = [[], ['الدرجات المعتمدة بعد المعالجة'], ['الطالبة', 'الناتج', 'الدرجة %', 'حد التحقق %', 'النتيجة']].concat(I.detail.map(d => [d.name, d.outcome, d.score == null ? '' : d.score, d.target, d.ok ? 'تحقق' : 'لم يتحقق']));
        const sum = [[], ['ملخص'], ['متوسط النسبة قبل الخطة', I.avgBefore == null ? '' : I.avgBefore + '%'], ['متوسط النسبة بعد الخطة', I.avgAfter == null ? '' : I.avgAfter + '%'], ['متوسط الأثر (نقاط)', I.avgDelta == null ? '' : I.avgDelta], ['معدل التعافي', I.recovery == null ? '' : I.recovery + '%'], ['تغطية القياس', I.coverage == null ? '' : I.coverage + '%']];
        const lines = [head.map(q).join(',')].concat(R.map(r => r.map(q).join(','))).concat(D.map(r => r.map(q).join(','))).concat(sum.map(r => r.map(q).join(',')));
        await MDQ.saveFile('الأثر_المقاس_بعد_التوصيات.csv', new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
      }
    });
  }
  const wipe = () => { MEM = null; try { localStorage.removeItem(SK); } catch (e) {} };

  MDQ.support = { VERSION, SK, MIN_GROUP, bookRef, collect, suggestStudent, suggestGroup, approvedPairs, plansOf, impact, get, put, wipe, html, bind, levelOf, lastOf };
})();
