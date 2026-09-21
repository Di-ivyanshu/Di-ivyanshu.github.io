# Deploy notes

Files here are generated from `Portfolio.dc.html` / `Resume.dc.html`. After every re-bundle, run the post-bundle fix (see chat history):
- shell `<head>` needs `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` — mobile browsers lock the viewport before the unpacker injects the template, so without it phones render the desktop layout
- real `<title>` and dark body/thumbnail background
- `href="Resume.dc.html"` → `resume.html`, `href="Portfolio.dc.html"` → `index.html`
