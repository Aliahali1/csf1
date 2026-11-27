/* ============================================================
   حلقة المتابعة المغلقة (المرحلة 2 — للمعلمة فقط)
   الدورة: خطة ← تنفيذ بقرار المعلمة ← قياس ← (تحقق: تثبيت وإغلاق) أو (لم يتحقق: استراتيجية جديدة بمسوّغ) أو (إحالة بعد الحد الأقصى).
   - مكتبة استراتيجيات مبنية على محتوى الكتاب وبيانات الطالبة نفسها: لا نص يُولَّد ولا أداة خارجية.
   - الاختيار قاعدة معلنة: استراتيجية لم تُجرَّب لهذه الطالبة في هذا الناتج، وبين المتاحة تُفضَّل الأعلى نجاحًا في ذاكرة الدورات
     (تقدير مُلطَّف (نجاح+1)/(محاولات+2) ولا يُعتدّ به قبل 3 محاولات)، وعند التعادل ترتيب المكتبة. المسوّغ يُكتب بالأرقام.
   - ذاكرة الدورات: نتائج الاستراتيجيات حسب نوع الناتج (مفهوم/إجراء) وسجل لقطات الأهداف عبر الدورات، في متصفح المعلمة.
   - الحدود: يصوغ مسودات فقط؛ لا يعتمد ولا يرسل ولا يعدّل بيانات. أقصى عدد دورات للناتج (افتراضيًا 3) ثم يُحيل إلى المعلمة.
     يعمل عند ضغط المعلمة «شغّلي دورة المتابعة»، ويحترم «الإيقاف الفوري». الذاكرة وصفية لا استدلال إحصائي (أعداد صغيرة).
   ============================================================ */
