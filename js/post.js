/* ============================================================
   الاختبار البعدي لوكيل الأهداف (للمعلمة فقط)
   - ترفع المعلمة ملف Excel/CSV فيه أسماء الطالبات ونتائج الاختبار البعدي.
   - يطابق الوكيل الأسماء مع طالبات الموقع: المطابق التام يُقبل، وأي تشابه أو اختلاف أو تكرار
     يتوقف عنده الوكيل ويطلب قرارها. لا تُحتسب إلا الطالبات اللاتي أقرّت المعلمة مطابقتهن.
   - بيانات الطالبة في الموقع = خط الأساس (من محاولاتها على السؤال المرتبط بالهدف).
   - الأثر = مقارنة وصفية بين الأساس والبعدي لنفس الطالبات؛ ليس إثباتًا سببيًا (لا مجموعة ضابطة).
   - كل المعالجة داخل المتصفح؛ لا يُرسل شيء لأي خدمة خارجية.
   ============================================================ */
(function () {
  const G = () => MDQ.goals;
  const pctOf = (a, b) => b ? Math.round(a / b * 100) : null;

  /* ---------- قراءة الملف ---------- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const first = (text.split('\n')[0] || ''), sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.match(/\t/g) || []).length > (first.match(/,/g) || []).length ? '\t' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cur); cur = ''; }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else if (c !== '\r') cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }
  async function readXlsx(buf) {
    if (!window.ExcelJS) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js'; s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل قارئ Excel (يلزم اتصال بالإنترنت). نزّلي الملف بصيغة CSV وأعيدي المحاولة.')); document.head.appendChild(s); });
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf);
    const ws = wb.worksheets[0], rows = [];
    ws.eachRow({ includeEmpty: false }, r => {
      const a = [];
      for (let i = 1; i <= ws.columnCount; i++) { let v = r.getCell(i).value; if (v && typeof v === 'object') v = v instanceof Date ? v.toISOString() : (v.text || (v.result != null ? v.result : '') || (v.richText ? v.richText.map(t => t.text).join('') : '')); a.push(v == null ? '' : String(v)); }
      rows.push(a);
    });
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
  }
  async function readFile(file) {
    const n = (file.name || '').toLowerCase();
    if (n.endsWith('.csv')) return parseCSV(await file.text());
    if (n.endsWith('.xlsx')) return readXlsx(await file.arrayBuffer());
    throw new Error('اختاري ملف Excel (.xlsx) أو CSV.');
  }

  /** يحوّل الصفوف إلى {headers, rows, nameCol, valCols}. الصف الأول عناوين. */
  function shape(table) {
    if (!table || table.length < 2) throw new Error('الملف فارغ أو بلا صفوف طالبات.');
    const headers = table[0].map(h => String(h).trim());
    const rows = table.slice(1).map((r, i) => ({ key: 'r' + (i + 2), line: i + 2, cells: headers.map((_, j) => String(r[j] == null ? '' : r[j]).trim()) }));
    let nameCol = headers.findIndex(h => /(اسم|الاسم|name|student)/i.test(h) && !/(رمز|معرف|code|id)/i.test(h));
    if (nameCol < 0) { // أكثر عمود نصي غير رقمي
      let best = -1, bs = 0; headers.forEach((_, j) => { const s = rows.filter(r => r.cells[j] && /[\p{L}]{2,}\s+[\p{L}]{2,}/u.test(r.cells[j])).length; if (s > bs) { bs = s; best = j; } }); nameCol = best;
    }
    const clsCol = headers.findIndex(h => /(فصل|شعبة|class)/i.test(h));
    return { headers, rows, nameCol, clsCol, valCols: headers.map((_, j) => j).filter(j => j !== nameCol && j !== clsCol) };
  }

  /* ---------- مطابقة الأسماء ---------- */
  const DIAC = /[ً-ْـٰ‎‏]/g;
  function normAr(n) {
    return String(n || '').replace(DIAC, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let p = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
    return p[n];
  }
  /** درجة تشابه 0..1: تأخذ الأعلى من تشابه النص كله وتشابه الكلمات (اسم مختصر داخل اسم كامل) */
  function similarity(a, b) {
    a = normAr(a); b = normAr(b); if (!a || !b) return 0; if (a === b) return 1;
    const whole = 1 - lev(a, b) / Math.max(a.length, b.length);
    const ta = a.split(' '), tb = b.split(' '), [s, l] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
    const used = new Set(); let hit = 0;
    s.forEach(w => { let bi = -1, bs = 0; l.forEach((x, i) => { if (used.has(i)) return; const sc = 1 - lev(w, x) / Math.max(w.length, x.length); if (sc > bs) { bs = sc; bi = i; } }); if (bs >= 0.8) { used.add(bi); hit += bs; } });
    const tok = s.length >= 2 ? hit / s.length : 0;      // كلمة واحدة لا تكفي دليلًا
    const startsOk = s.length >= 2 && ta[0] && tb[0] && lev(ta[0], tb[0]) <= 1; // الاسم الأول متطابق تقريبًا
    return Math.max(whole, startsOk ? tok * 0.95 : tok * 0.8);
  }
  const SIM_MIN = 0.72;

  /** يبني جدول المطابقة. decisions: {rowKey: studentId | 'x'}  — 'x' = استبعاد */
  function match(rows, nameCol, students, decisions) {
    decisions = decisions || {};
    const byNorm = new Map();
    students.forEach(s => { const k = normAr(s.name); if (k) { if (!byNorm.has(k)) byNorm.set(k, []); byNorm.get(k).push(s); } });
    const claimed = new Map(); // studentId -> عدد الصفوف المطابقة (لكشف صفين لطالبة واحدة)
    const out = rows.map(r => {
      const name = r.cells[nameCol] || '', k = normAr(name);
      let status, cands = [], auto = null;
      if (!k) { status = 'empty'; }
      else if (byNorm.has(k)) {
        const arr = byNorm.get(k);
        if (arr.length === 1) { status = 'exact'; auto = arr[0]; cands = [{ s: arr[0], score: 1 }]; }
        else { status = 'dupe'; cands = arr.map(s => ({ s, score: 1 })); }
      } else {
        cands = students.map(s => ({ s, score: similarity(name, s.name) })).filter(c => c.score >= SIM_MIN).sort((a, b) => b.score - a.score).slice(0, 4);
        status = cands.length ? 'similar' : 'none';
      }
      const d = decisions[r.key];
      let final = null, decided = false;
      if (d === 'x') decided = true;
      else if (d) { const s = students.find(x => x.studentId === d); if (s) { final = s; decided = true; } }
      else if (status === 'exact') { final = auto; decided = true; }
      const needs = !decided && status !== 'empty';
      return { row: r, name, status, cands, final, decided, needs, byTeacher: !!d && d !== 'x' && !(status === 'exact' && auto && d === auto.studentId) };
    });
    out.forEach(m => { if (m.final) claimed.set(m.final.studentId, (claimed.get(m.final.studentId) || 0) + 1); });
    out.forEach(m => { m.multi = !!(m.final && claimed.get(m.final.studentId) > 1); if (m.multi) m.needs = true; });
    return out;
  }

  /* ---------- تصحيح قيمة الخلية ---------- */
  const LET = { 'أ': 0, 'ا': 0, 'a': 0, 'ب': 1, 'b': 1, 'ج': 2, 'c': 2, 'د': 3, 'd': 3 };
  const YES = /^(true|1|1\.0|صح|صحيح|صحيحة|✓|✔|نعم|yes|y|اجابة صحيحة)$/i, NO = /^(false|0|0\.0|خطا|خطأ|خاطئة|خاطئ|✗|✘|x|لا|no|n)$/i;
  function parseChoice(v, def) {
    const raw = String(v || '').trim(); if (!raw) return null;
    const lead = raw.replace(/[\s.\-)\(:]/g, '').toLowerCase();
    if (lead.length === 1 && LET[lead] != null && def.options[LET[lead]]) return def.options[LET[lead]].k;
    const t = normAr(raw), o = def.options.find(o => normAr(o.text) === t) || def.options.find(o => t.length > 6 && (normAr(o.text).includes(t) || t.includes(normAr(o.text))));
    return o ? o.k : undefined;
  }
  /** يقرر الوضع تلقائيًا: choice إن طابقت معظم القيم خيارات السؤال، وإلا score */
  function detectMode(vals, def) {
    const v = vals.filter(x => x !== ''); if (!v.length) return 'score';
    const ch = v.filter(x => parseChoice(x, def)).length;
    return ch / v.length >= 0.6 && !v.every(x => YES.test(x) || NO.test(x) || !isNaN(+x)) ? 'choice' : 'score';
  }
  /** يعيد true/false/null (null = لا إجابة/غير مفهومة) */
  function grade(v, def, opt) {
    const raw = String(v == null ? '' : v).trim(); if (!raw) return null;
    if (opt.mode === 'choice') { const k = parseChoice(raw, def); return k == null || k === undefined ? null : k === def.answer; }
    if (YES.test(raw)) return true; if (NO.test(raw)) return false;
    const x = parseFloat(raw.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace('٫', '.').replace('%', ''));
    if (isNaN(x)) return null;
    const max = +opt.max || 1; return x / max >= (+opt.pass || 100) / 100 - 1e-9;
  }

  /* ---------- الأثر ---------- */
  /** تصنيف نتيجة الطالبة في الموقع (خط الأساس) حسب مقياس الهدف */
  function baselineOf(student, goal) {
    const q = student.q && student.q.get(goal.qid);
    if (!q || !q.attempts.length) return null;
    const at = q.attempts.slice().sort((a, b) => String(a.clientTime).localeCompare(String(b.clientTime)));
    const i = at.findIndex(a => a.isCorrect === true || a.isCorrect === 1 || String(a.isCorrect).toLowerCase() === 'true');
    const tries = i < 0 ? Infinity : i + 1, k = goal.metric === 'first' ? 1 : 3;
    return { pass: tries <= k, tries, attempts: at.length };
  }

  /**
   * يحسب الأثر للطالبات المقرَّة مطابقتهن فقط.
   * الأثر العائد (٪) = ما أُغلق من الفجوة المستهدفة = (البعدي − الأساس) ÷ (المستهدف − الأساس) × 100
   * (إن كان الأساس ≥ المستهدف لا تُعرَّف النسبة). المكسب المُطبَّع (Hake) = (البعدي − الأساس) ÷ (100 − الأساس).
   */
  function impact(goal, post, model) {
    const students = G().scope(model, goal.cls, goal.answers).students;
    const ms = match(post.rows, post.nameCol, students, post.decisions);
    const accepted = ms.filter(m => m.final && !m.needs);
    const def = MDQ.bank.question(goal.qid);
    const opt = { mode: post.mode, max: post.max, pass: post.pass };
    const per = [], seen = new Set();
    accepted.forEach(m => {
      if (seen.has(m.final.studentId)) return; seen.add(m.final.studentId);
      const b = baselineOf(m.final, goal), a = grade(m.row.cells[post.valCol], def, opt);
      per.push({ s: m.final, name: m.final.name, raw: m.row.cells[post.valCol], base: b, post: a });
    });
    const paired = per.filter(p => p.base && p.post != null);
    const n = paired.length, bp = paired.filter(p => p.base.pass).length, pp = paired.filter(p => p.post).length;
    const base = pctOf(bp, n), after = pctOf(pp, n);
    const gain = n ? after - base : null;
    const up = paired.filter(p => !p.base.pass && p.post).length, down = paired.filter(p => p.base.pass && !p.post).length;
    const stayLow = paired.filter(p => !p.base.pass && !p.post);
    let roi = null;
    if (n && base < goal.target) roi = Math.round((after - base) / (goal.target - base) * 100);
    const hake = n && base < 100 ? Math.round((after - base) / (100 - base) * 100) : null;
    const tally = {
      rows: ms.length, exact: ms.filter(m => m.status === 'exact' && m.decided && !m.byTeacher).length, byTeacher: accepted.filter(m => m.byTeacher).length,
      excluded: ms.filter(m => m.decided && !m.final).length, pending: ms.filter(m => m.needs).length, empty: ms.filter(m => m.status === 'empty').length
    };
    const noBase = per.filter(p => !p.base).length, noPost = per.filter(p => p.base && p.post == null).length;
    let status;
    if (tally.pending) status = 'بانتظار قرارك في مطابقة الأسماء';
    else if (n < 8) status = 'عدد الطالبات المقارَنات قليل (أقل من 8)';
    else if (after >= goal.target) status = 'تحقق الهدف في الاختبار البعدي';
    else if (gain >= 5) status = 'تحسّن دون بلوغ المستهدف';
    else status = 'لم يتحسن بعديًا';
    return { ms, per, paired, n, base, after, gain, up, down, stayLow, roi, hake, tally, noBase, noPost, status, target: goal.target };
  }

  /* ---------- الحفظ في الهدف + السجل ---------- */
  function attach(goal, meta) {
    goal.post = Object.assign({ decisions: {} }, meta, { at: new Date().toISOString() });
    G().update(goal);
    G().logEvent(goal.id, 'رُفع اختبار بعدي', `${meta.file} · ${meta.rows.length} صفًا · العمود «${meta.valName}» · الوضع: ${meta.mode === 'choice' ? 'اختيار يُصحَّح بمفتاح السؤال' : 'درجة/صح-خطأ (نجاح عند ' + meta.pass + '٪ من ' + meta.max + ')'}`);
  }
  function decide(goal, rowKey, studentId, label) {
    goal.post.decisions[rowKey] = studentId; G().update(goal);
    G().logEvent(goal.id, studentId === 'x' ? 'استبعدت المعلمة صفًا' : 'أقرّت المعلمة مطابقة', label || rowKey);
  }
  function clear(goal) { delete goal.post; G().update(goal); G().logEvent(goal.id, 'حُذف الاختبار البعدي', ''); }
  /** يسجّل النتيجة النهائية بعد اكتمال القرارات */
  function record(goal, model) {
    const r = impact(goal, goal.post, model);
    G().logEvent(goal.id, 'قياس الأثر', `ن=${r.n} · الأساس ${r.base}٪ ← البعدي ${r.after}٪ (${r.gain >= 0 ? '+' : ''}${r.gain}) · الأثر العائد ${r.roi == null ? '—' : r.roi + '٪'} · ${r.status}`);
    return r;
  }

  MDQ.post = { readFile, shape, normAr, similarity, match, grade, detectMode, parseChoice, baselineOf, impact, attach, decide, clear, record, SIM_MIN };
})();
