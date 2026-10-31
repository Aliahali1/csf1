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
        let arr = byNorm.get(k);
        if (arr.length > 1 && r.cls) { const c = G().normCls(r.cls), f = arr.filter(x => G().normCls(x.className) === c); if (f.length === 1) arr = f; }
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


  /** توصيات قاعدية من نتائج القياس (للمعلمة؛ لا تُنفَّذ تلقائيًا) */
  function recommend(goal, r) {
    if (r.tally.pending) return ['أكملي قرارات مطابقة الأسماء أولًا.'];
    if (r.n < 8) return ['عدد المقارَنات قليل؛ لا تعتمدي النتيجة قبل استكمال مطابقة المزيد من الطالبات.'];
    const out = [], low = r.stayLow.length;
    if (r.after >= goal.target) out.push(`تحقق المستهدف (${r.after}٪ من ${goal.target}٪): ثبّتي ما نفّذتِه ووثّقيه، وانتقلي لناتج آخر.`);
    else if (r.gain >= 5) out.push(`تحسّن بمقدار ${r.gain} نقطة وبقيت فجوة ${goal.target - r.after} نقطة: كرّري الخطوة نفسها على من لم تتحقق ثم أعيدي القياس.`);
    else out.push('لم يظهر تحسّن كافٍ: غيّري أسلوب المعالجة (جرّبي سببًا آخر من أسباب «وكيل الأهداف») بدل تكرار الخطوة نفسها.');
    if (low) out.push(`${low} طالبة لم تتحققن في الموقع ولا في البعدي في هذا الناتج: يُقترح دعمهن فرديًا أو في مجموعة صغيرة، وهذا وصف لهذا الناتج فقط لا حكمٌ عامٌّ عليهن.`);
    if (r.down) out.push(`${r.down} طالبة تراجعت بعد تحققها سابقًا: راجعي ثبات التعلم (قد تكون صدفة في الموقع أو ضعف مراجعة).`);
    if (r.noBase) out.push(`${r.noBase} طالبة بلا محاولات في الموقع على هذا السؤال: لا أساس لمقارنتها؛ اجعليهن يحللن السؤال في الموقع لتُقاس بدقة لاحقًا.`);
    if (r.noPost) out.push(`${r.noPost} طالبة بلا درجة مفهومة في الملف: تحققي من خلاياهن.`);
    out.push('تذكير: المقارنة وصفية ولا تثبت أن التدخل وحده هو السبب.');
    return out;
  }
  /** صف الجدول: الهدف - الأساس - المتحقق - المستهدف - الأثر - التوصيات */
  function row(goal, model) {
    if (!goal.post) return null;
    const r = impact(goal, goal.post, model);
    if (r.tally.pending || !r.n) return { goal: goal.outcome, base: '—', after: '—', target: goal.target + '٪', impact: r.tally.pending ? 'بانتظار قرارك في المطابقة' : '—', recs: recommend(goal, r), r };
    return { goal: goal.outcome, base: r.base + '٪', after: r.after + '٪', target: goal.target + '٪',
      impact: `${r.gain >= 0 ? '+' : ''}${r.gain} نقطة · نسبة الأثر ${r.roi == null ? 'لا تُحسب (الأساس ≥ المستهدف)' : r.roi + '٪'}`, recs: recommend(goal, r), r };
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
  /** قرار جماعي: entries = [{key, val}] — يُسجَّل في سطر واحد */
  function decideMany(goal, entries, label) {
    entries.forEach(e => { goal.post.decisions[e.key] = e.val; }); G().update(goal);
    G().logEvent(goal.id, label, entries.length + ' صفًا');
  }
  function clear(goal) { delete goal.post; G().update(goal); G().logEvent(goal.id, 'حُذف الاختبار البعدي', ''); }
  /** يسجّل النتيجة النهائية بعد اكتمال القرارات */
  function record(goal, model) {
    const r = impact(goal, goal.post, model);
    G().logEvent(goal.id, 'قياس الأثر', `ن=${r.n} · الأساس ${r.base}٪ ← البعدي ${r.after}٪ (${r.gain >= 0 ? '+' : ''}${r.gain}) · الأثر العائد ${r.roi == null ? '—' : r.roi + '٪'} · ${r.status}`);
    return r;
  }


  /* ============================================================
     التحليل الآلي لملف الاختبار البعدي (نموذج Google Forms المُصدَّر)
     الهيكل: قراءة ← مطابقة أعمدة الأسئلة ببنك الموقع ← مطابقة الأسماء (بموافقة المعلمة)
            ← الأساس (محاولة أولى في الموقع) ← المتحقق (نقطة السؤال) ← الأثر ← التوصيات
     تُحلَّل فقط النواتج التي لها سؤال في الاختبار البعدي؛ ما عداها خارج التحليل.
     ============================================================ */
  /* الأسئلة الـ24 في نموذج الاختبار البعدي (تُستبدل بما في الملف المرفوع إن وُجد) */
  const POST_QIDS = ['db-01', 'db-03', 'db-04', 'db-05', 'db-06', 'db-07', 'db-08', 'qr-01', 'qr-02', 'qr-03', 'qr-04', 'qr-06', 'qr-07', 'qr-08', 'dv-01', 'dv-02', 'dv-05', 'dv-06', 'cy-01', 'cy-05', 'cy-06', 'cy-07', 'cy-08', 'dv-04'];
  const postQids = () => { const st = getSet(); return st && st.items && st.items.length ? st.items.map(i => i.qid) : POST_QIDS; };
  const SK = 'mdq.agent.postset.v1', CEIL = 85;
  const getSet = () => { try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch (e) { return null; } };
  const putSet = v => { try { localStorage.setItem(SK, JSON.stringify(v)); } catch (e) {} };
  const textSim = (a, b) => { a = normAr(a); b = normAr(b); if (!a || !b) return 0; return a === b ? 1 : 1 - lev(a, b) / Math.max(a.length, b.length); };

  function ingest(table, file) {
    if (!table || table.length < 2) throw new Error('الملف فارغ.');
    const H = table[0].map(h => String(h == null ? '' : h).replace(/ /g, ' ').trim());
    const nameCol = H.findIndex(h => /اسم/.test(h)), clsCol = H.findIndex(h => /(الفصل|الشعبة)/.test(h));
    if (nameCol < 0) throw new Error('لم أجد عمود «اسم الطالبة» في الملف.');
    const isPts = h => /^النقاط\s*-/.test(h), isNote = h => /^الملاحظات\s*-/.test(h);
    const ptsQ = {}; H.forEach((h, i) => { if (isPts(h)) { const k = normAr(h.replace(/^النقاط\s*-\s*/, '')); (ptsQ[k] = ptsQ[k] || []).push(i); } });
    const used = {}, items = [], unmapped = [], noPts = [], dups = [], bank = MDQ.bank.QUESTIONS, seenQ = new Set();
    H.forEach((h, i) => {
      if (!h || i === nameCol || i === clsCol || isPts(h) || isNote(h) || /^إجمالي/.test(h)) return;
      const k = normAr(h), q = (used[k] = (used[k] || 0) + 1) - 1, pc = (ptsQ[k] || [])[q];
      let best = null, bs = 0, via = 'original';
      bank.forEach(b => { const sc = textSim(h, b.text); if (sc > bs) { bs = sc; best = b; via = 'original'; } });
      const PW = MDQ.postWording || {};   // الصياغة المعادة في الاختبار البعدي
      Object.keys(PW).forEach(qid => PW[qid].forEach(w => { const sc = textSim(h, w); if (sc > bs) { bs = sc; best = bank.find(b => b.id === qid) || best; via = 'reworded'; } }));
      if (pc == null) { if (best && bs >= 0.85) noPts.push(best.id); return; }   // سؤال في الملف بلا عمود نقاط: لا يمكن تصحيحه
      if (!best || bs < 0.85) { unmapped.push(h.slice(0, 60)); return; }
      if (seenQ.has(best.id)) { dups.push(best.id); return; }  // سؤال مكرر في النموذج: يُعتمد الأول فقط
      seenQ.add(best.id); items.push({ qid: best.id, header: h.slice(0, 80), ptsCol: pc, score: Math.round(bs * 100), via });
    });
    if (!items.length) throw new Error('لم أطابق أي سؤال في الملف مع أسئلة الموقع. تأكدي أنه ملف نتائج النموذج المُصدَّر.');
    const max = {}; items.forEach(it => { max[it.qid] = Math.max(1, ...table.slice(1).map(r => parseFloat(String(r[it.ptsCol] || '0').replace('٫', '.')) || 0)); });
    const rows = table.slice(1).map((r, i) => {
      const pts = {}; items.forEach(it => { const raw = String(r[it.ptsCol] == null ? '' : r[it.ptsCol]).trim(); const v = parseFloat(raw.replace('٫', '.')); pts[it.qid] = raw === '' || isNaN(v) ? null : (v >= max[it.qid] ? 1 : 0); });
      return { key: 'r' + (i + 2), name: String(r[nameCol] == null ? '' : r[nameCol]).replace(/ /g, ' ').trim(), cls: clsCol >= 0 ? String(r[clsCol] || '').trim() : '', pts };
    });
    const set = { file, at: new Date().toISOString(), target: 80, decisions: {}, items, rows, unmapped, dups, noPts, wordingVersion: MDQ.postWordingVersion || '', wordingHash: MDQ.std ? MDQ.std.wordingHash() : '' };
    putSet(set); G().logEvent('post', 'رُفع ملف الاختبار البعدي', `${file} · ${rows.length} صفًا · ${items.length} ناتجًا مطابقًا (${items.filter(i => i.via === 'reworded').length} بالصياغة المعادة)` + (dups.length ? ` · سؤال مكرر تجاهلتُ تكراره (${dups.join('، ')})` : ''));
    return set;
  }

  function hasMcNemar(up, down) { // اختبار ثنائي الحدين الدقيق (ماكنمار) ثنائي الطرف
    const n = up + down; if (!n) return 1; const k = Math.min(up, down);
    const lc = x => { let r = 0; for (let i = 2; i <= x; i++) r += Math.log(i); return r; };
    let p = 0; for (let i = 0; i <= k; i++) p += Math.exp(lc(n) - lc(i) - lc(n - i) - n * Math.log(2));
    return Math.min(1, 2 * p);
  }

  function analyze(set, model, goals) {
    const students = model.students, rows = set.rows.map(r => ({ key: r.key, cells: [r.name], cls: r.cls, src: r }));
    const ms = match(rows, 0, students, set.decisions);
    const tally = { rows: ms.length, empty: ms.filter(m => m.status === 'empty').length, exact: ms.filter(m => m.status === 'exact' && m.decided && !m.byTeacher).length,
      byTeacher: ms.filter(m => m.final && !m.needs && m.byTeacher).length, excluded: ms.filter(m => m.decided && !m.final && m.status !== 'empty').length, pending: ms.filter(m => m.needs).length };
    const accepted = [], seen = new Set();
    ms.forEach(m => { if (m.final && !m.needs && !seen.has(m.final.studentId)) { seen.add(m.final.studentId); accepted.push(m); } });
    const out = [];
    set.items.forEach(it => {
      const orow = MDQ.outcomes.ROWS.find(r => r.qid === it.qid); if (!orow) return;
      const g = (goals || []).find(x => x.qid === it.qid), goal = { qid: it.qid, metric: g ? g.metric : 'first' }, target = g ? g.target : set.target;
      const per = [];
      accepted.forEach(m => { const b = baselineOf(m.final, goal), a = m.row.src.pts[it.qid]; if (b && a != null) per.push({ s: m.final, name: m.final.name, base: b.pass, post: a === 1, tries: b.tries }); });
      const n = per.length, bp = per.filter(x => x.base).length, pp = per.filter(x => x.post).length;
      const base = pctOf(bp, n), after = pctOf(pp, n), up = per.filter(x => !x.base && x.post).length, down = per.filter(x => x.base && !x.post).length;
      const gain = n ? after - base : null, ceil = n && base >= CEIL;
      const roi = n && base < target ? Math.round((after - base) / (target - base) * 100) : null, hake = n && base < 100 ? Math.round((after - base) / (100 - base) * 100) : null;
      const fail = per.filter(x => !x.post);
      const r = { qid: it.qid, lesson: orow.lesson, outcome: orow.outcome, targeted: !!g, n, base, after, target, gain, roi, hake, up, down, ceil, p: n ? hasMcNemar(up, down) : null, fail, stay: per.filter(x => !x.base && !x.post), per };
      const S = MDQ.std; r.via = it.via || 'original'; r.reworded = r.via === 'reworded'; r.equiv = S ? (S.getEquiv(it.qid) || {}).level || null : null; r.counted = S ? S.counted(it.qid, r.via) : true;
      r.status = !n ? 'لا بيانات مقارَنة' : n < 8 ? 'عدد قليل' : ceil ? 'سقف: متحقق أصلًا' : after >= target ? 'تحقق الهدف' : gain >= 5 ? 'تحسّن' : 'لم يتحسن';
      r.recs = recsFor(r);
      out.push(r);
    });
    const order = { db: 0, query: 1, device: 2, cyber: 3 };
    out.sort((a, b) => (order[a.lesson] - order[b.lesson]) || a.qid.localeCompare(b.qid));
    // مجموعة ضابطة داخلية: تحسّن نواتج التدخل (لها هدف) مقابل غيرها لنفس الطالبات (دون السقف)
    const ok = out.filter(x => x.n >= 8 && !x.ceil && x.counted), t = ok.filter(x => x.targeted), c = ok.filter(x => !x.targeted);
    const mean = a => a.reduce((s, x) => s + x.gain, 0) / a.length;
    const did = t.length && c.length >= 3 ? { t: Math.round(mean(t)), c: Math.round(mean(c)), diff: Math.round(mean(t) - mean(c)), nt: t.length, nc: c.length } : null;
    const cls = MDQ.std ? MDQ.std.byClass(model, [].concat(...out.filter(x => x.counted && x.n >= 8 && !x.ceil).map(x => x.per))) : [];
    return { ms, tally, rows: out, did, accepted: accepted.length, byClass: cls, notCounted: out.filter(x => !x.counted).length };
  }
  function recsFor(r) {
    if (!r.n) return ['لا طالبات مقارَنات لهذا الناتج (لا أساس في الموقع أو لا درجة).'];
    if (r.reworded && !r.counted) return ['صياغة السؤال في البعدي معادة ولم تُراجَع/تُعتمد: قرّري تكافؤ الصياغتين أولًا؛ لا يُحتسب هذا الناتج في الخلاصة قبل ذلك.'];
    if (r.ceil) return ['متحقق قبليًا (≥' + CEIL + '٪): لا يُحكم عليه بأثر؛ يكفي الحفاظ عليه ولا يحتاج تدخلًا.'];
    const o = [];
    if (r.reworded) o.push('تنبيه: الأساس بصياغة الموقع والبعدي بصياغة معادة' + (r.equiv === 'minor' ? ' (تختلف قليلًا)' : '') + '؛ قد يعكس الفرق جزئيًا اختلاف الصياغة لا التعلّم.');
    if (r.n < 8) o.push('عدد المقارَنات قليل؛ لا تعتمدي النتيجة.');
    if (r.after >= r.target) o.push('بلغ المستهدف: ثبّتي الأسلوب ووثّقيه.');
    else if (r.gain >= 5) o.push(`تحسّن ${r.gain} نقطة وبقيت فجوة ${r.target - r.after}: كرّري التدخل على غير المتحققات.`);
    else o.push('لا تحسن كافٍ: غيّري أسلوب المعالجة (سبب آخر من وكيل الأهداف) بدل التكرار.');
    if (r.fail.length) o.push(`${r.fail.length} طالبة تحتاج دعمًا في هذا الناتج (اقتراح قابل للمراجعة): دعم فردي أو مجموعة صغيرة.`);
    if (r.down) o.push(`${r.down} تراجعت: راجعي ثبات التعلم.`);
    if (r.n >= 8 && r.p != null && r.p > 0.05 && r.gain >= 5) o.push('الفرق غير دالّ إحصائيًا (قد يكون صدفة).');
    return o;
  }
  const setDecide = (entries, label) => { const s = getSet(); entries.forEach(e => { s.decisions[e.key] = e.val; }); putSet(s); G().logEvent('post', label, entries.length + ' صفًا'); };
  const setTarget = t => { const s = getSet(); s.target = t; putSet(s); };
  const setClear = () => { try { localStorage.removeItem(SK); } catch (e) {} G().logEvent('post', 'حُذف ملف الاختبار البعدي', ''); };

  MDQ.post = { postQids, POST_QIDS, ingest, analyze, getSet, putSet, setDecide, setTarget, setClear, CEIL, readFile, shape, normAr, similarity, match, grade, detectMode, parseChoice, baselineOf, impact, recommend, row, attach, decide, decideMany, clear, record, SIM_MIN };
})();