(function () {
  window.MDQ = window.MDQ || {};
  const KEY = 'mdq.agent.loop.v1', VERSION = '1.0.0', MIN_EVID = 3, DEFAULT_MAX = 3;
  const log = (ev, d) => { try { if (MDQ.goals) MDQ.goals.logEvent('loop', ev, d || ''); } catch (e) {} };
  const now = () => new Date().toISOString();
  const blank = () => ({ v: 1, cfg: { maxCycles: DEFAULT_MAX }, episodes: {}, strat: { concept: {}, procedure: {} }, snaps: [] });
  let mem = null, memOnly = false;
  function load() { if (mem) return mem; try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); mem = v && v.v === 1 ? v : blank(); } catch (e) { mem = blank(); } return mem; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); memOnly = false; return true; } catch (e) { memOnly = true; return false; } }
  function reset() { mem = null; }
  function wipe() { mem = blank(); try { localStorage.removeItem(KEY); } catch (e) {} memOnly = false; log('مُسحت ذاكرة حلقة المتابعة', ''); }
  const maxCycles = () => load().cfg.maxCycles;
  function setMaxCycles(n) { load().cfg.maxCycles = Math.max(1, Math.min(5, Math.round(+n) || DEFAULT_MAX)); save(); }
  const epKey = (id, qid) => id + '|' + qid;

  /* ---------- مكتبة الاستراتيجيات ---------- */
  const T = [5, 7, 3]; // دقائق الخطوات كما في وكيل الخطط
  const stageOf = lesson => { try { const l = MDQ.bank && MDQ.bank.lesson(lesson); return l && l.stage ? l.stage : null; } catch (e) { return null; } };
  const pgTxt = e => (MDQ.textbook && MDQ.textbook.pg ? MDQ.textbook.pg(e) : '');
  const act = (e, attempt) => e && e.activity && e.activity.length ? e.activity[attempt % e.activity.length] : null;
  const STRATS = [
    { id: 'book', label: 'مراجعة الكتاب ثم تطبيق', needs: c => !!c.entry,
      steps: c => [{ t: 'راجعي في الكتاب موضع «' + c.entry.section + '» (' + pgTxt(c.entry) + '): ' + c.entry.points, min: T[0] },
        { t: act(c.entry, c.attempt) ? 'نفّذي ' + act(c.entry, c.attempt).n + ' (ص' + act(c.entry, c.attempt).p + (act(c.entry, c.attempt).what ? ': ' + act(c.entry, c.attempt).what : '') + ').' : 'نفّذي مثالًا تطبيقيًا قصيرًا على الناتج من الكتاب.', min: T[1] },
        { t: c.entry.check, min: T[2] }] },
    { id: 'distractor', label: 'مواجهة الخيار الخاطئ الذي اختارته', needs: c => !!(c.entry && c.distractor && c.distractor.usable && c.distractor.mineText),
      steps: c => [{ t: 'اعرضي عليها الخيار الذي اختارته في اللعبة: «' + c.distractor.mineText + '»' + (c.distractor.mineShare != null && c.distractor.class.reliable ? ' (اختارته ' + c.distractor.mineShare + '٪ ممن أخطأن في هذا السؤال)' : '') + ' واسأليها: ما الذي جعله يبدو صحيحًا؟', min: T[0] },
        { t: 'قارني تبريرها بنص الكتاب في موضع «' + c.entry.section + '» (' + pgTxt(c.entry) + '): ' + c.entry.points, min: T[1] },
        { t: c.entry.check, min: T[2] }] },
    { id: 'worked', label: 'مثال محلول ثم حلّ مشابه', needs: c => !!(c.entry && act(c.entry, c.attempt)),
      steps: c => { const a = act(c.entry, c.attempt); return [{ t: 'اشرحي أمامها ' + a.n + ' (ص' + a.p + (a.what ? ': ' + a.what : '') + ') مثالًا محلولًا خطوة بخطوة مع نطق سبب كل خطوة.', min: T[0] },
        { t: 'اطلبي منها تكرار الخطوات نفسها بنفسها دون النظر إلى الكتاب على جزء «' + c.entry.section + '».', min: T[1] },
        { t: c.entry.check, min: T[2] }]; } },
    { id: 'peer', label: 'شرح بين زميلتين', needs: c => !!(c.entry && c.peers && c.peers.length),
      steps: c => [{ t: 'اقرئي معها بإيجاز موضع «' + c.entry.section + '» (' + pgTxt(c.entry) + ').', min: T[0] },
        { t: 'ضعيها مع زميلة أتقنت هذا الناتج في البعدي (' + c.peers.join('، ') + ') لتشرح كل منهما الفكرة بكلماتها، ثم تبادلان الدور.', min: T[1] },
        { t: c.entry.check, min: T[2] }] },
    { id: 'replay', label: 'إعادة لعب المرحلة مع الشرح بصوت مسموع', needs: c => !!(c.entry && c.stage),
      steps: c => [{ t: 'اطلبي منها إعادة لعب مرحلة «' + c.stage + '» وقراءة كل تلميح بصوت مسموع.', min: T[0] },
        { t: 'اطلبي منها شرح سبب الإجابة الصحيحة لسؤال هذا الناتج بكلماتها (موضعه في الكتاب: ' + pgTxt(c.entry) + ').', min: T[1] },
        { t: c.entry.check, min: T[2] }] }
  ];
  const byId = id => STRATS.find(s => s.id === id) || null;
  const available = c => STRATS.filter(s => { try { return s.needs(c); } catch (e) { return false; } });

  /* ---------- ذاكرة الاستراتيجيات ---------- */
  const stat = (kind, id) => { const m = load().strat[kind === 'procedure' ? 'procedure' : 'concept']; return m[id] || { t: 0, s: 0 }; };
  const score = (kind, id) => { const z = stat(kind, id); return z.t >= MIN_EVID ? (z.s + 1) / (z.t + 2) : 0.5; };

  /**
   * يختار الاستراتيجية. c = {kind, attempt, entry, distractor, peers, stage, used:[ids]}
   * يعيد {strategy, rationale, ranking:[{id, ok, score, t, s, used}]} أو {strategy:null, rationale} إن لم يبق خيار (إحالة).
   */
  function pick(c) {
    const used = c.used || [], av = available(c).map(s => s.id);
    const ranking = STRATS.map((s, i) => { const z = stat(c.kind, s.id); return { id: s.id, label: s.label, ok: av.includes(s.id), used: used.includes(s.id), score: score(c.kind, s.id), t: z.t, s: z.s, order: i }; });
    const cand = ranking.filter(r => r.ok && !r.used).sort((a, b) => b.score - a.score || a.order - b.order);
    if (!cand.length) return { strategy: null, ranking, rationale: used.length ? 'جُرِّبت كل الاستراتيجيات المتاحة لهذه الطالبة في هذا الناتج؛ أحيلها إليكِ لمراجعة فردية.' : 'لا استراتيجية متاحة لهذا الناتج (لا موضع له في الكتاب).' };
    const best = cand[0], parts = [];
    parts.push(used.length ? 'جُرّب سابقًا: ' + used.map(u => (byId(u) || {}).label || u).join('، ') + '؛ فاخترتُ استراتيجية جديدة.' : 'أول دورة لهذه الطالبة في هذا الناتج.');
    const ev = best.t >= MIN_EVID ? 'في ذاكرة الدورات نجحت ' + best.s + ' من ' + best.t + ' مرات مع نواتج من النوع نفسه (' + (c.kind === 'procedure' ? 'إجرائي' : 'مفاهيمي') + ').' : 'لا أدلة كافية بعد في الذاكرة (أقل من ' + MIN_EVID + ' محاولات)؛ اتبعتُ ترتيب المكتبة.';
    parts.push(ev);
    if (best.id === 'distractor') parts.push('لها خيار خاطئ مسجَّل في اللعبة.');
    if (best.id === 'peer') parts.push('وُجدت زميلات أتقنّ الناتج في الفصل نفسه.');
    return { strategy: best.id, ranking, rationale: parts.join(' ') };
  }
  /** الاستراتيجيات المستخدمة سابقًا في حلقة طالبة/ناتج */
  const usedOf = (id, qid) => { const e = load().episodes[epKey(id, qid)]; return e ? e.cycles.map(c => c.strategy).filter(Boolean) : []; };
  const episode = (id, qid) => load().episodes[epKey(id, qid)] || null;
  /** هل الحلقة مقفلة أمام خطة جديدة؟ (تحققت، أو أُحيلت، أو بلغت الحد الأقصى بنتيجة فاشلة) */
  function blocked(id, qid) {
    const e = episode(id, qid); if (!e) return null;
    if (e.status === 'mastered') return 'mastered';
    if (e.status === 'referred') return 'referred';
    const done = e.cycles.filter(c => c.result === false).length;
    return done >= maxCycles() ? 'max' : null;
  }

  /** يُستدعى عند إنشاء خطة: يسجّل الدورة في الحلقة */
  function record(plan) {
    const d = load(), k = epKey(plan.studentId, plan.qid), e = d.episodes[k] = d.episodes[k] || { studentId: plan.studentId, name: plan.name, qid: plan.qid, outcome: plan.outcome, kind: plan.kind, status: 'open', cycles: [], openedAt: now() };
    if (!e.cycles.some(c => c.planKey === plan.key)) e.cycles.push({ n: e.cycles.length + 1, planKey: plan.key, strategy: plan.strategy || 'book', rationale: plan.rationale || '', at: now(), result: null });
    save();
  }

  /** إحالة حالة إلى المعلمة (استُنفدت الدورات أو لا أسلوب جديد متاح). لا يُنشئ خطة. */
  function refer(id, qid, name, outcome, kind, why) {
    const d = load(), k = epKey(id, qid), e = d.episodes[k] = d.episodes[k] || { studentId: id, name, qid, outcome, kind, status: 'open', cycles: [], openedAt: now() };
    if (e.status === 'referred') return e;
    e.status = 'referred'; e.closedAt = now(); e.reason = why || 'بلغت الحد الأقصى من الدورات ' + d.cfg.maxCycles + ' دون تحقق'; save();
    log('إحالة حالة إلى المعلمة', (name || id) + ' · ' + String(outcome || qid).slice(0, 40)); return e;
  }

  /** يضيف إلى الحلقات الخطط التي أُنشئت قبل وجودها (دون سجل دورات)، ويُحتسب أسلوبها «الكتاب» ونتيجتها المعروفة في الذاكرة. آمن للتكرار. */
  function backfill(plans) {
    const d = load(); let added = 0;
    (plans || []).slice().sort((a, b) => a.attempt - b.attempt).forEach(p => {
      const k = epKey(p.studentId, p.qid), e = d.episodes[k] = d.episodes[k] || { studentId: p.studentId, name: p.name, qid: p.qid, outcome: p.outcome, kind: p.kind, status: 'open', cycles: [], openedAt: now() };
      if (e.cycles.some(c => c.planKey === p.key)) return;
      const strategy = p.strategy || 'book', res = p.status === 'approved' && p.afterPass != null ? !!p.afterPass : null;
      e.cycles.push({ n: e.cycles.length + 1, planKey: p.key, strategy, rationale: p.rationale || 'خطة سابقة لإصدار الحلقة (احتُسبت بأسلوب الكتاب)', at: p.createdAt || now(), result: res, legacy: !p.strategy }); added++;
      if (res != null) { const kind = (e.kind === 'procedure' ? 'procedure' : 'concept'), z = d.strat[kind][strategy] = d.strat[kind][strategy] || { t: 0, s: 0 }; z.t++; if (res) z.s++; if (res) { e.status = 'mastered'; e.closedAt = now(); } else if (e.cycles.filter(x => x.result === false).length >= d.cfg.maxCycles) { e.status = 'referred'; e.closedAt = now(); e.reason = 'بلغت الحد الأقصى من الدورات ' + d.cfg.maxCycles + ' دون تحقق'; } }
    });
    if (added) { save(); log('استكمال سجل الدورات من خطط سابقة', added + ' دورة'); }
    return added;
  }
  /** يحذف دورة مسودة أُعيد توليدها */
  function dropCycle(id, qid, planKey) {
    const d = load(), k = epKey(id, qid), e = d.episodes[k]; if (!e) return; e.cycles = e.cycles.filter(c => c.planKey !== planKey).map((c, i) => Object.assign(c, { n: i + 1 }));
    if (!e.cycles.length) delete d.episodes[k]; save();
  }

  /** يقرأ نتائج الخطط المعتمدة (afterPass) ويحدّث الحلقات والذاكرة. دالة قابلة للتكرار دون ازدواج. */
  function observe(plans) {
    const d = load(); let updated = 0, mastered = 0, failed = 0, referred = 0;
    (plans || []).forEach(p => {
      if (p.status !== 'approved' || p.afterPass == null) return;
      const e = d.episodes[epKey(p.studentId, p.qid)]; if (!e) return; const c = e.cycles.find(x => x.planKey === p.key); if (!c || c.result != null) return;
      c.result = !!p.afterPass; c.resultAt = now(); updated++;
      const kind = (e.kind === 'procedure' ? 'procedure' : 'concept'), z = d.strat[kind][c.strategy] = d.strat[kind][c.strategy] || { t: 0, s: 0 };
      z.t++; if (c.result) z.s++;
      if (c.result) { e.status = 'mastered'; e.closedAt = now(); mastered++; }
      else { failed++; if (e.cycles.filter(x => x.result === false).length >= d.cfg.maxCycles) { e.status = 'referred'; e.closedAt = now(); e.reason = 'بلغت الحد الأقصى من الدورات ' + d.cfg.maxCycles + ' دون تحقق'; referred++; } }
    });
    if (updated) { save(); log('قراءة نتائج الدورات', updated + ' نتيجة · تحققت ' + mastered + ' · لم تتحقق ' + failed + (referred ? ' · أُحيلت ' + referred : '')); }
    return { updated, mastered, failed, referred };
  }

  /* ---------- ذاكرة الأهداف عبر الدورات ---------- */
  /** لقطة من تحليل البعدي: نسب الأولى والبعدي لكل ناتج، تُحفظ مرة لكل ملف بعدي */
  function snapshot(A, target, label) {
    if (!A || !A.rows) return null;
    const outs = A.rows.filter(r => r.counted !== false && r.per && r.per.length).map(r => ({ qid: r.qid, outcome: r.outcome, n: r.per.length,
      first: Math.round(r.per.filter(p => p.base).length / r.per.length * 100), post: Math.round(r.per.filter(p => p.post).length / r.per.length * 100) }));
    if (!outs.length) return null;
    const d = load(), s = { at: now(), label: label || '', target: +target || 90, outs };
    const last = d.snaps[d.snaps.length - 1];
    if (last && label && last.label === label) { d.snaps[d.snaps.length - 1] = s; } else d.snaps.push(s);
    d.snaps = d.snaps.slice(-8); save(); log('لقطة أهداف الدورة', outs.length + ' ناتجًا · المستهدف ' + s.target + '٪'); return s;
  }
  /** اقتراحات أهداف الدورة القادمة من آخر لقطتين (قواعد معلنة) */
  function proposeGoals() {
    const sn = load().snaps; if (!sn.length) return [];
    const cur = sn[sn.length - 1], prev = sn.length > 1 ? sn[sn.length - 2] : null, pm = prev ? Object.fromEntries(prev.outs.map(o => [o.qid, o])) : {};
    return cur.outs.map(o => {
      const p = pm[o.qid], met = o.post >= cur.target, pmet = p && p.post >= (prev.target || cur.target), gain = p ? o.post - p.post : null;
      let act, why;
      if (met && pmet) { act = 'retire'; why = 'بلغ المستهدف في لقطتين متتاليتين: ثبّتيه وانقلي الجهد لناتج آخر.'; }
      else if (met) { act = 'hold'; why = 'بلغ المستهدف الآن؛ أعيدي قياسه في الدورة القادمة قبل إيقافه.'; }
      else if (p && gain >= 5) { act = 'persist'; why = 'دون المستهدف لكنه تحسّن ' + gain + ' نقطة عن اللقطة السابقة: واصلي الخطة نفسها.'; }
      else if (p) { act = 'change'; why = 'دون المستهدف ولم يتحسّن (' + (gain >= 0 ? '+' : '') + gain + ' نقطة) في لقطتين: غيّري أسلوب المعالجة أو راجعي صياغة السؤال.'; }
      else { act = 'new'; why = 'أول لقطة له: لا مقارنة بعد.'; }
      return { qid: o.qid, outcome: o.outcome, post: o.post, first: o.first, target: cur.target, prevPost: p ? p.post : null, action: act, why };
    }).sort((a, b) => ({ change: 0, persist: 1, new: 2, hold: 3, retire: 4 }[a.action] - { change: 0, persist: 1, new: 2, hold: 3, retire: 4 }[b.action]) || a.post - b.post);
  }
  const ACT = { change: ['غيّري الأسلوب', 'low'], persist: ['واصلي', 'mid'], new: ['جديد', 'na'], hold: ['أعيدي القياس', 'ok'], retire: ['ثبّتي وأوقفي', 'ok'] };

  /**
   * دورة المتابعة بضغطة المعلمة: لقطة الأهداف + قراءة النتائج + مسودات خطط جديدة للمخفقات ضمن الحد.
   * rem = MDQ.remedial؛ A = تحليل البعدي؛ يتوقف عند الإيقاف الفوري أو الأسماء غير المحسومة.
   */
  function advance(A, target, label) {
    if (MDQ.std && MDQ.std.stopped && MDQ.std.stopped()) return { ok: false, msg: 'الوكيل موقوف (إيقاف فوري). استأنفيه أولًا.' };
    if (!A || !A.rows) return { ok: false, msg: 'ارفعي ملف الاختبار البعدي أولًا.' };
    if (A.tally && A.tally.pending) return { ok: false, msg: 'توقّفتُ: ' + A.tally.pending + ' اسمًا لم تُحسم مطابقته. أكملي القرارات أولًا.' };
    const R = MDQ.remedial, plans = Object.values(R.load().plans), obs = observe(plans);
    snapshot(A, target, label);
    const failedIds = [...new Set(plans.filter(p => p.status === 'approved' && p.afterPass === false && !blocked(p.studentId, p.qid)).map(p => p.studentId))];
    let made = 0, kept = 0, deferred = 0;
    if (failedIds.length) { const r = R.send(A, '', failedIds); if (r.ok) { made = r.made; kept = r.kept; deferred = r.deferred; } }
    const refNow = Object.values(load().episodes).filter(e => e.status === 'referred').length;
    log('دورة متابعة', 'قُرئت ' + obs.updated + ' نتيجة · مسودات جديدة ' + made + ' · محالة ' + refNow);
    return { ok: true, obs, made, kept, deferred, referred: refNow, msg: 'قرأتُ ' + obs.updated + ' نتيجة جديدة (تحققت ' + obs.mastered + '، لم تتحقق ' + obs.failed + ')، وأنشأتُ ' + made + ' مسودة خطة بأساليب جديدة' + (refNow ? '، و' + refNow + ' حالات أُحيلت إليكِ بعد ' + maxCycles() + ' دورات' : '') + '. كلها مسودات تنتظر اعتمادكِ.' };
  }

  /* ---------- العرض ---------- */
  function html(esc, T0) {
    const d = load(), eps = Object.values(d.episodes).sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar') || a.qid.localeCompare(b.qid));
    const kinds = [['concept', 'مفاهيمي'], ['procedure', 'إجرائي']];
    const st = kinds.map(([k, lb]) => STRATS.map(s => { const z = d.strat[k][s.id]; return z ? `<tr><td>${lb}</td><td>${esc(s.label)}</td><td class="num">${z.t}</td><td class="num">${z.s}</td><td class="num">${Math.round(z.s / z.t * 100)}٪</td></tr>` : ''; }).join('')).join('');
    const prop = proposeGoals();
    const stLabel = { open: ['مفتوحة', 'mid'], mastered: ['تحققت', 'ok'], referred: ['أُحيلت إليكِ', 'low'] };
    return `<section class="panel card rm" id="lpTop"><div class="row"><h2 class="grow" style="margin:0">حلقة المتابعة (الدورات)</h2><label class="small-print">أقصى دورات للناتج<input type="number" id="lpMax" min="1" max="5" value="${d.cfg.maxCycles}" class="t-input" style="width:70px"></label><button class="btn gold small" data-rm="loop">شغّلي دورة المتابعة</button><button class="btn ghost small" data-rm="regen" title="تحذف المسودات غير المعدّلة من المحاولة العلاجية الثانية فأكثر وتعيد توليدها بأساليب لم تُجرَّب">أعيدي توليد المسودات المكررة</button></div>
      <p class="small-print muted">الدورة: خطة ← تنفيذ بقراركِ ← قياس ← إن لم تتحقق تُصاغ مسودة بأسلوب جديد بمسوّغ مكتوب، وبعد ${d.cfg.maxCycles} دورات دون تحقق تُحال الحالة إليكِ. لا يعتمد الوكيل شيئًا ولا يرسل شيئًا؛ كل ما ينتجه مسودات.</p>
      ${memOnly ? '<div class="banner bad" style="margin:6px 0"><div>تعذّر الحفظ في المتصفح: الذاكرة لهذه الجلسة فقط.</div></div>' : ''}
      ${eps.length ? `<div class="t-scroll" style="max-height:360px"><table class="t-table"><thead><tr><th>الطالبة</th><th>الناتج</th><th>الدورات (الأسلوب ← النتيجة)</th><th>الحالة</th></tr></thead><tbody>${eps.map(e => `<tr><td>${esc(e.name)}</td><td>${esc((e.outcome || e.qid).slice(0, 50))}</td>
        <td><ol style="margin:0;padding-inline-start:16px">${e.cycles.map(c => `<li>${esc((byId(c.strategy) || {}).label || c.strategy)} ← ${c.result == null ? '<span class="muted">بلا نتيجة</span>' : c.result ? '<span class="pill ok">تحققت</span>' : '<span class="pill low">لم تتحقق</span>'}<br><small class="muted">${esc(c.rationale)}</small></li>`).join('')}</ol></td>
        <td><span class="pill ${stLabel[e.status][1]}">${stLabel[e.status][0]}</span>${e.reason ? '<br><small class="muted">' + esc(e.reason) + '</small>' : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small-print">لا حلقات بعد: تُفتح الحلقة عند إنشاء أول خطة لطالبة في ناتج.</p>'}
      ${st ? `<details><summary class="small-print"><b>ذاكرة الدورات: ما نجح مع كل نوع من النواتج</b></summary><div class="t-scroll"><table class="t-table"><thead><tr><th>نوع الناتج</th><th>الأسلوب</th><th>محاولات</th><th>تحققت</th><th>النسبة</th></tr></thead><tbody>${st}</tbody></table></div>
        <p class="small-print muted">وصفية: أعداد صغيرة، ولا تُعتمد في الاختيار قبل ${MIN_EVID} محاولات للأسلوب. اختيار الطالبات المخفقات يُضخّم نسب النجاح بحكم الارتداد، فلا تُقرأ كفاعلية مقارنة بين الأساليب.</p></details>` : ''}
      ${prop.length ? `<details open><summary class="small-print"><b>أهداف الدورة القادمة المقترحة (من آخر لقطتين)</b></summary><div class="t-scroll" style="max-height:320px"><table class="t-table"><thead><tr><th>الناتج</th><th>البعدي</th><th>السابق</th><th>المقترح</th><th>لماذا</th></tr></thead><tbody>${prop.map(p => `<tr><td>${esc(p.outcome.slice(0, 55))}</td><td class="num">${p.post}٪</td><td class="num">${p.prevPost == null ? '—' : p.prevPost + '٪'}</td><td><span class="pill ${ACT[p.action][1]}">${ACT[p.action][0]}</span></td><td class="small-print">${esc(p.why)}</td></tr>`).join('')}</tbody></table></div></details>` : ''}
    </section>`;
  }

  MDQ.loop = { VERSION, KEY, MIN_EVID, STRATS, byId, available, pick, usedOf, episode, blocked, record, refer, backfill, dropCycle, observe, snapshot, proposeGoals, advance, load, save, reset, wipe, maxCycles, setMaxCycles, html, ACT, stat, score };
})();
