/* ============================================================
   عارض ملفات الدرس (PDF) داخل الموقع — باستخدام PDF.js
   يعرض الصفحات داخل اللوحة الجانبية دون مغادرة السؤال.
   ============================================================ */
(function () {
  const BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  let loading = null;
  const cache = new Map();
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('تعذر تحميل ' + src)); document.head.appendChild(s); });
  }
  function lib() {
    if (window.pdfjsLib && window.pdfjsWorker) return Promise.resolve(window.pdfjsLib);
    if (!loading) {
      // تحميل العامل في الصفحة نفسها (يعمل حتى في البيئات التي تمنع Web Workers من مصادر خارجية)
      loading = loadScript(BASE + 'pdf.worker.min.js').then(() => loadScript(BASE + 'pdf.min.js')).then(() => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = BASE + 'pdf.worker.min.js';
        return window.pdfjsLib;
      });
      loading.catch(() => { loading = null; });
    }
    return loading;
  }

  /** يعرض الملف داخل العنصر host */
  async function render(host, file, title) {
    host.innerHTML = `<div class="pdf-bar">
        <b class="grow">${title}</b>
        <a class="btn small ghost" href="${file}" target="_blank" rel="noopener">فتح في تبويب جديد</a>
        <button class="btn small gold" data-dl>تنزيل الملف</button>
      </div>
      <div class="pdf-status" role="status">جارٍ تحميل ملف الدرس…</div>
      <div class="pdf-pages"></div>`;
    host.querySelector('[data-dl]').onclick = async () => {
      try {
        const r = await fetch(file); const b = await r.blob();
        await MDQ.saveFile(title.replace(/\s+/g, '-') + '.pdf', b);
      } catch (e) { host.querySelector('.pdf-status').textContent = 'تعذر التنزيل: ' + e.message; }
    };
    const status = host.querySelector('.pdf-status'), pages = host.querySelector('.pdf-pages');
    try {
      const pdfjs = await lib();
      let doc = cache.get(file);
      if (!doc) { doc = await pdfjs.getDocument({ url: file, isEvalSupported: false, disableFontFace: false }).promise; cache.set(file, doc); }
      if (!host.isConnected) return;
      status.textContent = `${doc.numPages} صفحة — مرّري للأسفل للقراءة`;
      const width = Math.max(260, pages.clientWidth || host.clientWidth || 480);
      const first = await doc.getPage(1);
      const vp1 = first.getViewport({ scale: 1 });
      const ratio = vp1.height / vp1.width;
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting || en.target.dataset.done) return;
          en.target.dataset.done = '1'; io.unobserve(en.target);
          drawPage(doc, +en.target.dataset.p, en.target, width);
        });
      }, { root: host.closest('.body') || null, rootMargin: '600px 0px' });
      for (let i = 1; i <= doc.numPages; i++) {
        const box = document.createElement('div');
        box.className = 'pdf-page'; box.dataset.p = i;
        box.style.aspectRatio = `1 / ${ratio}`;
        box.innerHTML = `<span class="pdf-num">صفحة ${i}</span>`;
        pages.appendChild(box); io.observe(box);
      }
    } catch (e) {
      status.innerHTML = `تعذر عرض الملف هنا (${e.message || e}). يمكنكِ فتحه من زر «فتح في تبويب جديد» أو تنزيله.`;
    }
  }
  async function drawPage(doc, n, box, width) {
    try {
      const page = await doc.getPage(n);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp0 = page.getViewport({ scale: 1 });
      const vp = page.getViewport({ scale: (width / vp0.width) * dpr });
      const cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height;
      cv.setAttribute('aria-label', 'صفحة ' + n);
      await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
      box.appendChild(cv);
    } catch (e) { box.insertAdjacentHTML('beforeend', '<span class="pdf-err">تعذر عرض هذه الصفحة</span>'); }
  }

  window.MDQ = window.MDQ || {};
  MDQ.lessonViewer = { render };
})();
