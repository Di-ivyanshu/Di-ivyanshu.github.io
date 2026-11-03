/* Portfolio effects: particle hero (three.js), tilt, magnetic, reveal, skills ring, cursor.
   Unused island/robot/image-particle effects removed from the original bundle. */
(function () {
  if (window.PortfolioFX) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const FX = { hero: null };

  const onScreen = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  let pageVisible = !document.hidden; document.addEventListener('visibilitychange', () => { pageVisible = !document.hidden; });
  const debounce = (fn, ms) => { let id; return () => { clearTimeout(id); id = setTimeout(fn, ms); }; };
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  /* ---------- HERO PARTICLES ---------- */
  function sampleText(lines, W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const size = Math.min(W / (Math.max(...lines.map(l => l.length)) * 0.62), H / (lines.length * 1.25));
    ctx.font = `700 ${size}px "Manrope", Helvetica, Arial, sans-serif`;
    const lh = size * 1.12; const y0 = H / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + i * lh));
    const d = ctx.getImageData(0, 0, W, H).data; const pts = [];
    const step = 2;
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      if (d[(y * W + x) * 4] > 128) pts.push([(x - W / 2) / W, -(y - H / 2) / W]);
    }
    return pts;
  }

  /* ---------- PERSISTENT PARTICLE FIELD: morphs per section ---------- */
  function fromPts(pts, N, scale, ox, oy, zs) {
    const a = new Float32Array(N * 3); const M = pts.length;
    for (let i = 0; i < N; i++) { const p = pts[(i * 7919) % M]; a[i*3] = p[0]*scale + ox + (Math.random()-.5)*0.012; a[i*3+1] = p[1]*scale + oy + (Math.random()-.5)*0.012; a[i*3+2] = (Math.random()-.5)*zs; }
    return a;
  }
  function shapeRibbon(N) { const a = new Float32Array(N*3); for (let i=0;i<N;i++){ const x=(Math.random()-.5)*4.4; const t=Math.random(); a[i*3]=x; a[i*3+1]=Math.sin(x*1.6)*0.45+Math.sin(x*4.1+t*6)*0.08+(t-.5)*0.25; a[i*3+2]=(Math.random()-.5)*0.6; } return a; }
  function shapeTorus(N, ox) { const a=new Float32Array(N*3); for(let i=0;i<N;i++){ const u=Math.random()*6.283,v=Math.random()*6.283; const R=1.0,r=0.34+Math.random()*0.04; a[i*3]=(R+r*Math.cos(v))*Math.cos(u)+ox; a[i*3+1]=(R+r*Math.cos(v))*Math.sin(u)*0.75; a[i*3+2]=r*Math.sin(v);} return a; }
  function shapeGraph(N) { const a=new Float32Array(N*3); const C=[]; for(let k=0;k<42;k++) C.push([(Math.random()-.5)*4.2,(Math.random()-.5)*2.2,(Math.random()-.5)*0.8]);
    for(let i=0;i<N;i++){ if(Math.random()<0.55){ const c=C[(Math.random()*C.length)|0]; const r=Math.pow(Math.random(),2)*0.16; const th=Math.random()*6.283; a[i*3]=c[0]+Math.cos(th)*r; a[i*3+1]=c[1]+Math.sin(th)*r; a[i*3+2]=c[2]; } else { const p=C[(Math.random()*C.length)|0], q=C[(Math.random()*C.length)|0]; const t=Math.random(); a[i*3]=p[0]+(q[0]-p[0])*t; a[i*3+1]=p[1]+(q[1]-p[1])*t; a[i*3+2]=p[2]+(q[2]-p[2])*t; } } return a; }
  function shapeSphere(N, ox) { const a=new Float32Array(N*3); for(let i=0;i<N;i++){ const ph=Math.acos(1-2*(i+.5)/N), th=Math.PI*(1+Math.sqrt(5))*i; const r=1.05; a[i*3]=r*Math.sin(ph)*Math.cos(th)+ox; a[i*3+1]=r*Math.sin(ph)*Math.sin(th)*0.9; a[i*3+2]=r*Math.cos(ph);} return a; }
  function shapeHelix(N) { const a=new Float32Array(N*3); for(let i=0;i<N;i++){ const t=(i/N)*6.283*3.2; const x=(i/N-.5)*4.6; const s=i%2?1:-1; a[i*3]=x+(Math.random()-.5)*0.05; a[i*3+1]=Math.sin(t)*0.55*s+(Math.random()-.5)*0.05; a[i*3+2]=Math.cos(t)*0.55*s;} return a; }
  // CHIRON in dots: a low, wide body (side profile spline, tumblehome greenhouse), the C-line on both flanks,
  // horseshoe grille, four-LED headlights, the full-width rear light bar, four spoked wheels and the turntable ring.
  // Drawn mostly as contour lines so the shape reads while it turns. Front towards +x, y up, centred on the origin.
  function shapeChiron(N) {
    const a = new Float32Array(N * 3); let n = 0;
    const S = 0.72;   // overall scale (length 2 * S)
    const put = (x, y, z) => { if (n < N) { a[n*3] = x * S; a[n*3+1] = (y - 0.26) * S; a[n*3+2] = z * S; n++; } };
    const rnd = (lo, hi) => lo + Math.random() * (hi - lo);
    const jit = s => (Math.random() - 0.5) * s;
    const spline = pts => x => { let k = 0; while (k < pts.length - 2 && x > pts[k+1][0]) k++; const [x0, y0] = pts[k], [x1, y1] = pts[k+1], t = Math.min(1, Math.max(0, (x - x0) / (x1 - x0))), s = t * t * (3 - 2 * t); return y0 + (y1 - y0) * s; };
    // side profile, front at +x: low nose, long windscreen, roof peak behind the middle, high truncated tail
    const top = spline([[-1, .29], [-.95, .345], [-.8, .375], [-.55, .43], [-.3, .5], [-.1, .52], [.12, .5], [.32, .42], [.5, .32], [.72, .27], [.9, .23], [1, .17]]);
    const bot = spline([[-1, .12], [-.92, .075], [.92, .07], [1, .1]]);
    const W = x => 0.41 - 0.07 * Math.pow(Math.abs(x), 5);                 // half width, tapering at the ends
    const belt = x => 0.355 + 0.02 * Math.max(0, -x);                         // window line
    const glass = x => x > -0.62 && x < 0.47;                                   // greenhouse span
    // flank bulges at the fender line and tucks in at the sill and the window line; the greenhouse tapers above it
    const hw = (x, y) => { const w = W(x), b = belt(x), t = top(x), lo = bot(x);
      if (glass(x) && y > b && t > b + 0.02) return w * 0.9 * (1 - 0.36 * (y - b) / (t - b));
      const u = Math.min(1, Math.max(0, (y - lo) / Math.max(0.01, b - lo))); return w * (0.88 + 0.12 * Math.sin(Math.PI * Math.pow(u, 0.8))); };
    const wheels = [[0.6, 0.16], [-0.62, 0.16]], R = 0.16;
    const inArch = (x, y) => wheels.some(([wx, wy]) => (x - wx) ** 2 + (y - wy) ** 2 < 0.195 ** 2);
    const sd = () => (Math.random() < 0.5 ? -1 : 1);
    const cnt = f => Math.round(N * f);
    const line = (m, f) => { for (let i = 0; i < m; i++) f(i / m); };

    // shoulder lines (where the flank turns into the top) and the roof spine
    line(cnt(0.12), t => { const x = -1 + 2 * t, y = top(x) - 0.025; put(x, y + jit(0.006), sd() * hw(x, y) * 0.96); });
    line(cnt(0.03), t => { const x = -1 + 2 * t; put(x, top(x) + jit(0.004), jit(0.01)); });
    // sill lines, broken by the wheel arches
    line(cnt(0.05), t => { const x = -0.98 + 1.96 * t, y = bot(x) + 0.012; if (!inArch(x, y)) put(x, y + jit(0.005), sd() * W(x)); });
    // window line and the greenhouse outline (A-pillar, roof edge, rear quarter)
    line(cnt(0.04), t => { const x = -0.62 + 1.09 * t; put(x, belt(x) + jit(0.004), sd() * hw(x, belt(x))); });
    // wheel arches
    line(cnt(0.06), t => { const [wx, wy] = wheels[t < 0.5 ? 0 : 1], ang = (t * 2 % 1) * Math.PI * 1.1 - 0.05 * Math.PI; const x = wx + 0.2 * Math.cos(ang), y = wy + 0.2 * Math.sin(ang); if (y > bot(x)) put(x, y + jit(0.005), sd() * W(x)); });
    // the C-line: a chrome curve behind the doors, opening forwards
    line(cnt(0.09), t => { const ang = 1.0 + t * 4.3, x = 0.1 + 0.42 * Math.cos(ang), y = 0.275 + 0.205 * Math.sin(ang); if (y > bot(x) + 0.01 && y < top(x) - 0.012) put(x + jit(0.006), y + jit(0.006), sd() * (hw(x, y) + 0.008)); });
    // cross-section ribs, so the volume reads as it turns
    const ribs = [-0.8, -0.35, 0.15, 0.62];
    line(cnt(0.06), t => {
      const x = ribs[Math.floor(t * ribs.length) % ribs.length] + jit(0.008), b = bot(x), tp = top(x), u = Math.random();
      if (u < 0.5) { const y = b + (tp - b) * Math.random(); if (!inArch(x, y)) put(x, y, sd() * hw(x, y)); }
      else { const zz = rnd(-1, 1); put(x, tp - 0.04 * Math.pow(Math.abs(zz), 4), zz * hw(x, tp) * 0.97); }
    });
    // light surface fill
    for (let i = 0, m = cnt(0.16); i < m;) {
      const x = rnd(-1, 1);
      if (Math.random() < 0.55) { const y = rnd(bot(x), top(x)); if (inArch(x, y)) continue; put(x, y, sd() * hw(x, y)); }
      else { const zz = rnd(-1, 1), tp = top(x); put(x, tp - 0.04 * Math.pow(Math.abs(zz), 4), zz * hw(x, tp) * 0.97); }
      i++;
    }
    // horseshoe grille and the four-LED headlights at the nose; the full-width light bar at the tail
    line(cnt(0.025), t => { const ang = -0.5 + t * (Math.PI + 1), r = 1 + jit(0.06); put(1.0, 0.145 + 0.07 * Math.sin(ang) * r, 0.06 * Math.cos(ang) * r); });
    line(cnt(0.03), t => { const k = Math.floor(t * 8) % 4, s = t < 0.5 ? 1 : -1; put(0.95 + jit(0.01), 0.21 + jit(0.014), s * (0.19 + k * 0.045 + jit(0.012))); });
    line(cnt(0.025), t => put(-1.0, 0.3 + jit(0.008), -0.36 + 0.72 * t));
    // wheels: tyre, rim and ten spokes on the outer face
    line(cnt(0.16), t => {
      const [wx, wy] = wheels[Math.floor(t * 4) % 2], s = Math.floor(t * 2) ? 1 : -1, z = s * (W(wx) - 0.02), part = Math.random(), ang = rnd(0, 6.283);
      if (part < 0.42) { const r = R + jit(0.016); put(wx + r * Math.cos(ang), wy + r * Math.sin(ang), z + jit(0.09)); }
      else if (part < 0.6) put(wx + 0.115 * Math.cos(ang), wy + 0.115 * Math.sin(ang), z + s * 0.035);
      else { const sp = Math.floor(rnd(0, 10)) * 0.6283 + jit(0.05), r = rnd(0.025, 0.112); put(wx + r * Math.cos(sp), wy + r * Math.sin(sp), z + s * 0.04); }
    });
    // turntable ring on the floor
    while (n < N) { const ang = rnd(0, 6.283), r = Math.random() < 0.75 ? 1.12 + jit(0.02) : rnd(0.3, 1.08); put(r * Math.cos(ang), 0.0, r * Math.sin(ang)); }
    return a;
  }
  // uniform scale (all three axes, the car turns) to fit a width
  function fitUniform(a, maxW) {
    let minX = 1e9, maxX = -1e9; for (let i = 0; i < a.length; i += 3) { minX = Math.min(minX, a[i]); maxX = Math.max(maxX, a[i]); }
    const s = maxW / ((maxX - minX) || 1), o = new Float32Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] * s; return o;
  }
  function shapeScatter(N) { const a=new Float32Array(N*3); for(let i=0;i<N;i++){ const r=1.6+Math.random()*2.2, th=Math.random()*6.283, ph=Math.acos(2*Math.random()-1); a[i*3]=r*Math.sin(ph)*Math.cos(th); a[i*3+1]=r*Math.sin(ph)*Math.sin(th)*0.6; a[i*3+2]=r*Math.cos(ph)-1.5;} return a; }

  // portrait phones: turn a wide landscape shape into a tall one (swap axes) and fit it into the visible column
  function toPortrait(a, maxW, maxH, stretch) {
    const n = a.length / 3; const o = new Float32Array(a.length); let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let i = 0; i < n; i++) { const x = a[i*3+1], y = -a[i*3]; o[i*3] = x; o[i*3+1] = y; o[i*3+2] = a[i*3+2]; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    const w = maxX - minX || 1, h = maxY - minY || 1, cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const sy = Math.min(maxH / h, maxW / w), sx = Math.min(maxW / w, sy * (stretch || 1));
    for (let i = 0; i < n; i++) { o[i*3] = (o[i*3] - cx) * sx; o[i*3+1] = (o[i*3+1] - cy) * sy; }
    return o;
  }
  function fitPortrait(a, maxW, maxH) { // no axis swap, uniform fit (spheres, tori)
    const n = a.length / 3; const o = new Float32Array(a.length); let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let i = 0; i < n; i++) { const x = a[i*3], y = a[i*3+1]; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    const s = Math.min(maxW / ((maxX - minX) || 1), maxH / ((maxY - minY) || 1)), cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    for (let i = 0; i < n; i++) { o[i*3] = (a[i*3] - cx) * s; o[i*3+1] = (a[i*3+1] - cy) * s; o[i*3+2] = a[i*3+2]; }
    return o;
  }

  FX.initHero = function (canvas, lines, sectionIds, opts) {
    if (!window.THREE || !canvas) return;
    opts = opts || {};
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100); camera.position.z = 2.6;
    const N = isTouch ? 3800 : 6000;
    const heroShape = lines ? fromPts(sampleText(lines, 960, 360), N, opts.heroScale || 2.3, opts.heroX || 0, opts.heroY || 0, 0.06) : shapeSphere(N, opts.heroX || 0);
    const byeTxt = fromPts(sampleText(['SAY HI'], 960, 300), N, 2.0, 0, 0.2, 0.06);
    const ribbon = shapeRibbon(N), torus = shapeTorus(N, 0), graph = shapeGraph(N), helix = shapeHelix(N), car = shapeChiron(N);
    // sections: hero, statement, work, open source, lab (the dots become CHIRON), lab film (the car waits behind it), skills, contact
    const CAR = 4;
    const targetsL = [heroShape, ribbon, torus, graph, car, car, helix, byeTxt];
    // portrait set: visible column at camera z=4.2 is ~1.2 wide × 2.6 tall — vertical ribbon/helix/graph, torus filling the width, "SAY HI" on two lines
    const PW = 1.15, PH = 2.5, carP = fitUniform(car, PW * 1.05);
    const targetsP = [fitPortrait(heroShape, PW, PH * 0.7), toPortrait(ribbon, PW, PH, 1.7), fitPortrait(torus, PW, PH), toPortrait(graph, PW, PH, 1), carP, carP, toPortrait(helix, PW, PH, 1.4), fromPts(sampleText(['SAY', 'HI'], 960, 640), N, 1.15, 0, 0, 0.06)];
    let targets = targetsL, portraitMode = false;
    const alphas = [opts.heroAlpha == null ? 0.95 : opts.heroAlpha, 0.3, 0.28, 0.32, 0.85, 0.45, 0.42, 0.9].map(a => isTouch ? Math.min(1, a * 1.25) : a);
    // how far each section's dots lean toward the accent colour (hero grey → work/oss coloured → CHIRON fully orange → contact back to ink)
    const tints = [0.0, 0.35, 0.75, 0.55, 1.0, 0.9, 0.6, 0.2];
    const scatter = shapeScatter(N);
    const rnd = new Float32Array(N); for (let i = 0; i < N; i++) rnd[i] = Math.random();
    const geo = new THREE.BufferGeometry();
    const attrA = new THREE.BufferAttribute(new Float32Array(N*3), 3), attrB = new THREE.BufferAttribute(new Float32Array(N*3), 3);
    geo.setAttribute('position', attrA); geo.setAttribute('aB', attrB);
    geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
    const uniforms = {
      uIntro: { value: 0 }, uMix: { value: 0 }, uTime: { value: 0 }, uAlpha: { value: 1 }, uMouse: { value: new THREE.Vector3(9, 9, 0) },
      uColor: { value: new THREE.Color(cssVar('--ink') || '#111') }, uAccent: { value: new THREE.Color(cssVar('--accent') || '#2f5cff') },
      uPx: { value: renderer.getPixelRatio() }, uSize: { value: 1 }, uTint: { value: 0 }
    };
    const mat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false,
      vertexShader: `
        attribute vec3 aB, aScatter; attribute float aRnd;
        uniform float uIntro, uMix, uTime, uPx, uSize; uniform vec3 uMouse;
        varying float vA; varying float vR;
        void main(){
          float m = smoothstep(0.0, 1.0, clamp(uMix * 1.3 - aRnd * 0.3, 0.0, 1.0));
          vec3 shape = mix(position, aB, m);
          shape.z += sin(m * 3.1416) * 0.5 * (aRnd - 0.5);
          float p = smoothstep(0.0, 1.0, clamp(uIntro * 1.15 - aRnd * 0.15, 0.0, 1.0));
          vec3 pos = mix(aScatter, shape, p);
          pos.x += sin(uTime * 0.8 + aRnd * 6.283) * 0.006 * (1.0 + (1.0 - p) * 8.0);
          pos.y += cos(uTime * 0.7 + aRnd * 6.283) * 0.006 * (1.0 + (1.0 - p) * 8.0);
          vec2 d = pos.xy - uMouse.xy; float dist = length(d);
          float push = smoothstep(0.34, 0.0, dist) * 0.22;
          pos.xy += normalize(d + 0.0001) * push; pos.z += push * 0.6;
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (1.4 + aRnd * 1.2 + push * 6.0) * uPx * uSize * (2.6 / -mv.z);
          vA = 0.55 + 0.45 * p; vR = push;
        }`,
      fragmentShader: `
        precision mediump float; uniform vec3 uColor, uAccent; uniform float uAlpha, uTint; varying float vA; varying float vR;
        void main(){
          vec2 c = gl_PointCoord - 0.5; if (dot(c,c) > 0.25) discard;
          vec3 base = mix(uColor, uAccent, uTint * (0.35 + 0.65 * vA));
          gl_FragColor = vec4(mix(base, uAccent, clamp(vR * 4.0, 0.0, 1.0)), vA * uAlpha);
        }`
    });
    const points = new THREE.Points(geo, mat); scene.add(points);
    let seg = -1;
    function setSeg(i) { if (i === seg) return; seg = i; attrA.array.set(targets[i]); attrB.array.set(targets[Math.min(i+1, targets.length-1)]); attrA.needsUpdate = true; attrB.needsUpdate = true; }
    setSeg(0);
    const st = { rotX: 0, rotY: 0, tRotX: 0, tRotY: 0, drag: null, vel: 0, start: performance.now(), mix: 0, alpha: 1, tint: 0, spin: null, tilt: 0 };
    function resize() { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      const portrait = w < h; camera.position.z = w < 700 ? 4.2 : 2.6; uniforms.uSize.value = portrait ? 1.15 : 1;
      if (portrait !== portraitMode) { portraitMode = portrait; targets = portrait ? targetsP : targetsL; const s = seg; seg = -1; setSeg(Math.max(0, s)); } }
    resize(); addEventListener('resize', debounce(resize, 100));
    const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
    function toWorld(cx, cy) {
      if (!canvasVisible) return;
      const r = canvas.getBoundingClientRect();
      const v = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(v, camera); ray.ray.intersectPlane(plane, hit);
      uniforms.uMouse.value.set(hit.x, hit.y, 0);
      if (!isTouch) { st.tRotY = v.x * 0.18; st.tRotX = -v.y * 0.12; }
    }
    if (!isTouch) addEventListener('pointermove', e => { if (st.drag) { st.vel = (e.clientX - st.drag) * 0.004; st.tRotY += st.vel; st.drag = e.clientX; } toWorld(e.clientX, e.clientY); }, { passive: true });
    addEventListener('pointerdown', e => { if (isTouch) return; if (e.target.closest && e.target.closest('a,button,input,textarea,[data-ring]')) return; st.drag = e.clientX; toWorld(e.clientX, e.clientY); });
    addEventListener('pointerup', () => { st.drag = null; });
    document.addEventListener('pointerleave', () => uniforms.uMouse.value.set(9, 9, 0));
    let tMix = 0, tAlpha = 1, tTint = 0, scrollRot = 0, secs = [], scrollQueued = false, local = 0;
    const cacheSecs = () => { secs = sectionIds.map(id => document.getElementById(id)).filter(Boolean); };
    function onScroll() {
      if (!secs.length) cacheSecs(); if (!secs.length) return;
      const y = scrollY + innerHeight * 0.45;
      // page offsets, not offsetTop: some anchors (the Lab ones) sit inside a positioned section
      const tops = secs.map(s => s.getBoundingClientRect().top + scrollY);
      let i = 0; for (let k = 0; k < tops.length; k++) if (tops[k] <= y) i = k;
      const top = tops[i], next = tops[i + 1] != null ? tops[i + 1] : top + innerHeight;
      local = Math.min(1, Math.max(0, (y - top) / Math.max(1, next - top)));
      if (i !== seg) { setSeg(i); st.mix = local < 0.5 ? 0 : st.mix; }
      tMix = Math.min(1, Math.max(0, (local - 0.6) / 0.4));
      tAlpha = alphas[i] + (alphas[Math.min(i+1, alphas.length-1)] - alphas[i]) * tMix;
      tTint = tints[i] + (tints[Math.min(i+1, tints.length-1)] - tints[i]) * tMix;
      scrollRot = scrollY * 0.0006;
    }
    const queueScroll = () => { if (scrollQueued) return; scrollQueued = true; requestAnimationFrame(() => { scrollQueued = false; onScroll(); }); };
    addEventListener('scroll', queueScroll, { passive: true }); addEventListener('resize', debounce(() => { cacheSecs(); onScroll(); }, 120)); setTimeout(cacheSecs, 500); onScroll();
    let canvasVisible = true; new IntersectionObserver(en => { canvasVisible = en[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
    function frame(now) {
      if (!canvasVisible || !pageVisible) { requestAnimationFrame(frame); return; }
      const t = (now - st.start) / 1000;
      uniforms.uIntro.value = reduced ? 1 : Math.min(1, t / 2.4);
      st.mix += (tMix - st.mix) * 0.08; st.alpha += (tAlpha - st.alpha) * 0.08; st.tint += (tTint - st.tint) * 0.05;
      if (!st.drag) { st.vel *= 0.94; st.tRotY += st.vel; }
      st.rotY += (st.tRotY - st.rotY) * 0.06; st.rotX += (st.tRotX - st.rotX) * 0.06;
      // CHIRON turns on its turntable with the scroll (three-quarter front → side → three-quarter rear), seen from a little above;
      // every other middle shape keeps its slow drift
      const carW = seg === CAR - 1 ? st.mix : seg === CAR ? 1 : seg === CAR + 1 ? 1 - st.mix : 0;
      let goal;
      if ((seg === CAR - 1 && tMix > 0) || seg === CAR || seg === CAR + 1) goal = reduced ? -0.55 : seg === CAR - 1 ? -0.7 : seg === CAR ? -0.7 + 1.9 * local : 1.2 + 0.25 * local;
      else goal = (seg > 0 && seg < targets.length - 1) ? scrollRot + t * 0.05 : 0;
      if (st.spin == null) st.spin = goal;
      goal += 6.2832 * Math.round((st.spin - goal) / 6.2832);   // aim for the nearest turn, so a shape never unwinds
      st.spin += (goal - st.spin) * 0.07;
      st.tilt += (carW * 0.14 - st.tilt) * 0.06;
      points.rotation.set(st.rotX + st.tilt, st.rotY + st.spin, 0);
      uniforms.uMix.value = st.mix; uniforms.uTime.value = t; uniforms.uAlpha.value = st.alpha; uniforms.uTint.value = st.tint;
      renderer.render(scene, camera); requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    const handle = { setTheme() { uniforms.uColor.value.set(cssVar('--ink')); uniforms.uAccent.value.set(cssVar('--accent')); } };
    FX.hero = handle; window.__dpHeroHandle = handle; return handle;
  };

  /* ---------- TILT (3D cards) ---------- */
  FX.initTilt = function (root) {
    if (isTouch || reduced) return;
    root.querySelectorAll('[data-tilt]:not([data-tilt-ready])').forEach(el => {
      el.dataset.tiltReady = '1';
      const inner = el.querySelector('[data-tilt-inner]') || el;
      el.style.perspective = '1200px';
      let pend = null;
      el.addEventListener('pointermove', e => { if (pend) { pend = e; return; } pend = e; requestAnimationFrame(() => { const ev = pend; pend = null;
        const r = el.getBoundingClientRect(); const x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
        inner.style.transition = 'transform .08s linear';
        inner.style.transform = `rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateZ(0)`;
        el.style.setProperty('--gx', (x * 100 + 50) + '%'); el.style.setProperty('--gy', (y * 100 + 50) + '%'); }); }, { passive: true });
      el.addEventListener('pointerleave', () => { inner.style.transition = 'transform .6s cubic-bezier(.2,.8,.2,1)'; inner.style.transform = 'rotateX(0) rotateY(0)'; });
    });
  };

  /* ---------- MAGNETIC ---------- */
  FX.initMagnetic = function (root) {
    if (isTouch || reduced) return;
    root.querySelectorAll('[data-magnetic]:not([data-mag-ready])').forEach(el => { el.dataset.magReady = '1';
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(); const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        el.style.transition = 'transform .1s'; el.style.transform = `translate(${x * 0.28}px, ${y * 0.28}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1)'; el.style.transform = 'translate(0,0)'; });
    });
  };

  /* ---------- REVEAL ON SCROLL ---------- */
  FX.initReveal = function (root) {
    const els = root.querySelectorAll('[data-reveal]:not([data-reveal-ready])'); els.forEach(el => el.dataset.revealReady = '1');
    if (reduced) { els.forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; el.style.clipPath = 'none'; }); return; }
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return; const el = en.target; const d = +el.dataset.reveal || 0;
      el.style.transition = `opacity .9s cubic-bezier(.2,.8,.2,1) ${d}ms, transform 1s cubic-bezier(.2,.8,.2,1) ${d}ms, clip-path 1s cubic-bezier(.2,.8,.2,1) ${d}ms`;
      // the clip opens well past the box (card glows spill outside it), then goes away, so no glow is cut off square
      el.style.opacity = 1; el.style.transform = 'translateY(0)'; el.style.clipPath = 'inset(-160px -160px -160px -160px)'; io.unobserve(el);
      setTimeout(() => { el.style.clipPath = 'none'; }, d + 1100);
    }), { threshold: 0.12 });
    els.forEach(el => { el.style.opacity = 0; el.style.transform = 'translateY(28px)'; el.style.clipPath = 'inset(-160px -160px 12% -160px)'; io.observe(el); });
  };

  /* ---------- PARALLAX MEDIA ---------- */
  FX.initParallax = function (root) {
    if (reduced) return;
    const els = [...root.querySelectorAll('[data-parallax]:not([data-par-ready])')]; els.forEach(el => el.dataset.parReady = '1'); if (!els.length) return;
    let q = false;
    function tick() {
      q = false; const vh = innerHeight;
      els.forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return; const c = (r.top + r.height / 2 - vh / 2) / vh; el.style.transform = `translateY(${c * -(+el.dataset.parallax || 30)}px) scale(1.08)`; });
    }
    addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(tick); } }, { passive: true }); requestAnimationFrame(tick);   // first read in a frame, not a forced layout
  };

  /* ---------- SKILLS RING (CSS 3D, draggable) ---------- */
  FX.initRing = function (ring) {
    if (!ring) return;
    const items = [...ring.children]; const n = items.length;
    // radius must give every label room: circumference / n >= label width, otherwise names overlap on narrow screens
    const R = () => { const w = ring.clientWidth; const per = w < 760 ? 132 : 190; return Math.max(Math.min(w, 720) * 0.62, n * per / (2 * Math.PI)); };
    let rot = 0, vel = 0.12, drag = null;
    function layout() { items.forEach((it, i) => { it.style.transform = `rotateY(${(360 / n) * i}deg) translateZ(${R()}px)`; }); }
    layout(); addEventListener('resize', debounce(layout, 120));
    ring.addEventListener('pointerdown', e => { drag = e.clientX; vel = 0; ring.style.cursor = 'grabbing'; });
    addEventListener('pointermove', e => { if (drag == null) return; vel = (e.clientX - drag) * 0.25; rot += vel; drag = e.clientX; }, { passive: true });
    addEventListener('pointerup', () => { drag = null; ring.style.cursor = 'grab'; });
    ring.style.willChange = 'transform'; items.forEach(it => { it.style.willChange = 'opacity'; });
    let vis = false; new IntersectionObserver(en => { vis = en[0].isIntersecting; }, { threshold: 0 }).observe(ring);
    function frame() {
      if (!vis || !pageVisible) { requestAnimationFrame(frame); return; }
      if (drag == null) { vel += (Math.sign(vel || 1) * 0.12 - vel) * 0.02; rot += vel; }
      ring.style.transform = `rotateX(-8deg) rotateY(${rot}deg)`;
      items.forEach((it, i) => {
        const a = (((360 / n) * i + rot) % 360 + 360) % 360; const front = Math.cos(a * Math.PI / 180);
        const k = (front + 1) / 2; it.style.opacity = 0.08 + 0.92 * k * k;
      });
      requestAnimationFrame(frame);
    }
    if (!reduced) requestAnimationFrame(frame); else ring.style.transform = 'rotateX(-8deg)';
  };

  /* ---------- CURSOR ---------- */
  FX.initCursor = function (dot) {
    if (isTouch || reduced || !dot) { if (dot) dot.style.display = 'none'; return; }
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, big = false, running = false;
    dot.style.willChange = 'transform';
    function f() { x += (tx - x) * 0.18; y += (ty - y) * 0.18; dot.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) scale(${big ? 3.2 : 1})`; dot.style.opacity = big ? 0.35 : 1;
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.3) requestAnimationFrame(f); else running = false; }
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; const t = e.target.closest && e.target.closest('a,button,[data-tilt],[data-cursor]'); big = !!t; if (!running) { running = true; requestAnimationFrame(f); } }, { passive: true });
  };


  FX.initAll = function (root) { FX.initTilt(root); FX.initMagnetic(root); FX.initReveal(root); FX.initParallax(root); };
  window.PortfolioFX = FX;
})();
