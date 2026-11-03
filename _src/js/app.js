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
  // one particle shape per entry (fx.js); in Lab the dots draw CHIRON's front (the SVG there is the no-WebGL fallback)
  const SECTIONS = ['top', 'statement', 'work', 'oss', 'lab-dots', 'lab-film', 'skills', 'contact'];

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
      const narrow = innerWidth < 760;   // phones: the sun starts below the title so the word never sits on the bright core
      sun.style.transform = 'translate3d(-50%,' + (lerp(narrow ? 0 : -0.14, narrow ? 0.2 : 0.13, p) * H).toFixed(1) + 'px,0)';   // half-sun on the crest mid-scroll
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

  /* ---------- "Work": sunset light follows the pointer, the letters shimmer like a desert mirage ---------- */
  function initWorkTitle() {
    const h = $('[data-mirage]', root); if (!h || reduced) return;
    const filt = document.getElementById('mirage');
    const turb = filt && filt.querySelector('feTurbulence'), disp = filt && filt.querySelector('feDisplacementMap');
    let tx = -9999, ty = 0, x = -9999, y = 0, over = false, amp = 0, raf = 0;
    const loop = now => {
      raf = 0;
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      h.style.setProperty('--hx', x.toFixed(1) + 'px'); h.style.setProperty('--hy', y.toFixed(1) + 'px');
      amp += ((over ? 7 : 0) - amp) * 0.08;
      if (disp) {
        disp.setAttribute('scale', amp.toFixed(2));
        turb.setAttribute('baseFrequency', '0.006 ' + (0.05 + 0.012 * Math.sin(now / 260)).toFixed(4));
        h.style.filter = amp > 0.05 ? 'url(#mirage)' : '';
      }
      if (over || amp > 0.05 || Math.abs(tx - x) > 0.5) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const local = e => { const r = h.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    h.addEventListener('pointerenter', e => { if (e.pointerType === 'touch') return; over = true; [x, y] = local(e); [tx, ty] = [x, y]; kick(); });
    h.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; [tx, ty] = local(e); kick(); });
    h.addEventListener('pointerleave', () => { over = false; tx = h.offsetWidth * 1.4; kick(); });   // the light slides off to the right
    // touch screens have no hover: the light sweeps across the word once, after it has risen
    if (isTouch) {
      const io = new IntersectionObserver(en => {
        if (!en[0].isIntersecting) return; io.disconnect();
        setTimeout(() => {
          const w = h.offsetWidth, t0 = performance.now(), dur = 1800;
          ty = y = h.offsetHeight * 0.55; x = -w * 0.3;
          const sweep = now => { const p = Math.min(1, (now - t0) / dur); tx = x = -w * 0.3 + w * 1.7 * (p * p * (3 - 2 * p)); h.style.setProperty('--hx', x + 'px'); h.style.setProperty('--hy', y + 'px'); if (p < 1) requestAnimationFrame(sweep); };
          requestAnimationFrame(sweep);
        }, 500);
      }, { threshold: 0.9 });
      io.observe(h);
    }
  }

  /* ---------- night: after the sunset, stars come out, the repos draw themselves as constellations, the moon rises ---------- */
  function initNight() {
    const band = $('[data-night]', root); if (!band) return;
    // twinkling only runs while the band is on screen
    new IntersectionObserver(en => band.toggleAttribute('data-live', en[0].isIntersecting), { rootMargin: '10% 0px' }).observe(band);
    if (reduced) return;   // reduced motion: the finished night sky, nothing moves
    const title = $('[data-n-title]', band), moon = $('[data-n-moon]', band);
    const dunes = [1, 2].map(k => $('[data-n-dune="' + k + '"]', band));
    const lerp = (a, b, t) => a + (b - a) * t, ease = t => 1 - Math.pow(1 - t, 3), clamp = t => Math.min(1, Math.max(0, t));
    const travel = [[0.05, 0], [0.13, -0.02]];   // front, back dune: [start, end] offset as a fraction of the band height
    let queued = false;
    const update = () => {
      queued = false;
      const r = band.getBoundingClientRect(), vh = innerHeight, H = r.height;
      const p = clamp((vh - r.top) / (vh + H * 0.35));   // 0: band enters at the bottom; 1: well past the top
      band.style.setProperty('--night', ease(clamp(p / 0.5)).toFixed(3));
      band.style.setProperty('--draw', ease(clamp((p - 0.16) / 0.4)).toFixed(3));
      const rise = ease(clamp(p / 0.62));
      title.style.transform = 'translate3d(0,' + ((1 - rise) * H * 0.34).toFixed(1) + 'px,0)';
      title.style.opacity = (0.15 + 0.85 * rise).toFixed(3);
      moon.style.transform = 'translate3d(0,' + (lerp(0.42, 0, ease(clamp(p / 0.7))) * H).toFixed(1) + 'px,0)';   // rises from behind the dune
      dunes.forEach((d, k) => { if (d) d.style.transform = 'translate3d(0,' + (lerp(travel[k][0], travel[k][1], p) * H).toFixed(1) + 'px,0)'; });
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    new IntersectionObserver(en => {
      if (en[0].isIntersecting) addEventListener('scroll', onScroll, { passive: true }); else removeEventListener('scroll', onScroll);
      onScroll();
    }, { rootMargin: '10% 0px' }).observe(band);
    addEventListener('resize', onScroll, { passive: true });
    update();

    // desktop: the pointer joins the nearest stars, so you draw your own constellation
    if (isTouch) return;
    const lines = $$('[data-n-cursor] line', band), stars = $$('[data-node],[data-tw]', band), REACH = 230;
    let px = 0, py = 0, on = false, raf = 0;
    const draw = () => {
      raf = 0;
      const b = band.getBoundingClientRect();
      const near = stars.map(s => { const q = s.getBoundingClientRect(), x = q.left + q.width / 2 - b.left, y = q.top + q.height / 2 - b.top; return [Math.hypot(x - px, y - py), x, y]; })
        .sort((a, c) => a[0] - c[0]);
      lines.forEach((l, i) => {
        const n = near[i], a = on && n && n[0] < REACH ? 1 - n[0] / REACH : 0;
        if (a > 0) { l.setAttribute('x1', px.toFixed(1)); l.setAttribute('y1', py.toFixed(1)); l.setAttribute('x2', n[1].toFixed(1)); l.setAttribute('y2', n[2].toFixed(1)); }
        l.style.opacity = (a * 0.55).toFixed(3);
      });
    };
    band.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      const b = band.getBoundingClientRect(); px = e.clientX - b.left; py = e.clientY - b.top; on = true;
      if (!raf) raf = requestAnimationFrame(draw);
    });
    band.addEventListener('pointerleave', () => { on = false; if (!raf) raf = requestAnimationFrame(draw); });
  }

  /* ---------- "Open source": letters light up like stars near the pointer, with a few sparks ---------- */
  function initStarTitle() {
    const h = $('[data-starlit]', root); if (!h || reduced) return;
    const text = h.textContent; h.textContent = '';
    const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text;   // what readers and crawlers get
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    // each letter is drawn by CSS from data-c, so the heading's text stays "Open source" once, in the sr-only copy
    const letters = [...text].map(c => { const s = document.createElement('span'); s.className = 'sl'; s.dataset.c = c; vis.appendChild(s); return s; });
    h.append(sr, vis);
    const lum = letters.map(() => 0);
    let cx = [], cy = 0, px = -9999, py = 0, over = false, raf = 0, sx = 0, sy = 0, sparks = 0;
    const measure = () => { const hr = h.getBoundingClientRect(); cx = letters.map(s => { const r = s.getBoundingClientRect(); return r.left + r.width / 2 - hr.left; }); cy = hr.height * 0.5; };
    const loop = () => {
      raf = 0;
      const R = h.offsetHeight * 0.95;
      let busy = over;
      letters.forEach((s, i) => {
        const d = over ? Math.hypot(cx[i] - px, (cy - py) * 0.6) / R : 9, t = Math.max(0, 1 - d), goal = t * t * (3 - 2 * t);
        lum[i] += (goal - lum[i]) * 0.16;
        if (Math.abs(goal - lum[i]) > 0.004) busy = true;
        s.style.setProperty('--l', lum[i].toFixed(3));
      });
      if (busy) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const spark = (x, y) => {
      if (sparks > 6) return; sparks++;
      const s = document.createElement('span'); s.className = 'spk'; s.setAttribute('aria-hidden', 'true');
      s.style.left = x.toFixed(1) + 'px'; s.style.top = y.toFixed(1) + 'px'; s.style.color = Math.random() < 0.6 ? '#fff4e2' : '#ffc887';
      s.addEventListener('animationend', () => { s.remove(); sparks--; }, { once: true });
      h.appendChild(s);
    };
    const at = (x, y) => {
      px = x; py = y; kick();
      if (Math.hypot(x - sx, y - sy) > 44) { sx = x; sy = y; spark(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * h.offsetHeight * 0.5); }
    };
    const local = e => { const r = h.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    h.addEventListener('pointerenter', e => { if (e.pointerType === 'touch') return; measure(); over = true; at(...local(e)); });
    h.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; at(...local(e)); });
    h.addEventListener('pointerleave', () => { over = false; kick(); });
    // touch screens have no hover: a wave of starlight runs across the word once, after it has risen
    if (isTouch) {
      const io = new IntersectionObserver(en => {
        if (!en[0].isIntersecting) return; io.disconnect();
        setTimeout(() => {
          measure(); over = true;
          const w = h.offsetWidth, t0 = performance.now(), dur = 1700;
          const sweep = now => { const p = Math.min(1, (now - t0) / dur); at(-w * 0.15 + w * 1.3 * (p * p * (3 - 2 * p)), cy); if (p < 1) requestAnimationFrame(sweep); else { over = false; kick(); } };
          requestAnimationFrame(sweep);
        }, 450);
      }, { threshold: 0.9 });
      io.observe(h);
    }
  }

  /* ---------- lab: CHIRON's light signature — the outline draws in the dark, the four-LED lamps light pair by pair
     (outer to inner), the horseshoe glows, then the light floods the screen and fades as the film arrives ---------- */
  function initLight() {
    const box = $('[data-lab-light]', root); if (!box) return;
    if (reduced) { box.setAttribute('data-static', ''); return; }   // the lit car, still
    box.setAttribute('data-live', '');
    const leds = [0, 1, 2, 3].map(k => $$('[data-led="' + k + '"]', box));
    const clamp = t => Math.min(1, Math.max(0, t)), ease = t => 1 - Math.pow(1 - t, 3);
    let queued = false, lit = -1;
    const update = () => {
      queued = false;
      const r = box.getBoundingClientRect(), p = clamp(-r.top / Math.max(1, r.height - innerHeight));
      const out = 1 - clamp((p - 0.93) / 0.07);   // the light lets go as the film comes up
      const draw = ease(clamp(p / 0.26)), hs = clamp((p - 0.5) / 0.1), fly = ease(clamp((p - 0.64) / 0.3));
      box.style.setProperty('--draw', draw.toFixed(3));
      box.style.setProperty('--hs', hs.toFixed(3));
      box.style.setProperty('--flood', (ease(clamp((p - 0.6) / 0.25)) * out).toFixed(3));
      box.style.setProperty('--wash', (clamp((p - 0.86) / 0.08) * out * 0.55).toFixed(3));
      let n = 0; while (n < 4 && p >= 0.28 + n * 0.055) n++;
      if (n !== lit) { lit = n; leds.forEach((g, k) => g.forEach(el => el.classList.toggle('on', k < n))); }
      if (window.PortfolioFX) window.PortfolioFX.lab = { draw, led: n, shoe: hs, fly };   // the particle field draws the same scene
    };
    const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
    new IntersectionObserver(en => {
      if (en[0].isIntersecting) addEventListener('scroll', onScroll, { passive: true }); else removeEventListener('scroll', onScroll);
      onScroll();
    }).observe(box);
    addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------- lab: CHIRON's frames scrubbed on a canvas by the scroll, with its chapters and a live readout ---------- */
  function initLab() {
    const track = $('[data-lab-track]', root); if (!track) return;
    const canvas = $('[data-lab-canvas]', track), ctx = canvas && canvas.getContext('2d');
    if (reduced || saveData || !ctx || !window.createImageBitmap) { track.setAttribute('data-static', ''); return; }   // the poster still and the text
    const N = 90, TOTAL = 540, CH = [0, 0.1244, 0.2487, 0.3731, 0.4974, 0.6218, 0.7461, 0.8705, 1];   // chapter starts, as in the film
    const dir = 'assets/lab/' + (innerWidth < 760 ? 's/' : 'l/');
    const poster = $('[data-lab-poster]', track), cue = $('[data-lab-cue]', track);
    const caps = $$('[data-cap]', track), segs = $$('[data-seg]', track), hudS = $('[data-hud="s"]', track), hudF = $('[data-hud="f"]', track);
    const clamp = t => Math.min(1, Math.max(0, t));
    const blobs = [], bmps = new Map(), pending = new Set();
    let smooth = 0, raf = 0, drawn = '', started = false, chapter = -1, onStage = false;

    // coarse to fine, so the whole film can be scrubbed (roughly) after the first few frames arrive
    const order = [];
    for (let step = 16; step >= 1; step >>= 1) for (let i = 0; i < N; i += step) if (!order.includes(i)) order.push(i);
    const load = () => {
      let k = 0;
      const worker = async () => {
        while (k < order.length) {
          const i = order[k++];
          try { const r = await fetch(dir + String(i).padStart(2, '0') + '.webp'); if (r.ok) { blobs[i] = await r.blob(); kick(); } } catch (e) { /* drawn from a neighbour */ }
        }
      };
      for (let w = 0; w < 4; w++) worker();
    };
    // only frames near the playhead are decoded (memory stays small on phones)
    const decode = i => {
      if (i < 0 || i >= N || bmps.has(i) || pending.has(i) || !blobs[i]) return;
      pending.add(i);
      createImageBitmap(blobs[i]).then(b => { pending.delete(i); bmps.set(i, b); kick(); }, () => pending.delete(i));
    };
    const keepNear = c => {
      for (let d = -3; d <= 6; d++) decode(c + d);
      if (bmps.size > 24) for (const [i, b] of bmps) if (Math.abs(i - c) > 10) { if (b.close) b.close(); bmps.delete(i); }
    };
    const nearest = i => { if (bmps.has(i)) return i; for (let d = 1; d < N; d++) { if (bmps.has(i - d)) return i - d; if (bmps.has(i + d)) return i + d; } return -1; };
    // landscape: the frame covers the window. Portrait (phones): covering would show a quarter of a 16:9 frame,
    // so it fills the width and ~60% of the height, over a blurred copy of itself (a 64x36 canvas scaled up)
    const back = $('[data-lab-back]', track), bctx = back && back.getContext('2d');
    let portrait = false;
    const draw = b => {
      const W = canvas.width, H = canvas.height, s = portrait ? Math.max(W / b.width, 0.6 * H / b.height) : Math.max(W / b.width, H / b.height);
      const w = b.width * s, h = b.height * s;
      if (portrait) { ctx.clearRect(0, 0, W, H); if (bctx) bctx.drawImage(b, 0, 0, 64, 36); }
      ctx.drawImage(b, (W - w) / 2, (H - h) / 2, w, h);
    };
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
      portrait = r.height > r.width * 1.05;
      // feather the frame's top and bottom edges into the blurred backdrop
      const edge = portrait ? Math.max(0, 50 - 0.6 * 50 * Math.max(1, (r.width / r.height) * (9 / 16) / 0.6)) : 0;
      const m = portrait ? 'linear-gradient(180deg,transparent ' + edge.toFixed(1) + '%,#000 ' + (edge + 9).toFixed(1) + '%,#000 ' + (100 - edge - 9).toFixed(1) + '%,transparent ' + (100 - edge).toFixed(1) + '%)' : '';
      canvas.style.webkitMaskImage = canvas.style.maskImage = m;
      if (back) back.style.display = portrait ? '' : 'none';
      drawn = ''; kick();
    };
    const progress = () => { const r = track.getBoundingClientRect(); return clamp(-r.top / Math.max(1, r.height - innerHeight)); };

    const frame = () => {
      raf = 0;
      const target = progress();
      smooth += (target - smooth) * 0.22; if (Math.abs(target - smooth) < 0.0004) smooth = target;
      const i = Math.round(smooth * (N - 1));
      keepNear(i);
      const a = nearest(i), key = a + '|' + canvas.width + 'x' + canvas.height;
      if (a >= 0 && key !== drawn) {
        drawn = key; draw(bmps.get(a));
        if (poster.style.opacity !== '0') poster.style.opacity = '0';
      }
      // the same number drives the readout, the captions and the chapter rail
      hudS.textContent = smooth.toFixed(3);
      hudF.textContent = String(Math.round(smooth * (TOTAL - 1)) + 1).padStart(3, '0');
      let ch = 0; while (ch < 7 && smooth >= CH[ch + 1]) ch++;
      if (ch !== chapter) { chapter = ch; segs.forEach((s, k) => s.classList.toggle('on', k === ch)); }
      segs.forEach((s, k) => s.style.setProperty('--f', clamp((smooth - CH[k]) / (CH[k + 1] - CH[k])).toFixed(3)));
      const local = (smooth - CH[ch]) / (CH[ch + 1] - CH[ch]);   // captions sit in the middle of their chapter
      caps.forEach((c, k) => c.classList.toggle('on', k === ch && local > 0.12 && local < 0.88 && smooth > 0.015));
      cue.style.opacity = smooth > 0.02 ? '0' : '1';
      if (smooth !== target) raf = requestAnimationFrame(frame);   // a frame that finishes decoding kicks a redraw itself
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

    // frames start downloading when the film is about a screen and a half away
    const near = new IntersectionObserver(en => { if (en.some(x => x.isIntersecting) && !started) { started = true; near.disconnect(); size(); load(); } }, { rootMargin: '150% 0px' });
    near.observe(track);
    new IntersectionObserver(en => {
      onStage = en[0].isIntersecting;
      if (onStage) addEventListener('scroll', kick, { passive: true }); else removeEventListener('scroll', kick);
      kick();
    }).observe(track);
    addEventListener('resize', () => { if (started) size(); }, { passive: true });
  }

  /* ---------- statement columns: each one types itself out once, with a caret ---------- */
  function initTyping() {
    const box = $('[data-cols]', root); if (!box || reduced) return;
    // split the text into characters only when the columns are half a screen away (keeps startup light)
    const near = new IntersectionObserver(en => { if (en.some(x => x.isIntersecting)) { near.disconnect(); prepareTyping(box); } }, { rootMargin: '50% 0px' });
    near.observe(box);
  }
  function prepareTyping(box) {
    const cols = $$('[data-col]', box).map(col => $$('[data-type]', col).map(p => {
      const text = p.textContent; p.textContent = '';
      const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = text;   // what readers and crawlers get
      const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
      const chars = [...text].map(c => { const s = document.createElement('span'); s.className = 'tc'; s.textContent = c; vis.appendChild(s); return s; });
      p.append(sr, vis);
      return { chars, speed: p === col.firstElementChild ? 38 : 14 };   // label slower, body quick
    }));
    const typeCol = (lines, delay) => setTimeout(() => {
      const caret = document.createElement('span'); caret.setAttribute('data-caret', ''); caret.setAttribute('aria-hidden', 'true');
      let li = 0, ci = 0, last = 0;
      const step = now => {
        const line = lines[li];
        if (now - last >= line.speed) {
          last = now; const c = line.chars[ci++]; c.classList.add('on'); c.after(caret);
          if (ci >= line.chars.length) { li++; ci = 0; if (li >= lines.length) { setTimeout(() => caret.remove(), 1600); return; } }
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay);
    const io = new IntersectionObserver(en => {
      if (!en.some(x => x.isIntersecting)) return; io.disconnect();
      cols.forEach((lines, k) => typeCol(lines, k * 380));
    }, { threshold: 0.35 });
    io.observe(box);
  }

  /* ---------- project glow follows how much of the card is on screen ---------- */
  function initBeams() {
    const arts = $$('[data-proj]', root); if (!arts.length) return;
    const io = new IntersectionObserver(en => en.forEach(x => { x.target.style.setProperty('--lit', Math.min(1, x.intersectionRatio / 0.55).toFixed(2)); }), { threshold: [0, .15, .3, .45, .6, .75, .9, 1] });
    arts.forEach(a => io.observe(a));
  }

  /* ---------- live GitHub numbers ---------- */
  // GitHub allows 60 unauthenticated calls per hour per IP (an office network shares one), so answers are cached
  // for 6 hours and only fetched when the Open source section comes near the screen
  const GH_KEY = 'dp-gh-v1', GH_TTL = 6 * 3600 * 1000;
  async function loadGitHub() {
    const put = (k, v) => $$('[data-gh="' + k + '"]').forEach(el => { el.textContent = v; });
    const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '…';
    const show = (gw, rag, at) => {
      if (gw) { put('gw-stars', gw.stars); put('gw-pushed', 'pushed ' + fmtDate(gw.pushed)); }
      if (rag) { put('rag-stars', rag.stars); put('rag-pushed', 'pushed ' + fmtDate(rag.pushed)); }
      put('updated', new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    };
    try { const c = JSON.parse(localStorage.getItem(GH_KEY) || 'null'); if (c && Date.now() - c.at < GH_TTL) { show(c.gw, c.rag, c.at); return; } } catch (e) { /* storage blocked */ }
    try {
      const pick = j => j ? { stars: j.stargazers_count, pushed: j.pushed_at } : null;
      const [gw, rag] = await Promise.all(['llm-gateway', 'nocturne-RAG'].map(r => fetch('https://api.github.com/repos/Di-ivyanshu/' + r).then(x => x.ok ? x.json() : null).then(pick)));
      const at = Date.now(); show(gw, rag, at);
      if (gw && rag) { try { localStorage.setItem(GH_KEY, JSON.stringify({ gw, rag, at })); } catch (e) { /* storage blocked */ } }
    } catch (e) { /* offline: keep placeholders */ }
  }
  function scheduleGitHub() {
    const oss = document.getElementById('oss'); if (!oss) return;
    const io = new IntersectionObserver(en => { if (en.some(x => x.isIntersecting)) { io.disconnect(); loadGitHub(); } }, { rootMargin: '600px 0px' });
    io.observe(oss);
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
      try { if (window.PortfolioFX.initHero(canvas, null, SECTIONS, { heroAlpha: 0.22, labSvg: $('[data-ll-car]') })) document.documentElement.classList.add('dots'); } catch (e) { /* no WebGL: the page is complete without it */ }
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
    requestAnimationFrame(() => setTimeout(() => {
      initStatement(); initTyping();
      setTimeout(() => { initHorizon(); initWorkTitle(); initBeams(); initFX(); }, 0);
      setTimeout(() => { initNight(); initStarTitle(); initLight(); initLab(); }, 0);
    }, 0));
    afterLoad(loadHeroVideo, isTouch ? 800 : 200);
    afterLoad(scheduleGitHub, 0);
    scheduleThree();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
