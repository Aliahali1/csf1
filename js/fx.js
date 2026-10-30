/* ============================================================
   المؤثرات: أصوات مولّدة بالمتصفح (بدون ملفات)، والتميمة «نجمة»،
   وبتلات الساكورا المتحركة، ورسائل التحفيز.
   ============================================================ */
(function () {
  /* ---------------- الأصوات (Web Audio) ---------------- */
  let ctx = null, master = null;
  let on = true;
  try { on = localStorage.getItem('mdq.sound') !== 'off'; } catch (e) {}
  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C(); master = ctx.createGain(); master.gain.value = .32; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start, dur, type, vol, slideTo) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + start;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || .5, t0 + .015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + .05);
  }
  const N = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568 };
  const SOUNDS = {
    tap() { tone(880, 0, .06, 'triangle', .25); },
    select() { tone(660, 0, .07, 'sine', .3, 990); },
    open() { tone(520, 0, .12, 'sine', .25, 1040); tone(1040, .08, .12, 'triangle', .15); },
    correct() { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * .07, .22, 'triangle', .45)); tone(N.G6, .3, .35, 'sine', .25); },
    wrong() { tone(392, 0, .16, 'sine', .3, 330); tone(330, .14, .22, 'sine', .25, 294); },
    hint() { tone(1200, 0, .08, 'sine', .3, 1800); tone(1600, .07, .1, 'sine', .2, 2200); },
    combo(n) { const b = 600 + Math.min(n, 8) * 70; [0, 1, 2].forEach(i => tone(b * Math.pow(1.26, i), i * .05, .14, 'square', .14)); },
    levelup() {
      const seq = [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E6];
      seq.forEach((f, i) => tone(f, i * .11, .26, 'triangle', .42));
      tone(N.C5 / 2, 0, .9, 'sine', .25); tone(N.G5 / 2, .44, .7, 'sine', .2);
    },
    badge() { [N.G5, N.C6, N.E6, N.G6].forEach((f, i) => tone(f, i * .09, .3, 'sine', .35)); }
  };
  const sfx = {
    get enabled() { return on; },
    play(name, arg) { if (!on) return; try { SOUNDS[name] && SOUNDS[name](arg); } catch (e) {} },
    toggle() { on = !on; try { localStorage.setItem('mdq.sound', on ? 'on' : 'off'); } catch (e) {} if (on) this.play('select'); return on; }
  };

  /* ---------------- المرشدة: روبوت برأس فقط (صور WebP) ---------------- */
  const GUIDE = { happy: 'welcome', welcome: 'welcome', cheer: 'cheer', wow: 'cheer', think: 'think', encourage: 'encourage' };
  function mascot(mood) {
    const f = GUIDE[mood || 'happy'] || 'welcome';
    return `<img class="mascot-img" src="img/guide-${f}.webp" alt="" width="520" height="520" decoding="async">`;
  }
  /** شارة الإنجاز: الصورة باسم معرّف الشارة نفسه (badge-<id>.webp) */
  function badge(id) {
    return `<img class="badge-img" src="img/badge-${id}.webp" alt="" width="360" height="360" loading="lazy" decoding="async">`;
  }
  /** جملة المرشدة عند دخول كل بوابة */
  const STAGE_LINES = {
    cyber: 'بوابة الأمن السيبراني.. هيا نحمي عالمنا الرقمي!',
    device: 'بوابة حماية الجهاز.. هيا ننقذ جهازنا!',
    db: 'بوابة قواعد البيانات.. هيا نبني جداولنا!',
    query: 'بوابة الاستعلام والتقارير.. هيا نكتشف الأسرار!'
  };
  const stageLine = lid => STAGE_LINES[lid] || STAGE_LINES.cyber;

  const LINES = {
    welcome: ['أهلًا بكِ في مغامرة المهارات الرقمية! أي بوابة تريدين دخولها اليوم؟ هيا نكتشف!'],
    start: ['لنبدأ! ركّزي واقرئي السؤال جيدًا.', 'أنا معكِ في كل سؤال!', 'كل سؤال خطوة نحو الإتقان!'],
    correct: ['أحسنتِ! إجابة صحيحة، واصلي!', 'ممتاز! أنتِ تتقدمين!', 'رائع! نقطة جديدة لكِ!'],
    wrong: ['لا بأس، المحاولة تعلّمنا. جرّبي مرة أخرى!', 'قريبة! فكّري قليلًا.', 'الأخطاء خطوات نحو الإتقان، هيا مجددًا!'],
    hint: ['إليكِ تلميحًا صغيرًا، تأملي الكلمات المفتاحية.', 'تلميح جديد لكِ! اقرئي السؤال مرة أخرى بتمعّن.'],
    teach: ['عودي للكتاب إن احتجتِ، فهو سندكِ.', 'لنتعلّم معًا، افتحي ملف الدرس.'],
    combo: ['سلسلة نارية!', 'لا يمكن إيقافكِ!', 'كومبو خارق!'],
    done: ['أحسنتِ! أكملتِ المرحلة وفتحتِ شارة جديدة!', 'مرحلة مكتملة! أنتِ بطلة المهارات الرقمية!']
  };
  const pick = k => { const a = LINES[k] || LINES.start; return a[Math.floor(Math.random() * a.length)]; };

  /* ---------------- بتلات الساكورا ---------------- */
  function petals() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas'); c.id = 'petals'; c.setAttribute('aria-hidden', 'true');
    document.body.prepend(c);
    const g = c.getContext('2d');
    let W, H; const P = [];
    const resize = () => { W = c.width = innerWidth; H = c.height = innerHeight; };
    resize(); addEventListener('resize', resize);
    const cols = ['#FFB7D5', '#FFD1E6', '#C9B8FF', '#FFE08A', '#A8E6FF'];
    const n = Math.min(26, Math.round(innerWidth / 50));
    for (let i = 0; i < n; i++) P.push({ x: Math.random() * W, y: Math.random() * H, s: 5 + Math.random() * 7, vy: .35 + Math.random() * .6, vx: -.3 + Math.random() * .6, a: Math.random() * 6, va: (Math.random() - .5) * .03, c: cols[i % cols.length], sw: Math.random() * 6 });
    let run = true;
    document.addEventListener('visibilitychange', () => { run = !document.hidden; if (run) tick(); });
    function tick() {
      if (!run) return;
      g.clearRect(0, 0, W, H);
      P.forEach(p => {
        p.y += p.vy; p.sw += .02; p.x += p.vx + Math.sin(p.sw) * .4; p.a += p.va;
        if (p.y > H + 12) { p.y = -12; p.x = Math.random() * W; }
        if (p.x < -12) p.x = W + 12; if (p.x > W + 12) p.x = -12;
        g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.globalAlpha = .55; g.fillStyle = p.c;
        g.beginPath(); g.moveTo(0, -p.s); g.quadraticCurveTo(p.s * .9, -p.s * .2, 0, p.s); g.quadraticCurveTo(-p.s * .9, -p.s * .2, 0, -p.s); g.fill();
        g.restore();
      });
      requestAnimationFrame(tick);
    }
    tick();
  }

  /* ---------------- نص يطير (+XP) ---------------- */
  function floatText(anchor, text, cls) {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const d = document.createElement('div');
    d.className = 'float-txt ' + (cls || ''); d.textContent = text;
    d.style.left = (r.left + r.width / 2) + 'px'; d.style.top = (r.top) + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }
  function burst(el) {
    if (!el) return;
    el.classList.remove('burst'); void el.offsetWidth; el.classList.add('burst');
    setTimeout(() => el.classList.remove('burst'), 900);
  }

  window.MDQ = window.MDQ || {};
  MDQ.sfx = sfx;
  MDQ.fx = { mascot, badge, stageLine, line: pick, petals, floatText, burst };
})();
