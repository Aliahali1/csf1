/* ============================================================
   تحليل المشتتات (المرحلة 1 — للمعلمة فقط)
   السؤال: أي خيار خاطئ اختارته الطالبات في اللعبة لكل ناتج؟ الخيار الخاطئ المتكرر يدل على تصوّر خاطئ شائع.
   - المصدر الوحيد: محاولات الطالبات المسجَّلة في الموقع (الخيار المختار ونصه) ومفتاح الإجابة وخيارات السؤال كما هي.
   - لا يخترع تفسيرًا للتصوّر الخاطئ: يعرض نص الخيار المختار ونسبته فقط، ويترك التفسير للمعلمة وللكتاب.
   - لا يعدّل الأسئلة ولا بيانات الطالبات. يُحسب داخل المتصفح.
   ============================================================ */
(function () {
  window.MDQ = window.MDQ || {};
  const VERSION = '1.0.0', MIN_WRONG = 3;
  const isOk = a => a.isCorrect === true || a.isCorrect === 1 || String(a.isCorrect).toLowerCase() === 'true' || a.ok === true;
  const keyOf = a => a.choice != null && a.choice !== '' ? String(a.choice) : (a.c != null ? String(a.c) : null);
  const attemptsOf = (s, qid) => { const q = s && s.q && s.q.get && s.q.get(qid); return q && q.attempts ? q.attempts : []; };
  const optText = (def, k) => { const o = def && def.options ? def.options.find(x => x.k === k) : null; return o ? o.text : null; };

  /** يعيد الخيارات الخاطئة المختارة لدى طالبة (أول إخفاق لكل خيار) */
  function wrongOf(s, qid) {
    const out = []; attemptsOf(s, qid).slice().sort((a, b) => String(a.clientTime || a.at || '').localeCompare(String(b.clientTime || b.at || ''))).forEach(a => {
      if (isOk(a)) return; const k = keyOf(a); if (k != null && !out.includes(k)) out.push(k); });
    return out;
  }

  /**
   * تحليل ناتج: students = قائمة الطالبات (model.students)، def = تعريف السؤال {options, answer}
   * فئة الطالبات المحلَّلة: كل من أخطأت مرة على الأقل في هذا السؤال.
   */
  function analyze(students, qid, def) {
    const by = {}; let wrongStu = 0, tested = 0;
    (students || []).forEach(s => {
      const at = attemptsOf(s, qid); if (!at.length) return; tested++;
      const w = wrongOf(s, qid); if (!w.length) return; wrongStu++;
      w.forEach(k => { const e = by[k] = by[k] || { key: k, students: new Set() }; e.students.add(s.studentId); });
    });
    const list = Object.values(by).map(e => ({ key: e.key, text: optText(def, e.key) || null, n: e.students.size, share: wrongStu ? Math.round(e.students.size / wrongStu * 100) : null, ids: [...e.students] }))
      .sort((a, b) => b.n - a.n || String(a.key).localeCompare(String(b.key)));
    const top = list[0] || null;
    return { qid, tested, wrongStu, list, top, reliable: wrongStu >= MIN_WRONG, dominant: !!(top && list.length > 1 && top.n >= 2 * list[1].n) || !!(top && list.length === 1),
      note: wrongStu < MIN_WRONG ? `أقل من ${MIN_WRONG} طالبات أخطأن (${wrongStu})؛ لا يُعتدّ بنمط الخيارات.` : '' };
  }

  /** خيار طالبة محددة + نمط الصف، لاستخدامه في الخطة العلاجية */
  function forStudent(students, s, qid, def) {
    const A = analyze(students, qid, def), mine = wrongOf(s, qid), first = mine.length ? mine[0] : null;
    return { class: A, mine: first, mineText: first ? optText(def, first) : null, mineShare: first ? (A.list.find(x => x.key === first) || {}).share : null, usable: !!first };
  }

  /** لوحة عرض: لكل ناتج الخيارات الخاطئة الأكثر اختيارًا. qids = معرّفات الأسئلة المراد عرضها */
  function html(students, qids, esc) {
    const rows = (qids || []).map(q => { let def = null; try { def = MDQ.bank && MDQ.bank.question(q); } catch (e) {} return def ? analyze(students, q, def) : null; }).filter(a => a && a.wrongStu);
    if (!rows.length) return '';
    const lbl = k => (MDQ.bank && MDQ.bank.LETTERS && MDQ.bank.LETTERS[k]) || k;
    return `<details id="dsTop" style="margin:10px 0"><summary class="small-print"><b>تحليل المشتتات: أي خيار خاطئ اختارته الطالبات في اللعبة؟</b></summary>
      <p class="small-print muted">النسبة من الطالبات اللواتي أخطأن مرة على الأقل في السؤال. الخيار المتكرر قرينة على تصوّر خاطئ شائع؛ تفسيره وعلاجه لكِ وللكتاب. أقل من ${MIN_WRONG} طالبات = لا يُعتدّ بالنمط.</p>
      <div class="t-scroll" style="max-height:320px"><table class="t-table"><thead><tr><th>الناتج</th><th>أخطأن</th><th>الخيارات الخاطئة (الأكثر اختيارًا أولًا)</th></tr></thead><tbody>${rows.map(a => { const r = (MDQ.outcomes && MDQ.outcomes.ROWS || []).find(x => x.qid === a.qid);
        return `<tr><td>${esc(r ? r.outcome.slice(0, 55) : a.qid)}</td><td class="num">${a.wrongStu} من ${a.tested}</td><td>${a.reliable ? '<ul style="margin:0;padding-inline-start:16px">' + a.list.slice(0, 3).map(o => `<li>(${esc(lbl(o.key))}) ${esc((o.text || '').slice(0, 70))} — <b class="num">${o.share}٪</b> (${o.n})</li>`).join('') + '</ul>' : '<span class="muted">' + esc(a.note) + '</span>'}</td></tr>`; }).join('')}</tbody></table></div></details>`;
  }

  MDQ.distractors = { html, VERSION, MIN_WRONG, analyze, wrongOf, forStudent, optText };
})();
