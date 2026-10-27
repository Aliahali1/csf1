/* ============================================================
   التصدير إلى Excel (.xlsx حقيقي متعدد الأوراق) — من البيانات المركزية
   الأنواع: all | student | lesson | weakness | class
   ============================================================ */
(function () {
  const C = { head: 'FF6B4EF0', gold: 'FFFFC93C', low: 'FFFFD9E1', mid: 'FFFFF0C7', ok: 'FFD8F5E8', zebra: 'FFFDF6FA' };
  const FONT = 'Times New Roman';
  const LIB = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
  const B = () => MDQ.bank, A = () => MDQ.analytics, T = () => MDQ.time;
  const W = d => d ? T().riyadhWallDate(d) : '';
  const dash = v => (v == null || v === '') ? '' : v;

  function ensureLib() {
    if (window.ExcelJS) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = LIB; s.async = true;
      s.onload = () => window.ExcelJS ? res() : rej(new Error('مكتبة Excel لم تُحمَّل.'));
      s.onerror = () => rej(new Error('تعذر تحميل مكتبة Excel. تحققي من الاتصال بالإنترنت ثم أعيدي المحاولة.'));
      document.head.appendChild(s);
    });
  }

  /** ورقة عامة: cols = [{h, w, t:'text'|'date'|'pct'|'num'|'bool'}] */
  function addSheet(wb, name, cols, rows) {
    const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    ws.addRow(cols.map(c => c.h));
    rows.forEach(r => ws.addRow(r.map((v, i) => cols[i].t === 'date' ? (v ? W(v) : '') : (v == null ? '' : v))));
    ws.columns.forEach((c, i) => { c.width = cols[i].w || 16; });
    const h = ws.getRow(1); h.height = 32;
    h.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: FONT, size: 12 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.head } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true, readingOrder: 'rtl' };
      cell.border = { bottom: { style: 'medium', color: { argb: C.gold } } };
    });
    ws.eachRow((row, n) => {
      if (n === 1) return;
      row.eachCell({ includeEmpty: true }, (cell, ci) => {
        const t = cols[ci - 1] && cols[ci - 1].t;
        cell.font = { name: FONT, size: 11 };
        cell.alignment = { vertical: 'middle', horizontal: t && t !== 'text' ? 'center' : 'right', readingOrder: 'rtl', wrapText: true };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFEED3E3' } } };
        if (n % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } };
        if (t === 'date' && cell.value) cell.numFmt = 'yyyy-mm-dd hh:mm';
        if (t === 'pct' && cell.value !== '' && cell.value != null) {
          cell.numFmt = '0"%"';
          const v = +cell.value;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: v < 50 ? C.low : v < 80 ? C.mid : C.ok } };
          if (v < 50) cell.font = { name: FONT, size: 11, bold: true, color: { argb: 'FFA3243F' } };
        }
        if (t === 'bool') cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cell.value === 'صحيحة' ? C.ok : C.low } };
        if (t === 'flag' && String(cell.value).startsWith('تحتاج')) cell.font = { name: FONT, size: 11, bold: true, color: { argb: 'FFA3243F' } };
      });
    });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    return ws;
  }
  function guide(wb, lines) {
    const ws = wb.addWorksheet('دليل القراءة', { views: [{ rightToLeft: true }] });
    lines.forEach(l => ws.addRow([l]));
    ws.getColumn(1).width = 115;
    ws.getRow(1).font = { bold: true, size: 15, color: { argb: C.head }, name: FONT };
    ws.eachRow((r, n) => r.eachCell(c => { c.alignment = { horizontal: 'right', readingOrder: 'rtl', wrapText: true }; if (n > 1) c.font = { name: FONT, size: 12 }; }));
  }

  /* ---------- تعريفات الأعمدة ---------- */
  const L = () => B().LESSONS;
  function summaryCols() {
    const c = [{ h: 'اسم الطالبة', w: 22 }, { h: 'الفصل', w: 10 }, { h: 'رمز الطالبة', w: 11 }, { h: 'معرف الطالبة', w: 26 },
      { h: 'أول دخول', w: 18, t: 'date' }, { h: 'آخر دخول', w: 18, t: 'date' }, { h: 'آخر نشاط', w: 18, t: 'date' }, { h: 'عدد الجلسات', w: 9, t: 'num' }];
    L().forEach(l => { c.push({ h: 'حالة: ' + l.lesson, w: 13 }); c.push({ h: 'إتقان: ' + l.lesson + ' (%)', w: 13, t: 'pct' }); });
    c.push({ h: 'الأسئلة المجاب عنها', w: 10, t: 'num' }, { h: 'دقة المحاولة الأولى (%)', w: 12, t: 'pct' }, { h: 'النسبة النهائية (%)', w: 12, t: 'pct' },
      { h: 'المحاولات', w: 10, t: 'num' }, { h: 'التلميحات', w: 10, t: 'num' }, { h: 'النقاط XP', w: 10, t: 'num' }, { h: 'الشارات', w: 9, t: 'num' }, { h: 'تحتاج مراجعة؟', w: 12 });
    return c;
  }
  const summaryRow = s => {
    const r = [s.name, s.className || '—', s.code, s.studentId, s.firstSeen, s.lastLogin, s.lastActivity, s.sessions.size];
    L().forEach(l => { const x = s.lessonStats[l.id]; r.push(x.statusAr); r.push(dash(x.firstPct)); });
    r.push(s.answered, dash(s.firstPct), dash(s.finalPct), s.attempts, s.hints, s.xp, s.badges.length, s.needsReview ? 'نعم' : 'لا');
    return r;
  };
  const attemptCols = [{ h: 'اسم الطالبة', w: 20 }, { h: 'الفصل', w: 10 }, { h: 'رمز الطالبة', w: 10 }, { h: 'معرف الجلسة', w: 24 }, { h: 'الدرس', w: 22 },
    { h: 'رقم السؤال', w: 9 }, { h: 'معرف السؤال', w: 9 }, { h: 'المفهوم المستهدف', w: 28 }, { h: 'الإجابة المختارة', w: 36 }, { h: 'الإجابة الصحيحة (المفتاح)', w: 36 },
    { h: 'صحة الإجابة', w: 10, t: 'bool' }, { h: 'رقم المحاولة', w: 9, t: 'num' }, { h: 'التلميحات قبلها', w: 9, t: 'num' }, { h: 'النقاط', w: 8, t: 'num' },
    { h: 'وقت الإجابة', w: 18, t: 'date' }, { h: 'مدة الإجابة (ث)', w: 10, t: 'num' }, { h: 'حالة السؤال', w: 12 }];
  const attemptRow = a => [a.studentName, a.className || '—', a.code, a.sessionId, a.lesson, a.qNo, a.questionId, a.concept, a.chosen, a.correctText,
    a.isCorrect ? 'صحيحة' : 'خاطئة', a.attemptNo, a.hints, a.xp, a.time, a.durationSec, a.status];
  const conceptCols = [{ h: 'اسم الطالبة', w: 20 }, { h: 'الفصل', w: 10 }, { h: 'الدرس', w: 22 }, { h: 'المفهوم المستهدف', w: 30 },
    { h: 'أسئلة مكتملة', w: 9, t: 'num' }, { h: 'صحيحة من أول محاولة', w: 10, t: 'num' }, { h: 'محاولات خاطئة', w: 9, t: 'num' }, { h: 'إتقان المحاولة الأولى (%)', w: 12, t: 'pct' },
    { h: 'النسبة النهائية (%)', w: 11, t: 'pct' }, { h: 'متوسط المحاولات', w: 9, t: 'num' }, { h: 'التلميحات', w: 9, t: 'num' }, { h: 'التصنيف', w: 18, t: 'flag' }, { h: 'المقترح العلاجي', w: 60 }];
  const conceptRow = c => [c.studentName, c.className || '—', c.lesson, c.concept, c.n, c.firstOk, c.wrong, dash(c.firstPct), dash(c.finalPct), c.avgAttempts, c.hints, c.category, c.remedy];
  const sessionCols = [{ h: 'اسم الطالبة', w: 20 }, { h: 'الفصل', w: 10 }, { h: 'معرف الجلسة', w: 26 }, { h: 'بداية الجلسة', w: 18, t: 'date' }, { h: 'آخر نشاط', w: 18, t: 'date' },
    { h: 'نهاية الجلسة', w: 18, t: 'date' }, { h: 'المدة (دقيقة)', w: 10, t: 'num' }, { h: 'المحاولات', w: 9, t: 'num' }, { h: 'الدروس', w: 30 }];
  const sessionRows = s => s.sessionList.map(x => [s.name, s.className || '—', x.sessionId, x.start, x.last, x.end, +(T().secsBetween(x.start, x.end || x.last) / 60).toFixed(1), x.attempts, [...x.lessons].map(l => B().lesson(l).lesson).join('، ')]);

  const GUIDE = [
    'مغامرة المهارات الرقمية — تقرير أداء الطالبات',
    '',
    'دقة المحاولة الأولى: نسبة الأسئلة التي أصابت فيها الطالبة من أول محاولة (الإتقان الفوري).',
    'النسبة النهائية: نسبة الأسئلة التي وصلت فيها للإجابة الصحيحة بعد التلميحات (الإتقان بعد المساعدة).',
    'التصنيف لكل مفهوم: «إتقان فوري» (≥80% من أول محاولة)، «تحسّن بعد التلميح» (أصابت كل الأسئلة بعد تلميحين على الأكثر)، «تحتاج دعمًا علاجيًا» (أخطاء متكررة أو سؤال لم يُحل).',
    'كثرة المحاولات وحدها ليست دليلًا قاطعًا على الضعف؛ تُقرأ مع نسبة المحاولة الأولى والنتيجة النهائية.',
    'الألوان: أحمر فاتح أقل من 50% — أصفر 50–79% — أخضر 80% فأكثر. الأوقات بتوقيت الرياض.',
    '',
    'إعداد المعلمة: عالية اليامي'
  ];

  async function build(kind, model, opts) {
    await ensureLib();
    opts = opts || {};
    const wb = new ExcelJS.Workbook();
    wb.creator = 'مغامرة المهارات الرقمية — المعلمة عالية اليامي';
    wb.created = new Date();
    wb.views = [{ rightToLeft: true }];
    const stamp = 'تاريخ التصدير (الرياض): ' + T().riyadh(new Date().toISOString()) + (opts.source ? ' — ' + opts.source : '') + (opts.filtersText ? ' — المرشحات: ' + opts.filtersText : '');
    const g = [GUIDE[0], opts.demo ? 'تنبيه: بيانات تجريبية مولّدة للمعاينة وليست بيانات طالبات حقيقيات.' : stamp].concat(GUIDE.slice(1));
    let file = 'تقرير';

    if (kind === 'all') {
      addSheet(wb, 'ملخص أداء الطالبات', summaryCols(), model.students.map(summaryRow));
      addSheet(wb, 'سجل المحاولات والإجابات', attemptCols, model.attemptRows.map(attemptRow));
      addSheet(wb, 'تحليل جوانب الضعف', conceptCols, model.conceptRows.slice().sort((a, b) => a.studentName.localeCompare(b.studentName, 'ar') || (a.firstPct || 0) - (b.firstPct || 0)).map(conceptRow));
      addSheet(wb, 'الجلسات', sessionCols, model.students.flatMap(sessionRows));
      file = 'بيانات-جميع-الطالبات';
    } else if (kind === 'student') {
      const s = model.students.find(x => x.studentId === opts.studentId);
      if (!s) throw new Error('اختاري طالبة أولًا.');
      const info = addSheet(wb, 'ملخص الطالبة', [{ h: 'البند', w: 30 }, { h: 'القيمة', w: 50 }], [
        ['اسم الطالبة', s.name], ['الفصل', s.className || '—'], ['رمز الطالبة', s.code], ['أول دخول', T().riyadh(s.firstSeen)], ['آخر دخول', T().riyadh(s.lastLogin)],
        ['آخر نشاط', T().riyadh(s.lastActivity)], ['عدد الجلسات', s.sessions.size], ['المراحل المكتملة', s.stagesDone + ' من 4'],
        ['دقة المحاولة الأولى', s.firstPct == null ? '—' : s.firstPct + '%'], ['النسبة النهائية', s.finalPct == null ? '—' : s.finalPct + '%'],
        ['المحاولات', s.attempts], ['التلميحات', s.hints], ['الاستفادة من التلميحات', s.hintBenefit == null ? '—' : `${s.helped} من ${s.hintQs} سؤالًا صُحح بعد الخطأ (${s.hintBenefit}%)`],
        ['النقاط', s.xp], ['الشارات', s.badges.length]
      ].concat(L().map(l => { const x = s.lessonStats[l.id]; return [l.lesson, `${x.statusAr} — إتقان ${x.firstPct == null ? '—' : x.firstPct + '%'} — ${T().duration(x.durSec)}`]; })));
      addSheet(wb, 'محاولات الطالبة', attemptCols, model.attemptRows.filter(a => a.studentId === s.studentId).map(attemptRow));
      addSheet(wb, 'المفاهيم والتوصيات', conceptCols, s.concepts.map(c => conceptRow(Object.assign({ studentName: s.name, className: s.className }, c))));
      addSheet(wb, 'جلسات الطالبة', sessionCols, sessionRows(s));
      file = 'سجل-الطالبة-' + s.name.replace(/\s+/g, '-');
    } else if (kind === 'lesson') {
      const lid = opts.lesson; const les = B().lesson(lid);
      if (!les) throw new Error('اختاري درسًا أولًا.');
      const sts = model.students.filter(s => s.lessonStats[lid].status !== 'none');
      addSheet(wb, 'نتائج الدرس', [{ h: 'اسم الطالبة', w: 22 }, { h: 'الفصل', w: 10 }, { h: 'الحالة', w: 12 }, { h: 'بدء المرحلة', w: 18, t: 'date' }, { h: 'إنهاء المرحلة', w: 18, t: 'date' },
        { h: 'الوقت (دقيقة)', w: 10, t: 'num' }, { h: 'أُجيب', w: 8, t: 'num' }, { h: 'دقة المحاولة الأولى (%)', w: 12, t: 'pct' }, { h: 'النسبة النهائية (%)', w: 12, t: 'pct' },
        { h: 'المحاولات', w: 9, t: 'num' }, { h: 'التلميحات', w: 9, t: 'num' }, { h: 'النقاط', w: 8, t: 'num' }],
        sts.map(s => { const x = s.lessonStats[lid]; return [s.name, s.className || '—', x.statusAr, x.startedAt, x.completedAt, +(x.durSec / 60).toFixed(1), x.answered, dash(x.firstPct), dash(x.finalPct), x.attempts, x.hints, x.xp]; }));
      addSheet(wb, 'محاولات الدرس', attemptCols, model.attemptRows.filter(a => a.lessonId === lid).map(attemptRow));
      addSheet(wb, 'مفاهيم الدرس', conceptCols, model.conceptRows.filter(c => c.lessonId === lid).map(conceptRow));
      file = 'نتائج-درس-' + les.lesson.replace(/\s+/g, '-');
    } else if (kind === 'weakness') {
      const w = A().weakness(model);
      addSheet(wb, 'المفاهيم الأضعف', [{ h: 'الدرس', w: 22 }, { h: 'المفهوم', w: 30 }, { h: 'إتقان المحاولة الأولى (%)', w: 12, t: 'pct' }, { h: 'النسبة النهائية (%)', w: 12, t: 'pct' },
        { h: 'متوسط المحاولات', w: 10, t: 'num' }, { h: 'محاولات خاطئة', w: 10, t: 'num' }, { h: 'طالبات أخطأن', w: 10, t: 'num' }, { h: 'تحسّنّ بالتلميح', w: 10, t: 'num' }, { h: 'يحتجن دعمًا', w: 10, t: 'num' }, { h: 'المقترح العلاجي', w: 60 }],
        w.lowConcepts.map(c => [c.lesson, c.concept, c.firstPct, dash(c.finalPct), c.avgAttempts, c.wrong, c.strugglers.size, c.improved.size, c.support.size, c.remedy]));
      addSheet(wb, 'أسئلة تكرر خطؤها', [{ h: 'الدرس', w: 22 }, { h: 'السؤال', w: 9 }, { h: 'نص السؤال', w: 60 }, { h: 'المفهوم', w: 28 }, { h: 'طالبات أخطأن من أول محاولة', w: 12, t: 'num' }, { h: 'الأسماء', w: 40 }],
        w.sharedErrors.map(q => [B().lesson(q.lessonId).lesson, q.def ? q.def.no : q.qid, q.def ? q.def.text : '', q.concept, q.firstWrong.size, q.names.join('، ')]));
      addSheet(wb, 'طالبات يحتجن مراجعة', [{ h: 'اسم الطالبة', w: 22 }, { h: 'الفصل', w: 10 }, { h: 'دقة المحاولة الأولى (%)', w: 12, t: 'pct' }, { h: 'النسبة النهائية (%)', w: 12, t: 'pct' }, { h: 'المفاهيم التي تحتاج دعمًا', w: 50 }, { h: 'المقترحات', w: 70 }],
        w.needReview.map(s => { const sup = s.concepts.filter(c => c.category === 'تحتاج دعمًا علاجيًا'); return [s.name, s.className || '—', dash(s.firstPct), dash(s.finalPct), sup.map(c => c.concept).join('، '), sup.map(c => c.remedy).join(' | ')]; }));
      addSheet(wb, 'إتقان من المحاولة الأولى', [{ h: 'اسم الطالبة', w: 22 }, { h: 'الفصل', w: 10 }, { h: 'دقة المحاولة الأولى (%)', w: 12, t: 'pct' }, { h: 'الأسئلة', w: 9, t: 'num' }],
        w.masters.map(s => [s.name, s.className || '—', s.firstPct, s.answered]));
      addSheet(wb, 'تحليل كل طالبة', conceptCols, model.conceptRows.map(conceptRow));
      file = 'تقرير-جوانب-الضعف';
    } else if (kind === 'class') {
      const cls = A().byClass(model);
      const cols = [{ h: 'الفصل', w: 12 }, { h: 'عدد الطالبات', w: 10, t: 'num' }, { h: 'بدأن اللعب', w: 10, t: 'num' }];
      L().forEach(l => cols.push({ h: 'أكملن: ' + l.lesson, w: 12, t: 'num' }, { h: 'إتقان: ' + l.lesson + ' (%)', w: 13, t: 'pct' }, { h: 'نهائية: ' + l.lesson + ' (%)', w: 13, t: 'pct' }));
      addSheet(wb, 'ملخص حسب الفصل', cols, cls.map(c => {
        const r = [c.cls, c.students, c.started];
        L().forEach(l => { const x = c.lessons[l.id] || { done: 0, ans: 0 }; r.push(x.done, x.ans ? Math.round(x.fOk / x.ans * 100) : '', x.ans ? Math.round(x.fin / x.ans * 100) : ''); });
        return r;
      }));
      file = 'ملخص-الأداء-حسب-الفصل';
    }
    guide(wb, g);
    const buf = await wb.xlsx.writeBuffer();
    const d = T().riyadh(new Date().toISOString()).slice(0, 10);
    return { blob: new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), name: `${file}${opts.demo ? '-تجريبي' : ''}-${d}.xlsx` };
  }

  window.MDQ = window.MDQ || {};
  MDQ.excel = { build };
})();
