/* ============================================================
   وكيل الأهداف: الامتثال لمعايير وكلاء الذكاء الاصطناعي في التعليم والتدريب (الإصدار 1.0، أكتوبر 2026)
   تطبيق بمعيار التناسب لأداة معلمة واحدة. هذا الملف لا يغيّر أسئلة الموقع ولا بيانات الطالبات.
   يحتوي: تصنيف الوكيل، التفويض، تكافؤ صياغة الأسئلة، قرار المعلمة على كل توصية، الإيقاف الفوري،
   مسح البيانات، بطاقة الوكيل، سجل التغييرات. كل شيء يُخزَّن في متصفح المعلمة فقط.
   ============================================================ */
(function () {
  window.MDQ = window.MDQ || {};
  const EK = 'mdq.agent.equiv.v1', DK = 'mdq.agent.decisions.v1', SK = 'mdq.agent.stopped.v1';
  const KEYS = ['mdq.agent.goals.v1', 'mdq.agent.goallog.v1', 'mdq.agent.materials.v1', 'mdq.agent.postset.v1', EK, DK];
  const rd = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const log = (ev, d) => { try { if (MDQ.goals) MDQ.goals.logEvent('std', ev, d || ''); } catch (e) {} };

  /** بصمة نصية بسيطة (ليست تشفيرًا) لتوثيق نسخة جدول الصياغات المستخدمة في كل تحليل */
  function hash(s) { let h = 5381; s = String(s); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16).padStart(8, '0'); }
  const wordingHash = () => hash(JSON.stringify(MDQ.postWording || {}));

  /* ---------- تكافؤ الصياغتين (قرار المعلمة) ---------- */
  const LEVELS = { same: 'مكافئة', minor: 'تختلف قليلًا', major: 'تختلف جوهريًا' };
  const getEquiv = qid => rd(EK, {})[qid] || null;
  function setEquiv(qid, level, note) {
    const all = rd(EK, {});
    if (!level) delete all[qid]; else all[qid] = { level, note: note || '', by: 'المعلمة', at: new Date().toISOString(), hash: wordingHash() };
    wr(EK, all); log('قرار تكافؤ الصياغتين', `${qid} = ${level ? LEVELS[level] : 'أُلغي'}`);
  }
  /** الناتج المقروء بصياغة معادة لا يدخل الخلاصة إلا بعد مراجعة المعلمة وقرارها: مكافئة أو تختلف قليلًا */
  const counted = (qid, via) => via !== 'reworded' || ['same', 'minor'].includes((getEquiv(qid) || {}).level);

  /* ---------- قرار المعلمة على التوصية ---------- */
  const DEC = { ok: 'اعتمدتُ التوصية', edit: 'اعتمدتُها بتعديل', no: 'رفضتُها' };
  const getDecision = qid => rd(DK, {})[qid] || null;
  function setDecision(qid, d, set) {
    const all = rd(DK, {});
    if (!d) delete all[qid]; else all[qid] = { d, at: new Date().toISOString(), file: set && set.file || '', hash: wordingHash() };
    wr(DK, all); log('قرار المعلمة على توصية', `${qid} = ${d ? DEC[d] : 'أُلغي'}`);
  }

  /* ---------- الإيقاف الفوري ومسح البيانات ---------- */
  const stopped = () => rd(SK, null) != null;
  function stop(reason) { wr(SK, { at: new Date().toISOString(), reason: reason || '' }); log('إيقاف فوري للوكيل', reason || ''); }
  function resume() { try { localStorage.removeItem(SK); } catch (e) {} log('استئناف الوكيل', ''); }
  function wipe() { KEYS.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); try { localStorage.removeItem(SK); } catch (e) {} }

  /* ---------- مطابقة الأثر بين الفصول (إنصاف) ---------- */
  function byClass(model, per) { // per: [{s, base, post}] لكل الطالبات المقارَنات عبر النواتج المحتسَبة
    const m = {};
    per.forEach(p => { const c = MDQ.goals.normCls(p.s.className); (m[c] = m[c] || { n: new Set(), b: 0, a: 0, k: 0 }); const o = m[c]; o.n.add(p.s.studentId); o.k++; o.b += p.base ? 1 : 0; o.a += p.post ? 1 : 0; });
    return Object.keys(m).sort().map(c => ({ cls: c, students: m[c].n.size, items: m[c].k, base: Math.round(m[c].b / m[c].k * 100), after: Math.round(m[c].a / m[c].k * 100) }))
      .map(x => Object.assign(x, { gain: x.after - x.base }));
  }

  /* ---------- بطاقة الوكيل ---------- */
  const CLASS = [
    ['المجال', 'التدريس ودعم الممارس (الأساس)، والتقويم والقياس (تحليل الاختبار البعدي).'],
    ['المستخدمة', 'المعلمة (ممارسة تعليمية).'],
    ['المستفيدات', 'طالبات الصف الثالث المتوسط (قاصرات): تُحلَّل نتائجهن ويُحدَّد من تحتاج دعمًا، ولا يستخدمن الوكيل بأنفسهن.'],
    ['الاستقلالية', 'الدرجة الأولى: يقدّم مخرجات وتوصيات فقط، ولا ينفّذ إجراءً ولا يرسل شيئًا.'],
    ['الأثر المحتمل', 'متوسط: يؤثر في اختيار الدعم وتجميع الطالبات، ولا يصدر درجات ولا قرارات قبول. يصير مرتفعًا إن استُخدمت مخرجاته في قرار جوهري، وهذا خارج التفويض.'],
    ['الغرض والقيمة', 'مساعدة المعلمة في تحديد نواتج التعلم التي تحتاج معالجة وقياس أثر المعالجة. المؤشرات: دقة المطابقة، وقت المراجعة، وتحسّن التعلم (الأساس مقابل البعدي). تخفيف العبء لا يُعدّ تحسّنًا في التعلم.']
  ];
  const ALLOW = ['قراءة ردود الطالبات التي استوردتِها وملف نتائج الاختبار البعدي', 'تحليل الأداء وتشخيص الأسباب واقتراح خطوات ومسودات مواد', 'عرض الأثر مع أساسه وحدوده'];
  const DENY = ['إرسال أي شيء للطالبات أو لأي خدمة خارجية', 'تعديل الأسئلة أو الدروس أو بيانات الطالبات', 'إصدار درجات أو قرارات قبول أو جزاءات', 'اعتماد مادة أو توصية دون قراركِ'];
  const NA = [
    ['تعاقدات الموردين والخدمات الخارجية (م3 جزئيًا)', 'لا مورّد خارجي: الوكيل قواعد ثابتة تعمل في المتصفح.'],
    ['حقن الأوامر وأمن النماذج اللغوية (م18)', 'لا نموذج لغوي ولا أدوات خارجية؛ يبقى خطر الملفات المرفوعة، ويُعالَج بقراءتها كنص وعدم تنفيذ أي محتوى منها.'],
    ['تعدد الوكلاء (م20)', 'وكيل واحد.'],
    ['حقوق المحتوى (م16)', 'الوكيل لا يولّد محتوى لغويًا؛ المواد المقترحة مبنية على دروس المنهج القائمة.']
  ];
  const ACCEPT = [
    ['اختبار آلي لمطابقة الأعمدة والأسماء (أسماء مكررة، عمود نقاط ناقص، صياغة غير مطابقة، ملف بلا أسماء)', 'مُنجَز (tools/test-agent-std.js)'],
    ['اختبار آلي أن الوكيل لا يعدّل البيانات المصدرية', 'مُنجَز (tools/test-compat.js)'],
    ['تجربة بملف نتائج طالبات فعلي بعد اعتماد صياغات الأسئلة', 'غير مُنجَز بعد'],
    ['معايرة عتبات القواعد إحصائيًا', 'غير مُنجَز (العتبات إرشادية)'],
    ['مراجعة مختصة (تربوي/قياس) لتكافؤ الصياغتين', 'بانتظار قراركِ لكل ناتج']
  ];
  const CHANGES = [
    ['2026-10-30', '1.3.0', 'تصنيف الوكيل وبطاقته؛ تكافؤ صياغتي السؤال (الموقع/البعدي) بقرار المعلمة؛ قرار المعلمة على كل توصية؛ إيقاف فوري ومسح للبيانات؛ شرح أساس كل نتيجة؛ تسمية محايدة؛ مقارنة الفصول.', 'تطبيق معايير وكلاء الذكاء الاصطناعي (الإصدار 1.0) بعد إعادة صياغة أسئلة الاختبار البعدي.'],
    ['2026-10-30', '1.2.0', 'مطابقة أعمدة الاختبار البعدي بالصياغة المعادة وعرض الصياغتين أمام كل هدف.', 'تغيّر صياغة أسئلة الاختبار البعدي.']
  ];
  function cardHTML(esc) {
    const li = a => '<ul style="margin:4px 0;padding-inline-start:18px">' + a.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';
    return `<section class="panel card" id="stdCard" style="margin-bottom:16px"><details><summary><h2 style="display:inline">بطاقة الوكيل وفق معايير وكلاء الذكاء الاصطناعي</h2></summary>
      <p class="muted small-print">تطبيق بمعيار التناسب لأداة معلمة واحدة. هذه البطاقة وصفٌ لما نُفِّذ لا شهادة مطابقة؛ الحكم الرسمي للجهة المختصة.</p>
      <h3>التصنيف</h3><div class="t-scroll"><table class="t-table"><tbody>${CLASS.map(r => `<tr><th>${esc(r[0])}</th><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table></div>
      <h3>التفويض</h3><p><b>يُسمح:</b></p>${li(ALLOW)}<p><b>يُمنع:</b></p>${li(DENY)}
      <p class="small-print">القرار الجوهري بيدكِ دائمًا. غياب قراركِ لا يُعدّ موافقة، وعند عدم كفاية المعلومات يتوقف الوكيل ويطلب قراركِ.</p>
      <h3>البيانات والخصوصية</h3>${li(['كل شيء في متصفحكِ فقط: الأهداف والسجل والمواد وملف النتائج وقراراتكِ، ولا يُرسل لأي جهة.', 'تُحفظ أسماء الطالبات داخل ملف النتائج المرفوع حتى تحذفيه؛ احذفيه بعد انتهاء التحليل.', 'لا تُدخلي أسماء الطالبات في أي أداة ذكاء اصطناعي خارجية عند استخدام «حزمة المطالبة».', 'زر «مسح بيانات الوكيل» يحذف كل ما سبق من هذا المتصفح.'])}
      <h3>متطلبات لا تنطبق (وسبب ذلك)</h3><div class="t-scroll"><table class="t-table"><tbody>${NA.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table></div>
      <h3>معايير القبول وما اختُبر</h3><div class="t-scroll"><table class="t-table"><tbody>${ACCEPT.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table></div>
      <h3>سجل التغييرات</h3><div class="t-scroll"><table class="t-table"><thead><tr><th>التاريخ</th><th>الإصدار</th><th>التغيير</th><th>السبب</th></tr></thead><tbody>${CHANGES.map(r => `<tr>${r.map((c, i) => `<td${i < 2 ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="small-print">نسخة جدول صياغات الاختبار البعدي: <span class="num ltr">${esc(MDQ.postWordingVersion || '—')} · ${esc(wordingHash())}</span></p>
    </details></section>`;
  }

  MDQ.std = { VERSION: '1.3.0', LEVELS, DEC, hash, wordingHash, getEquiv, setEquiv, counted, getDecision, setDecision, stopped, stop, resume, wipe, byClass, cardHTML, CLASS, ALLOW, DENY, NA, ACCEPT, CHANGES, KEYS };
})();
