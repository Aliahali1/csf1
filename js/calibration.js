/* ============================================================
   معايرة عتبة التشخيص (المرحلة 1 — للمعلمة فقط)
   السؤال: عند أي عتبة تكون وسوم اللعبة (المحاولة الأولى دون العتبة ← ناتج ضعيف) أنفع للمعلمة؟
   - المرجع ثابت: الناتج «ضعيف بعديًا» إن كان إتقانه في الاختبار البعدي دون حد الإتقان المعلن في الاتساق.
   - تُجرَّب عتبات اللعبة على شبكة معلنة، ويُعرض لكل عتبة: عدد الموسوم، الحساسية، الخصوصية، القيمة التنبؤية، يودن.
   - الهدف المعلن للاختيار (قاعدة لا نموذج): حساسية ≥ الحد الأدنى وأقل نسبة وسوم ممكنة فوق يودن الأعلى، ضمن سقف نسبة وسوم؛
     إن لم تتحقق الشروط معًا يُعرض الأعلى يودن مع وسم «بديل».
   - التحقق: ترك درس جانبًا (4 دروس) ثم اختيار العتبة على الباقي وتقييمها على المتروك. وهو أصدق من تقييمها على العينة نفسها،
     لكنه استكشافي (≈ 24 ناتجًا فقط).
   - يقترح ولا يغيّر شيئًا: اعتماد العتبة قرار المعلمة، ويضبط «عتبة وسم الضعف في المحاولة الأولى» في الاتساق (لا مستهدف الأهداف)،
     ويُسجَّل التعديل ويُعلَّم بأنه بعد رؤية النتائج.
   - كل شيء يُحسب داخل المتصفح؛ لا يُرسل شيء لأي جهة.
   ============================================================ */
