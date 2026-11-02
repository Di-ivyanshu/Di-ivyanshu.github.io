/* Portfolio page logic — a plain-JS port of the original dc/React component.
   Everything here enhances markup that is already complete in index.html, so the page reads
   and works (links, case studies via the cards, contact email) even before or without this file.
   Heavy, decorative work is deferred:
     - the hero video loads after the page has loaded (the poster image is the first paint),
     - three.js (the particle field) loads on the first interaction or once the page is idle. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const ref = n => document.querySelector('[data-ref="' + n + '"]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const root = ref('root') || document.body;
  const SECTIONS = ['top', 'statement', 'work', 'oss', 'lab', 'skills', 'contact'];

  // run fn once the page has loaded and the main thread is idle
  function afterLoad(fn, delay) {
    const go = () => setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2000 }) : fn()), delay || 0);
    if (document.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
  }

  /* ---------- name: decode-in, living "i", mascot ---------- */
  function initName() {
    const h = ref('name'); if (!h) return;
    let done = false;
    const go = () => { if (done) return; done = true; try { if (window.NamePlay) window.NamePlay(h); } catch (e) { /* keep the plain name */ } h.style.visibility = 'visible'; };
    const fontReady = document.fonts && document.fonts.load ? document.fonts.load('40px "BubbledotICG-FinePos"').then(() => document.fonts.ready) : Promise.resolve();
    Promise.race([fontReady, new Promise(r => setTimeout(r, 2500))]).then(go, go);
  }

  /* ---------- hero stats count-up ---------- */
  function initStats() {
    const box = ref('stats'); if (!box) return;
    const els = $$('[data-count]', box); if (!els.length || reduced) return;   // reduced motion: keep the final figures
    const fmt = (el, v) => (el.dataset.prefix || '') + v.toFixed(+el.dataset.dec || 0) + (el.dataset.suffix || '');
    els.forEach(el => { el.textContent = fmt(el, 0); });
    let counted = false;
    const run = () => {
      if (counted) return; counted = true;
      els.forEach((el, i) => {
        const n = +el.dataset.count, dur = 1500 + i * 80, t0 = performance.now() + 480 + i * 90;
        const step = now => { const p = Math.min(1, Math.max(0, (now - t0) / dur)); const e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(el, n * e); if (p < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    };
    new IntersectionObserver(en => { if (en.some(x => x.isIntersecting)) run(); }, { threshold: 0.25 }).observe(box);
  }

  /* ---------- mobile menu ---------- */
  function initMenu() {
    const btn = $('button[data-action="menu"]'), menu = ref('menu'); if (!btn || !menu) return;
    let open = false;
    const set = v => {
      open = v; menu.hidden = !v; btn.textContent = v ? '×' : '≡';
      btn.setAttribute('aria-expanded', String(v)); btn.setAttribute('aria-label', v ? 'Close menu' : 'Menu');
    };
    $$('[data-action="menu"]').forEach(el => el.addEventListener('click', () => set(el === btn ? !open : false)));
    addEventListener('keydown', e => { if (e.key === 'Escape' && open) { set(false); btn.focus(); } });
  }

  /* ---------- case studies (one open at a time) ---------- */
  function initCases() {
    const cards = $$('[data-case-card]'); let open = null;
    function set(key) {
      open = key;
      cards.forEach(c => {
        const k = c.dataset.caseCard, isOpen = k === open, panel = document.getElementById('case-' + k);
        if (panel) panel.hidden = !isOpen;
        const b = $('[data-case-toggle]', c), g = $('[data-glyph]', c), l = $('[data-label]', c);
        if (b) b.setAttribute('aria-expanded', String(isOpen));
        if (g) g.textContent = isOpen ? '−' : '+';
        if (l) l.textContent = isOpen ? 'Close' : 'Read the case study';
      });
    }
    cards.forEach(c => c.addEventListener('click', () => set(open === c.dataset.caseCard ? null : c.dataset.caseCard)));
  }

  /* ---------- statement: words light up as the paragraph scrolls through the screen ---------- */
  function initStatement() {
    const p = $('[data-statement]', root); if (!p || p.dataset.split || reduced) return; p.dataset.split = '1';
    let i = 0, last = null;
    const walk = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); last = null; return; }
            // punctuation right after a word ("talk." / "meeting,") stays glued to it, so a line never starts with it
            const m = /^[.,;:!?…’”)\]]+/.exec(tok);
            if (m && last) { last.textContent += m[0]; tok = tok.slice(m[0].length); if (!tok) return; }
            const s = document.createElement('span'); s.textContent = tok; s.dataset.w = i++; s.style.display = 'inline-block';
            frag.appendChild(s); last = s;
          });
          node.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) walk(ch);
      });
    };
    walk(p);
    const words = $$('[data-w]', p);
    let lit = -1, queued = false;
    const update = () => {
      queued = false;
      const r = p.getBoundingClientRect(), vh = innerHeight, start = vh * 0.85, end = vh * 0.4;
      // 0 when the paragraph's top reaches 85% of the screen, 1 when its bottom reaches 40%
      const prog = Math.min(1, Math.max(0, (start - r.top) / Math.max(1, start - end + r.height)));
      const n = Math.round(prog * words.length); if (n === lit) return; lit = n;
      words.forEach((w, k) => w.classList.toggle('on', k < n));
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    new IntersectionObserver(en => {
      if (en[0].isIntersecting) addEventListener('scroll', onScroll, { passive: true }); else removeEventListener('scroll', onScroll);
      update();
    }, { rootMargin: '25% 0px' }).observe(p);
    update();
  }

  /* ---------- horizon: the sun sets, the dunes drift, "Work" rises from behind them ---------- */
  function initHorizon() {
    const band = $('[data-horizon]', root); if (!band || reduced) return;   // reduced motion: the static composition
    const sun = $('[data-h-sun]', band), title = $('[data-h-title]', band);
    const dunes = [1, 2, 3].map(k => $('[data-h-dune="' + k + '"]', band));
    const lerp = (a, b, t) => a + (b - a) * t, ease = t => 1 - Math.pow(1 - t, 3);
    // [start, end] offsets as a fraction of the band height (front, middle, back)
    const travel = [[0.06, 0], [0.16, -0.01], [0.10, -0.03]];
    let queued = false;
    const update = () => {
      queued = false;
      const r = band.getBoundingClientRect(), vh = innerHeight, H = r.height;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + H * 0.35)));   // 0: band enters at the bottom; 1: well past the top
      const rise = ease(Math.min(1, p / 0.62));
      title.style.transform = 'translate3d(0,' + ((1 - rise) * H * 0.42).toFixed(1) + 'px,0)';
      title.style.opacity = (0.15 + 0.85 * rise).toFixed(3);
      sun.style.transform = 'translate3d(-50%,' + (lerp(-0.16, 0.22, p) * H).toFixed(1) + 'px,0)';
      dunes.forEach((d, k) => { if (d) d.style.transform = 'translate3d(0,' + (lerp(travel[k][0], travel[k][1], p) * H).toFixed(1) + 'px,0)'; });
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    new IntersectionObserver(en => {
      if (en[0].isIntersecting) addEventListener('scroll', onScroll, { passive: true }); else removeEventListener('scroll', onScroll);
      onScroll();
    }, { rootMargin: '10% 0px' }).observe(band);
    addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------- project glow follows how much of the card is on screen ---------- */
  function initBeams() {
    const arts = $$('[data-proj]', root); if (!arts.length) return;
    const io = new IntersectionObserver(en => en.forEach(x => { x.target.style.setProperty('--lit', Math.min(1, x.intersectionRatio / 0.55).toFixed(2)); }), { threshold: [0, .15, .3, .45, .6, .75, .9, 1] });
    arts.forEach(a => io.observe(a));
  }

  /* ---------- live GitHub numbers ---------- */
  async function loadGitHub() {
    const put = (k, v) => $$('[data-gh="' + k + '"]').forEach(el => { el.textContent = v; });
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '…';
    try {
      const [gw, rag] = await Promise.all(['llm-gateway', 'nocturne-RAG'].map(r => fetch('https://api.github.com/repos/Di-ivyanshu/' + r).then(x => x.ok ? x.json() : null)));
      if (gw) { put('gw-stars', gw.stargazers_count); put('gw-pushed', 'pushed ' + fmtDate(gw.pushed_at)); }
      if (rag) { put('rag-stars', rag.stargazers_count); put('rag-pushed', 'pushed ' + fmtDate(rag.pushed_at)); }
      put('updated', new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { /* offline: keep placeholders */ }
  }

  /* ---------- contact form (FormSubmit relay, email fallback) ---------- */
  function initForm() {
    const f = ref('form'); if (!f) return;
    const btn = $('button[type="submit"]', f), note = ref('formNote');
    const LABEL = { idle: 'Send message', sending: 'Sending…', sent: 'Sent', error: 'Try again' };
    const NOTE = { idle: 'Lands in my inbox. No mail app needed.', sending: 'Lands in my inbox. No mail app needed.', sent: 'Got it. Straight to my inbox.', error: 'Couldn’t send — email me directly at divyanshuparihar02@gmail.com.' };
    let state = 'idle';
    const set = s => { state = s; btn.textContent = LABEL[s]; if (note) note.textContent = NOTE[s]; btn.disabled = s === 'sending' || s === 'sent'; };
    f.addEventListener('submit', async e => {
      e.preventDefault(); if (state === 'sending') return;
      const data = Object.fromEntries(new FormData(f));
      if (!data.name || !data.email || !data.message) { set('error'); return; }
      set('sending');
      try {
        const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 12000);
        const r = await fetch('https://formsubmit.co/ajax/divyanshuparihar02@gmail.com', {
          method: 'POST', signal: ctrl.signal, headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: data.name, email: data.email, message: data.message, _subject: 'Portfolio contact from ' + data.name, _replyto: data.email, _template: 'table', _captcha: 'false' })
        });
        clearTimeout(timer);
        if (!r.ok) throw new Error(r.status);
        set('sent'); f.reset(); setTimeout(() => set('idle'), 8000);
      } catch (_) { set('error'); }
    });
  }

  /* ---------- videos: muted loops that only play while on screen ---------- */
  const heroA = ref('heroVideo'), heroB = ref('heroVideo2');
  let vids = [];
  const playIfVisible = v => { if (!v.currentSrc && !v.getAttribute('src')) return; const r = v.getBoundingClientRect(); if (r.bottom > 0 && r.top < innerHeight && !document.hidden) v.play().catch(() => {}); };
  function initVideos() {
    vids = $$('video', root);
    vids.forEach(v => { v.muted = true; v.loop = true; v.playsInline = true; v.disableRemotePlayback = true; });
    // project posters: fetched when the card is a screen or so away, so they never compete with the hero image
    const pio = new IntersectionObserver(en => en.forEach(x => { if (x.isIntersecting) { const v = x.target; v.poster = v.dataset.poster; pio.unobserve(v); } }), { rootMargin: '800px 0px' });
    vids.filter(v => v.dataset.poster).forEach(v => pio.observe(v));
    const vio = new IntersectionObserver(en => en.forEach(x => {
      const v = x.target;
      if (x.isIntersecting && !document.hidden) { if (v.currentSrc || v.getAttribute('src')) v.play().catch(() => {}); } else v.pause();
    }), { threshold: 0.15, rootMargin: '80px 0px' });
    vids.forEach(v => vio.observe(v));
    document.addEventListener('visibilitychange', () => { if (document.hidden) vids.forEach(v => v.pause()); else vids.forEach(playIfVisible); });
    // mobile browsers often refuse autoplay until a gesture: retry visible videos on first touch/scroll
    const kick = () => vids.forEach(playIfVisible);
    addEventListener('touchstart', kick, { passive: true, once: true }); addEventListener('scroll', kick, { passive: true, once: true });
  }

  // hero loop: poster first (it is the LCP image), the video only after load — skipped for reduced motion / data saver
  function loadHeroVideo() {
    if (!heroA || reduced || saveData) return;
    const src = matchMedia('(orientation: portrait)').matches ? heroA.dataset.srcPortrait : heroA.dataset.src;
    [heroA, heroB].forEach(v => {
      if (!v) return;
      v.defaultPlaybackRate = 0.5;
      v.addEventListener('loadeddata', () => { v.playbackRate = 0.5; playIfVisible(v); }, { once: true });
      v.preload = 'auto'; v.src = src;
    });
    // keep both copies in sync (the second one is the colour window)
    setInterval(() => { if (heroA && heroB && !heroA.paused && Math.abs(heroA.currentTime - heroB.currentTime) > 0.08) heroB.currentTime = heroA.currentTime; }, 800);
  }

  // desktop: the colour window follows the cursor (touch uses the CSS drift animation)
  function initSpotlight() {
    if (isTouch || !heroB) return;
    let cx = innerWidth / 2, cy = innerHeight * 0.6, vx = cx, vy = cy, spotting = false;
    const spot = () => {
      vx += (cx - vx) * 0.12; vy += (cy - vy) * 0.12;
      heroB.style.setProperty('--mx', vx + 'px'); heroB.style.setProperty('--my', vy + 'px');
      if (Math.abs(cx - vx) + Math.abs(cy - vy) > 0.5 && scrollY < innerHeight) requestAnimationFrame(spot); else spotting = false;
    };
    addEventListener('pointermove', e => { cx = e.clientX; cy = e.clientY; if (!spotting && scrollY < innerHeight) { spotting = true; requestAnimationFrame(spot); } }, { passive: true });
    spotting = true; spot();
  }

  /* ---------- effects ---------- */
  // each effect in its own task so none of them blocks the main thread for long on a slow phone
  function initFX() {
    const FX = window.PortfolioFX; if (!FX) return;
    const steps = [() => FX.initReveal(root), () => FX.initParallax(root), () => FX.initRing(ref('ring')),
      () => FX.initTilt(root), () => FX.initMagnetic(root), () => FX.initCursor(ref('cursor'))];
    const next = () => { const s = steps.shift(); if (!s) return; try { s(); } catch (e) { /* an effect failing never breaks the page */ } setTimeout(next, 0); };
    next();
  }

  // the particle field needs three.js (~150 kB gzipped): fetch it on first interaction, or once the page is idle
  let threeRequested = false;
  function loadThree() {
    if (threeRequested) return; threeRequested = true;
    const canvas = ref('hero'); if (!canvas || !window.PortfolioFX) return;
    const s = document.createElement('script'); s.src = 'assets/js/vendor/three.min.js'; s.async = true;
    s.onload = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      try { window.PortfolioFX.initHero(canvas, null, SECTIONS, { heroAlpha: 0.22 }); } catch (e) { /* no WebGL: the page is complete without it */ }
    });
    document.head.appendChild(s);
  }
  function scheduleThree() {
    const evts = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'scroll', 'keydown'];
    const first = () => { evts.forEach(t => removeEventListener(t, first)); afterLoad(loadThree, 0); };
    evts.forEach(t => addEventListener(t, first, { passive: true }));
    // phones: only after the visitor touches or scrolls (parsing three.js costs a slow CPU ~0.5 s);
    // desktop: also once the page has sat idle for a few seconds
    if (!isTouch) afterLoad(loadThree, 4000);
  }

  function boot() {
    // needed for the first screen: the name, the stat figures, and the controls
    initName(); initStats(); initMenu(); initCases(); initForm(); initVideos(); initSpotlight();
    // below-the-fold motion (reveal/parallax/ring/tilt, word split, glows) waits until after the first paint
    requestAnimationFrame(() => setTimeout(() => { initStatement(); setTimeout(() => { initHorizon(); initBeams(); initFX(); }, 0); }, 0));
    afterLoad(loadHeroVideo, isTouch ? 800 : 200);
    afterLoad(loadGitHub, 300);
    scheduleThree();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
