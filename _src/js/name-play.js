/* Name play: decode-in on load, a living "i", and a pixel mascot that peeks out when the name is tapped. */
(function () {
  if (window.NamePlay) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GLYPHS = '#%&*+=<>?/\\|[]{}0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  // 12x12 pixel bot, drawn from strings: . empty, b body, e eye, a accent (antenna light / mouth), w wave-hand
  const BOT = [
    '.....a......',
    '.....b......',
    '..bbbbbbbb..',
    '.bbbbbbbbbb.',
    '.bbeebbbeeb.',
    '.bbeebbbeeb.',
    '.bbbbbbbbbb.',
    '.bbbaaaabbb.',
    '..bbbbbbbb..',
    'w..bbbbbb..w',
    'ww.bbbbbb.ww',
    '...bb..bb...'
  ];
  const BOT_WAVE = BOT.map((r, i) => i === 8 ? 'w.bbbbbbbb..' : i === 9 ? 'ww.bbbbbb...' : i === 10 ? '...bbbbbb.ww' : r);

  function botSVG(frame, px) {
    const rows = frame === 'wave' ? BOT_WAVE : BOT; const s = px || 5;
    const col = { b: '#ece9e1', e: '#0b0b0e', a: '#ff7a3d', w: '#ece9e1' };
    let out = `<rect x="${s}" y="${2 * s}" width="${10 * s}" height="${7 * s}" fill="#0b0b0e"/>`;
    rows.forEach((row, y) => [...row].forEach((c, x) => { if (c !== '.') out += `<rect x="${x * s}" y="${y * s}" width="${s}" height="${s}" fill="${col[c]}"/>`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${12 * s}" height="${12 * s}" viewBox="0 0 ${12 * s} ${12 * s}" shape-rendering="crispEdges" style="display:block">${out}</svg>`;
  }

  window.NamePlay = function (h1, opts) {
    if (!h1) return; opts = opts || {};
    const span = h1.querySelector('[data-name-visual]') || h1.querySelector('span') || h1;
    const name = span.textContent.trim();
    span.textContent = ''; span.style.animation = 'none'; span.style.opacity = 1;
    h1.style.overflow = 'visible'; h1.style.position = 'relative'; h1.style.cursor = 'pointer'; h1.style.userSelect = 'none'; h1.style.webkitTapHighlightColor = 'transparent';
    // SEO + a11y: the heading keeps its real text ("Divyanshu") in a visually hidden span; the animated
    // letters below are drawn with CSS generated content ([data-g]::before) inside an aria-hidden span,
    // so neither crawlers nor screen readers ever see the scrambled glyphs, the dotless ı or the extra n stem.
    if (span !== h1) {
      const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = name;
      h1.insertBefore(sr, span); span.setAttribute('aria-hidden', 'true');
    }
    const host = h1.closest('[data-name-wrap]') || h1;   // the mascot lives beside the heading, not inside it

    // letters
    const letters = [...name].map(ch => {
      const s = document.createElement('span');
      s.dataset.ch = ch;
      s.style.cssText = 'display:inline-block;position:relative;transition:transform .5s cubic-bezier(.2,.8,.2,1),color .4s';
      const g = document.createElement('span'); g.dataset.glyph = '1'; g.dataset.g = reduced ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]; s.appendChild(g); s.glyph = g;
      span.appendChild(s); return s;
    });

    // 4. decode: each letter scrambles then settles, left to right
    if (!reduced) {
      const t0 = performance.now();
      const settle = letters.map((_, i) => 420 + i * 95 + Math.random() * 120); let done = 0, lastSwap = 0;
      letters.forEach(el => el.style.opacity = 0.35);
      const tick = now => {
        const t = now - t0; const swap = now - lastSwap > 45; if (swap) lastSwap = now;   // glyph swaps at ~22fps read better than 60 and cost a third
        letters.forEach((el, i) => {
          if (el.settled) return;
          if (t < settle[i]) { if (swap) el.glyph.dataset.g = GLYPHS[(Math.random() * GLYPHS.length) | 0]; el.style.opacity = 0.35 + 0.5 * (t / settle[i]); }
          else { el.settled = true; done++; el.glyph.dataset.g = el.dataset.ch; el.style.opacity = 1; el.style.transform = 'translateY(-6px)'; setTimeout(() => el.style.transform = '', 220); }
        });
        if (done < letters.length) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // 2. living "i": the dot blinks and occasionally glances
    // living "i": the glyph becomes dotless (ı) and our accent dot is the only dot — it blinks and occasionally glances
    let live = true; new IntersectionObserver(en => { live = en[0].isIntersecting; }, { threshold: 0 }).observe(h1);
    const active = () => live && !document.hidden;
    const debounce = (fn, ms) => { let id; return () => { clearTimeout(id); id = setTimeout(fn, ms); }; };
    const iEl = letters.find(l => l.dataset.ch === 'i');
    let dot = null;
    if (iEl && !reduced) {
      iEl.dataset.ch = 'ı'; iEl.glyph.dataset.g = 'ı';
      const placeDot = () => {
        const fs = parseFloat(getComputedStyle(h1).fontSize);
        if (!dot) { dot = document.createElement('span'); dot.setAttribute('aria-hidden', 'true'); iEl.appendChild(dot); }
        // measure the stem: dot sits centred above the ı, one dot-width up
        const gr = iEl.glyph.getBoundingClientRect(), ir = iEl.getBoundingClientRect();
        const d = Math.max(4, fs * 0.11);
        dot.style.cssText = `position:absolute;left:${gr.left - ir.left + gr.width / 2 - d / 2 + fs * 0.02}px;top:${fs * 0.25}px;width:${d}px;height:${d}px;border-radius:2px;background:#fff;box-shadow:0 0 ${d}px rgba(255,255,255,.5);transform-origin:center;transition:transform .12s;pointer-events:none`;
      };
      document.fonts.ready.then(() => setTimeout(placeDot, 1600)); addEventListener('resize', debounce(placeDot, 120));
      let glance = 0;
      const blink = () => { if (!dot || !active()) return; dot.style.transform = 'scaleY(.15)'; setTimeout(() => dot.style.transform = `translateX(${glance}px)`, 120); };
      setInterval(() => { if (Math.random() < 0.7) blink(); }, 2600);
      setInterval(() => { if (!dot || !active()) return; const fs = parseFloat(getComputedStyle(h1).fontSize); glance = (Math.random() - 0.5) * fs * 0.12; dot.style.transition = 'transform .35s cubic-bezier(.2,.8,.2,1)'; dot.style.transform = `translateX(${glance}px)`; setTimeout(() => { glance = 0; dot.style.transform = ''; }, 1400); }, 7000);
    }

    // 3. mascot: tap the name → bot climbs up from behind the letters, waves, says a line
    const lines = opts.lines || ['everyone says chai with code. I want the whole pizza — the agents can do the typing.', 'chai with code? nah. finish your meal. the AI’s on shift.', 'what’s your why? mine: ship things that actually do the work.', 'rules first, model second. every claim has a source.', 'scroll down. the work is real.'];
    let bot = null, busy = false, lineIdx = 0;
    function summon() {
      if (busy || !live) return; busy = true;
      const fs = parseFloat(getComputedStyle(h1).fontSize); const px = Math.max(4, Math.round(fs / 22));
      if (!bot) {
        bot = document.createElement('div'); bot.setAttribute('aria-hidden', 'true');
        bot.style.cssText = 'position:absolute;left:50%;bottom:62%;z-index:3;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none;transform:translate(-50%,120%);opacity:0;transition:transform .55s cubic-bezier(.34,1.56,.64,1),opacity .3s';
        bot.innerHTML = `<div data-bubble style="font-family:'JetBrains Mono',monospace;font-size:clamp(11px,1.3vw,13px);letter-spacing:.02em;color:#0b0b0e;background:#fff;padding:8px 12px;border-radius:12px 12px 12px 3px;max-width:min(240px,64vw);text-align:left;text-wrap:pretty;line-height:1.35;box-shadow:0 8px 30px rgba(0,0,0,.4);opacity:0;transform:translateY(6px);transition:opacity .3s .35s,transform .3s .35s"></div><div data-sprite style="filter:drop-shadow(0 4px 10px rgba(0,0,0,.6))"></div>`;
        if (host !== h1) host.style.position = 'relative';
        host.appendChild(bot);
      }
      const sprite = bot.querySelector('[data-sprite]'), bubble = bot.querySelector('[data-bubble]');
      // sit the bot on the "y" if there is one, else centre
      const anchor = letters.find(l => l.dataset.ch === 'y') || letters[Math.floor(letters.length / 2)];
      const hr = host.getBoundingClientRect(), ar = anchor.getBoundingClientRect();
      bot.style.left = (ar.left + ar.width / 2 - hr.left) + 'px';
      bubble.textContent = lines[lineIdx++ % lines.length];
      sprite.innerHTML = botSVG('idle', px);
      // letters duck a little to make room
      letters.forEach((l, i) => { l.style.transform = `translateY(${Math.abs(i - letters.indexOf(anchor)) < 2 ? 6 : 2}px)`; });
      requestAnimationFrame(() => { bot.style.opacity = 1; bot.style.transform = 'translate(-50%,0)'; bubble.style.opacity = 1; bubble.style.transform = 'none'; });
      let waves = 0; const wave = setInterval(() => { sprite.innerHTML = botSVG(waves++ % 2 ? 'idle' : 'wave', px); }, 260);
      setTimeout(() => {
        clearInterval(wave); sprite.innerHTML = botSVG('idle', px);
        bubble.style.transition = 'opacity .25s,transform .25s'; bubble.style.opacity = 0; bubble.style.transform = 'translateY(6px)';
        bot.style.transform = 'translate(-50%,120%)'; bot.style.opacity = 0;
        letters.forEach(l => l.style.transform = '');
        setTimeout(() => { busy = false; bubble.style.transition = 'opacity .3s .35s,transform .3s .35s'; }, 600);
      }, 3600);
    }
    h1.addEventListener('click', summon);
    // "an" → "ai": tint the a, and paint the n's left stem accent so the two read as AI inside the name
    const aEl = letters.find((l, i) => l.dataset.ch === 'a' && letters[i + 1] && letters[i + 1].dataset.ch === 'n');
    const nEl = aEl && letters[letters.indexOf(aEl) + 1];
    if (aEl && nEl) {
      let stem = null;
      const paintAI = () => {
        aEl.style.color = 'var(--accent)'; aEl.style.textShadow = '0 0 18px color-mix(in srgb,var(--accent) 60%,transparent)';
        const gr = nEl.glyph.getBoundingClientRect(), nr = nEl.getBoundingClientRect();
        if (!stem) { stem = document.createElement('span'); stem.setAttribute('aria-hidden', 'true'); stem.dataset.g = 'n'; nEl.appendChild(stem); }
        // accent copy of the n, clipped to its left stem (first ~27% of the glyph) so it reads as an "i"
        stem.style.cssText = `position:absolute;left:${gr.left - nr.left}px;top:0;width:${gr.width * 0.27}px;height:100%;overflow:hidden;white-space:pre;color:var(--accent);text-shadow:0 0 18px color-mix(in srgb,var(--accent) 60%,transparent);pointer-events:none;opacity:0;transition:opacity .8s`;
        requestAnimationFrame(() => { stem.style.opacity = 1; });
      };
      const t = reduced ? 0 : 2200; setTimeout(() => document.fonts.ready.then(paintAI), t); addEventListener('resize', debounce(() => stem && paintAI(), 120));
    }
    // (no role="button"/tabindex on the heading: it stays a plain h1 for SEO and a11y; the mascot is a pointer easter egg)
    // first-visit hint: the bot peeks once by itself after the decode settles
    if (!reduced && !sessionStorage.getItem('dp-bot-peeked')) { setTimeout(() => { summon(); sessionStorage.setItem('dp-bot-peeked', '1'); }, 2600); }
    return { summon };
  };
})();