(function () {
  window.MDQ = window.MDQ || {};
  const VERSION = '1.0.0', KEY = 'mdq.agent.calib.v1';
  const GRID = [60, 65, 70, 75, 80, 85, 90, 95], OBJ = { minSens: 80, maxFlagRate: 70 };
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const log = (ev, d) => { try { if (MDQ.goals) MDQ.goals.logEvent('calibration', ev, d || ''); } catch (e) {} };
  const pc = (a, b) => b ? a / b * 100 : null;
  const r1 = x => x == null || !isFinite(x) ? null : Math.round(x * 10) / 10;

  /** outs: [{lesson, first, post}] بنسب مئوية؛ t = عتبة اللعبة؛ ref = حد الإتقان البعدي */
  function confusion(outs, t, ref) {
    const c = { tp: 0, fp: 0, fn: 0, tn: 0 };
    outs.forEach(o => { const flag = o.first < t, weak = o.post < ref; if (flag && weak) c.tp++; else if (flag) c.fp++; else if (weak) c.fn++; else c.tn++; });
    return c;
  }
  function metrics(c) {
    const n = c.tp + c.fp + c.fn + c.tn, sens = pc(c.tp, c.tp + c.fn), spec = pc(c.tn, c.tn + c.fp);
    return { n, flagged: c.tp + c.fp, flagRate: pc(c.tp + c.fp, n), sens, spec, ppv: pc(c.tp, c.tp + c.fp), npv: pc(c.tn, c.tn + c.fn),
      youden: sens == null || spec == null ? null : (sens + spec) / 100 - 1, c };
  }
  function sweep(outs, ref, grid) { return (grid || GRID).map(t => Object.assign({ t }, metrics(confusion(outs, t, ref)))); }

  /** يختار العتبة بالقاعدة المعلنة. يعيد {t, row, fallback, rule} أو null إن لم تُعرَّف حساسية (لا ناتج ضعيف بعديًا). */
  function choose(rows, obj) {
    obj = Object.assign({}, OBJ, obj || {});
    const ok = rows.filter(r => r.sens != null && r.spec != null);
    if (!ok.length) return null;
    const pick = (arr, tie) => arr.slice().sort((a, b) => b.youden - a.youden || tie(a, b))[0];
    const cand = ok.filter(r => r.sens >= obj.minSens && r.flagRate <= obj.maxFlagRate);
    if (cand.length) return { t: pick(cand, (a, b) => a.flagRate - b.flagRate || a.t - b.t).t, fallback: false, rule: obj };
    return { t: pick(ok, (a, b) => a.flagRate - b.flagRate || a.t - b.t).t, fallback: true, rule: obj };
  }

  /** ترك درس جانبًا: تُختار العتبة على الدروس الأخرى وتُقيَّم على الدرس المتروك؛ تُجمَّع النتائج المتروكة */
  function lolo(outs, ref, obj, grid) {
    const ls = [...new Set(outs.map(o => o.lesson))]; if (ls.length < 3) return null;
    const agg = { tp: 0, fp: 0, fn: 0, tn: 0 }, folds = [];
    ls.forEach(l => {
      const train = outs.filter(o => o.lesson !== l), test = outs.filter(o => o.lesson === l), ch = choose(sweep(train, ref, grid), obj);
      if (!ch || !test.length) return; const c = confusion(test, ch.t, ref); Object.keys(agg).forEach(k => { agg[k] += c[k]; }); folds.push({ lesson: l, t: ch.t, n: test.length, fallback: ch.fallback });
    });
    if (!folds.length) return null;
    const ts = [...new Set(folds.map(f => f.t))];
    return { folds, m: metrics(agg), stable: ts.length === 1, ts };
  }

  /** التحليل الكامل. outs من MDQ.consistency.compute(...).outcomes */
  function analyze(outs, ref, opt) {
    opt = opt || {}; const obj = Object.assign({}, OBJ, opt.objective || {}), grid = opt.grid || GRID;
    const data = (outs || []).filter(o => o.first != null && o.post != null && isFinite(o.first) && isFinite(o.post));
    const rows = sweep(data, ref, grid), ch = choose(rows, obj), cv = lolo(data, ref, obj, grid), warn = [];
    const weakN = data.filter(o => o.post < ref).length;
    if (data.length < 12) warn.push(`عدد النواتج قليل (${data.length}): لا تُعمَّم العتبة المقترحة.`);
    if (weakN < 3) warn.push(`النواتج الضعيفة بعديًا قليلة (${weakN}): الحساسية غير موثوقة.`);
    if (weakN === data.length) warn.push('كل النواتج دون حد الإتقان بعديًا: لا يمكن قياس الخصوصية.');
    if (cv && !cv.stable) warn.push('العتبة المختارة تتغير بين طيّات التحقق (' + cv.ts.join('، ') + '): الاختيار غير مستقر.');
    if (ch && ch.fallback) warn.push(`لا عتبة تحقق الشرطين معًا (حساسية ≥ ${obj.minSens}٪ ووسوم ≤ ${obj.maxFlagRate}٪)؛ يُعرض الأعلى يودن بديلًا.`);
    warn.push('التقدير على العينة نفسها متفائل؛ ما يُعتدّ به نسبيًا هو نتيجة ترك الدرس جانبًا.');
    return { ref, n: data.length, weakN, objective: obj, rows, choice: ch, cv, warnings: warn, version: VERSION };
  }

  /* ---------- الاعتماد (قرار المعلمة) ---------- */
  const getAdopted = () => rd(KEY, null);
  function adopt(t, info) {
    t = Math.round(+t); if (!(t >= 1 && t <= 100)) return null;
    const rec = { t, at: new Date().toISOString(), ref: info && info.ref, n: info && info.n, by: 'المعلمة', recommended: info && info.recommended != null ? info.recommended : null };
    wr(KEY, rec); log('اعتمدتُ عتبة وسم الضعف في المحاولة الأولى', t + '٪ (المقترحة: ' + (rec.recommended == null ? '—' : rec.recommended + '٪') + ')');
    try { if (MDQ.consistency && MDQ.consistency.getCfg && MDQ.consistency.getCfg()) MDQ.consistency.change({ flag: t }); } catch (e) {}
    return rec;
  }
  const clearAdopted = () => { try { localStorage.removeItem(KEY); } catch (e) {} };

  /* ---------- العرض ---------- */
  const f = (x, d) => x == null || !isFinite(x) ? '—' : (+x).toFixed(d == null ? 0 : d);
  function html(outs, cfg, esc) {
    const R = analyze(outs, cfg.mastery), ad = getAdopted();
    if (R.n < 3) return '';
    const ch = R.choice, curT = cfg.mastery;
    const row = r => `<tr${r.t === curT ? ' style="outline:2px solid var(--primary,#7b2d8e)"' : ''}><td class="num">${r.t}٪${r.t === curT ? ' <small>(الحالية)</small>' : ''}${ch && r.t === ch.t ? ' <span class="pill ok">' + (ch.fallback ? 'بديل' : 'مقترحة') + '</span>' : ''}${ad && ad.t === r.t ? ' <span class="pill mid">معتمدة</span>' : ''}</td>
      <td class="num">${r.flagged} من ${r.n} (${f(r.flagRate)}٪)</td><td class="num">${f(r.sens)}٪</td><td class="num">${f(r.spec)}٪</td><td class="num">${f(r.ppv)}٪</td><td class="num">${f(r.youden, 2)}</td></tr>`;
    return `<details open id="pCal" style="margin:12px 0"><summary class="small-print"><b>معايرة العتبة: عند أي عتبة تنفع وسوم اللعبة أكثر؟ (استكشافي)</b></summary>
      <p class="small-print muted">المرجع: ناتج «ضعيف بعديًا» إن كان دون ${esc(String(R.ref))}٪ في البعدي (وهو حد الإتقان المعلن). تُجرَّب عتبات اللعبة وتُقاس جودة الوسم عند كل منها. القاعدة المعلنة للاقتراح: حساسية ≥ ${R.objective.minSens}٪ ووسوم ≤ ${R.objective.maxFlagRate}٪ من النواتج، ثم الأعلى يودن.</p>
      <div class="t-scroll"><table class="t-table"><thead><tr><th>عتبة اللعبة (المحاولة الأولى دونها)</th><th>الموسوم</th><th>الحساسية</th><th>الخصوصية</th><th>القيمة التنبؤية</th><th>يودن</th></tr></thead><tbody>${R.rows.map(row).join('')}</tbody></table></div>
      ${R.cv ? `<p class="small-print"><b>التحقق بترك درس جانبًا:</b> الحساسية ${f(R.cv.m.sens)}٪ · الخصوصية ${f(R.cv.m.spec)}٪ · القيمة التنبؤية ${f(R.cv.m.ppv)}٪ على ${R.cv.m.n} ناتجًا؛ العتبات المختارة في الطيّات: <span class="num">${esc(R.cv.ts.join('، '))}</span>${R.cv.stable ? ' (مستقرة)' : ' (غير مستقرة)'}.</p>` : ''}
      ${R.warnings.map(w => `<div class="banner info" style="margin:4px 0"><div>${esc(w)}</div></div>`).join('')}
      <div class="row" style="flex-wrap:wrap;gap:8px"><label>اعتماد عتبة وسم الضعف في المحاولة الأولى ٪<select id="calPick" class="t-input">${R.rows.map(r => `<option value="${r.t}" ${ch && r.t === ch.t ? 'selected' : ''}>${r.t}</option>`).join('')}</select></label>
        <button class="btn gold small" id="calAdopt">اعتمدي هذه العتبة (قرار يُسجَّل)</button>${ad ? `<span class="small-print muted">المعتمدة حاليًا: ${ad.t}٪ · ${esc(new Date(ad.at).toLocaleString('ar-SA-u-nu-latn'))}</span>` : ''}</div>
      <p class="small-print muted">الاعتماد يغيّر عتبة وسم الضعف في المحاولة الأولى داخل الاتساق فقط (لا حد الإتقان البعدي ولا مستهدفات الأهداف)، ويُعلَّم تعديلًا بعد رؤية النتائج ويُسجَّل في سجل الوكيل.</p></details>`;
  }
  function bind(root, outs, cfg, ctx) {
    const b = root.querySelector('#calAdopt'); if (!b) return;
    b.onclick = () => { const R = analyze(outs, cfg.mastery), v = +root.querySelector('#calPick').value; adopt(v, { ref: R.ref, n: R.n, recommended: R.choice ? R.choice.t : null }); ctx.msg('اعتُمدت عتبة الوسم ' + v + '٪ وسُجّل قرارك (علامة: تعديل بعد رؤية النتائج).'); ctx.render(); };
  }

  MDQ.calibration = { VERSION, KEY, GRID, OBJ, confusion, metrics, sweep, choose, lolo, analyze, getAdopted, adopt, clearAdopted, html, bind };
})();
