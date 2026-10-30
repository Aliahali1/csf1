/* ============================================================
   مرافِقة المعلمة (v1.7.6) — الروبوت نفسه الذي في واجهة الطالبات، يرافق قرارات المعلمة.
   - عرض فقط: لا تتخذ قرارًا ولا تغيّر بيانات. التعليقات بقواعد ثابتة (ليست نموذج ذكاء اصطناعي).
   - تستمع لأحداث الصفحة (تغيير قائمة، نقر زر) وتعلّق بعد قرار المعلمة، وتذكّرها دائمًا أن القرار لها.
   - يمكن إخفاؤها (تُحفظ رغبة المعلمة في هذا المتصفح).
   ============================================================ */
(function () {
  const KEY = 'mdq.tguide.hidden.v1';
  let box, txt, img, timer, lastTab = null;
  const get = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const set = v => { try { v ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch (e) {} };

  /* كل تلميح: [حالة الروبوت, النص]. النصوص إرشادية وتعيد القرار للمعلمة. */
  const TAB = {
    overview: ['welcome', 'أهلًا بكِ! هذا ملخص عام. أنا هنا أرافقكِ في القراءة، والقرار في النهاية قراركِ.'],
    students: ['think', 'قبل أي حكم على طالبة، افتحي تقريرها الفردي؛ أرقام الجدول وحدها لا تكفي.'],
    weak: ['think', 'الأسئلة الصعبة قد تكون صياغتها هي المشكلة. راجعيها قبل لوم الطالبات.'],
    outcomes: ['think', 'النواتج تُقرأ مع حجم العينة. الأعداد الصغيرة لا تُبنى عليها قرارات كبيرة.'],
    agent: ['encourage', 'هنا تُعرض اقتراحات الرصد فقط. لن يُنفَّذ شيء حتى تعتمدي أنتِ. جرّبي «لماذا هذه الدرجة؟» قبل الاعتماد.'],
    goals: ['think', 'وكيل الأهداف لا يحتسب نتيجة إلا بعد أن تقرّري أن صياغتها المعادة مكافئة. هذا قراركِ أنتِ.'],
    attempts: ['think', 'المحاولات السريعة جدًا قد تكون نقرًا عشوائيًا وليست عجزًا في الفهم.'],
    export: ['welcome', 'الملفات المصدّرة فيها أسماء طالبات؛ احفظيها في مكان آمن.'],
    bank: ['think', 'هذا للاطلاع فقط. أي تعديل على الأسئلة يغيّر قياسكِ، فكوني على حذر.'],
    settings: ['think', 'التغييرات هنا تؤثر على الموقع كله؛ تأكدي قبل الحفظ.'],
    connect: ['welcome', 'أكملي الربط أولًا، وبعدها تظهر بيانات الطالبات الحقيقية.']
  };

  function ensure() {
    if (box) return;
    box = document.createElement('aside'); box.id = 'tguide'; box.setAttribute('aria-label', 'مرافِقة المعلمة');
    box.innerHTML = '<p class="tg-bubble" id="tgTxt" role="status" aria-live="polite"></p>' +
      '<button type="button" class="tg-bot mascot bob" id="tgBot" aria-label="إخفاء أو إظهار المرافِقة"><img class="mascot-img" alt="" width="520" height="520" decoding="async" src="img/guide-welcome.webp"></button>';
    document.body.appendChild(box);
    txt = box.querySelector('#tgTxt'); img = box.querySelector('img');
    box.querySelector('#tgBot').onclick = () => { const h = !box.classList.contains('hidden'); box.classList.toggle('hidden', h); set(h); if (!h) say('welcome', 'أنا معكِ. القرار لكِ دائمًا.'); };
    if (get()) box.classList.add('hidden');
    ['change', 'click'].forEach(ev => document.addEventListener(ev, onAct, true));
  }
  const MOOD = { welcome: 'welcome', cheer: 'cheer', think: 'think', encourage: 'encourage' };
  function say(mood, text, ms) {
    ensure(); if (box.classList.contains('hidden') && !(ms === -1)) { return; }
    img.src = 'img/guide-' + (MOOD[mood] || 'welcome') + '.webp';
    txt.textContent = text; box.classList.add('talk');
    clearTimeout(timer); if (ms !== -1) timer = setTimeout(() => box.classList.remove('talk'), ms || 14000);
  }
  /** تُستدعى عند كل رسم لوحة؛ تعلّق على التبويب مرة واحدة عند تغيّره. */
  function tab(k) { ensure(); if (k === lastTab) return; lastTab = k; const t = TAB[k]; if (t) say(t[0], t[1]); }

  /* تعليق على قرارات المعلمة (يُشغَّل قبل معالج الصفحة، فلا يعطّله ولا يغيّر شيئًا) */
  function onAct(e) {
    const t = e.target && e.target.closest ? e.target : null; if (!t) return;
    if (e.type === 'change') {
      if (t.matches('select[data-eq]')) {
        const v = t.value;
        if (v === 'same') say('cheer', 'سجّلتِ أن الصياغة مكافئة، فسيُحتسب هذا الناتج في الخلاصة. القرار قراركِ، وهو محفوظ في السجل.');
        else if (v === 'minor') say('think', 'اختلاف قليل: يُحتسب الناتج مع تحذير. راجعي ملاحظة الفروق قبل تعميم النتيجة.');
        else if (v === 'major') say('encourage', 'قررتِ أن الصياغة تختلف جوهريًا، فسيخرج الناتج من الخلاصة. قرار حذر ومبرَّر.');
        else say('think', 'عدتِ إلى «لم تُراجَع»: لن يُحتسب الناتج حتى تقرّري.');
      } else if (t.matches('select[data-dec]')) {
        const v = t.value;
        say(v === 'ok' ? 'cheer' : v === 'edit' ? 'think' : 'encourage', v === 'ok' ? 'اعتمدتِ هذه الخلاصة. سُجّل قراركِ مع النسخة والوقت.' : v === 'edit' ? 'اخترتِ التعديل. عدّلي المطلوب ثم أعيدي النظر؛ لم يتغيّر شيء تلقائيًا.' : 'رفضتِ الخلاصة، فلن تُستخدم. هذا حقكِ، ويمكنكِ العودة عنه.');
      }
      return;
    }
    const b = t.closest('button'); if (!b) return;
    if (b.matches('[data-p] [data-dec]')) say(b.dataset.dec === 'approved' ? 'cheer' : 'encourage', b.dataset.dec === 'approved' ? 'اعتمدتِ المسار. هذه علامة متابعة خاصة بكِ ولا تصل للطالبة.' : 'رفضتِ المسار. لا بأس، فالأداة تقترح وأنتِ تقرّرين.');
    else if (b.id === 'agStop' || b.id === 'stdStop') say('think', 'أُوقفت الأداة بقراركِ. يمكنكِ استئنافها متى شئتِ.', 12000);
    else if (b.id === 'agResume' || b.id === 'stdResume') say('welcome', 'عادت الأداة للعمل. تذكّري: تقترح فقط.');
    else if (b.id === 'agWipe' || b.id === 'stdWipe') say('think', 'مسحُ السجل لا يُسترجع. إن لم تحتفظي بنسخة CSV فخذي واحدة قبل المسح.', 15000);
  }

  MDQ.tguide = { tab, say, hide: () => { ensure(); box.classList.add('hidden'); set(true); }, show: () => { ensure(); box.classList.remove('hidden'); set(false); } };
})();
