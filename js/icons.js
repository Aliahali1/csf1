/* أيقونات SVG مضمّنة (بدون مكتبات خارجية) */
(function () {
  const s = (p, vb) => `<svg viewBox="${vb || '0 0 24 24'}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const I = {
    compass: `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#FFC93C" stroke="#fff" stroke-width="2"/><circle cx="20" cy="20" r="13.5" fill="none" stroke="#E8458F" stroke-width="1.6" stroke-dasharray="2 3"/><path d="M20 7 L24 20 L20 33 L16 20 Z" fill="#6B4EF0"/><path d="M20 7 L24 20 L16 20 Z" fill="#FF6FB5"/><circle cx="20" cy="20" r="2.2" fill="#252826"/></svg>`,
    shield: s('<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>'),
    laptop: s('<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/><path d="M12 8v3m0 2.5v.01"/>'),
    db: s('<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13"/><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>'),
    search: s('<rect x="3" y="4" width="11" height="13" rx="1.5"/><path d="M6 8h5M6 11h3"/><circle cx="16" cy="15" r="4"/><path d="M19 18l3 3"/>'),
    star: s('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
    grit: s('<path d="M4 20l5-9 4 5 3-4 4 8z"/><path d="M15 4v6"/><path d="M15 4l4 1.5L15 7"/>'),
    map: s('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>'),
    book: s('<path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 006.5 23H20v-5"/><path d="M8 7h8M8 10h6"/>'),
    xp: s('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    medal: s('<circle cx="12" cy="14" r="6"/><path d="M8.5 9L6 2h4l2 5 2-5h4l-2.5 7"/>'),
    check: s('<path d="M5 12l5 5 9-10"/>'),
    x: s('<path d="M6 6l12 12M18 6L6 18"/>'),
    bulb: s('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>'),
    lock: s('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>'),
    arrow: s('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    back: s('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    download: s('<path d="M12 3v12m-5-5l5 5 5-5"/><path d="M4 21h16"/>'),
    cloud: s('<path d="M7 18a4 4 0 01-.5-8 6 6 0 0111.6 1.5A3.5 3.5 0 0117.5 18z"/>'),
    user: s('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
    clock: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')
  };
  window.MDQ = window.MDQ || {};
  MDQ.icons = I;
})();
