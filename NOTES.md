# Deploy notes

`index.html` and `resume.html` are **static, pre-rendered HTML** built from the original Claude Design
templates in `_src/templates/`. Folders starting with `_` are not published by GitHub Pages (Jekyll).

Rebuild after changing anything in `_src/`:

```sh
sh _src/build/build.sh          # needs Python 3 + esbuild (npx)
```

- `_src/build/build_index.py` — template → `index.html` (SEO head, JSON-LD, self-hosted fonts, lazy media)
- `_src/build/build_resume.py` — template → `resume.html`
- `_src/js/app.js` — page logic (plain-JS port of the old dc/React component)
- `_src/js/name-play.js`, `_src/js/fx.js` — name animation and effects; bundled into `assets/js/site.min.js`
- three.js (`assets/js/vendor/three.min.js`) loads only after first interaction (desktop: also after idle)
- hero: `assets/dune-poster-*.webp` is the first paint; `dune-1280.mp4` / `dune-540p.mp4` (sunset grade of the
  original dune loop) load after the page
- sunset palette lives in the template's CSS tokens (`--accent:#ff7a3d`); the Work "horizon" band is SVG + CSS,
  animated by `initHorizon()` in `_src/js/app.js`
- Open source opens on a night band (stars, constellations, rising moon): `initNight()` / `initStarTitle()`
- Lab is a scroll film: `assets/lab/l/` (1024px) and `assets/lab/s/` (640px, phones) hold 90 of CHIRON's 540
  frames (`00.webp`…`89.webp`, every 6th frame of https://di-ivyanshu.github.io/chiron-scroll/frames/), scrubbed on a
  canvas by `initLab()`. Frames are fetched only when the visitor gets near the section; reduced motion and
  data saver get the poster frame (`l/49.webp`) instead
- before the film, the background dots become CHIRON and turn on a turntable with the scroll: `assets/lab/chiron-3d.bin`
  is a 3D dot model (6000 x/y/z Int16, 1/10000 units). `_src/tools/chiron-dots-sampler.html` builds it from the film's pure
  side frame (`chiron-scroll/frames/frame_0037.webp`, saved as `frames/src_06.webp` next to the tool): the real profile and
  flank drawing go on both flanks, roof, horseshoe nose and light-bar tail are added; `fx.js` spins it by scroll

SEO files at the root: `robots.txt`, `sitemap.xml` (update `lastmod` when content changes),
`site.webmanifest`, `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-512.png`.

`.well-known/assetlinks.json` is the Atom Burst Android app link — `_config.yml` keeps it published.
