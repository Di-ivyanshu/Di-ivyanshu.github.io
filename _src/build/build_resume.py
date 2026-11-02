"""Build the static resume.html from the original dc template (same look, no React/dc runtime).

The resume is a <doc-page> A4 sheet (a small standalone custom element, _src/js/doc-page.js);
its content is plain HTML in the light DOM, so it is readable without JavaScript.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TPL = ROOT / '_src' / 'templates' / 'resume.template.html'
OUT = ROOT / 'resume.html'
SITE = 'https://di-ivyanshu.github.io/'
URL = SITE + 'resume.html'
TITLE = 'Divyanshu Parihar — Resume | AI Engineer (LLM Agents, RAG)'
DESC = ('Resume of Divyanshu Parihar, AI Engineer in Jodhpur, India: production LLM agents, governed LLM workflows, '
        'RAG with evaluation, FastAPI and PostgreSQL backends. Download as PDF.')
LATIN = 'a4822878'   # IBM Plex Sans latin subset in the bundle


def die(msg):
    sys.exit('build_resume: ' + msg)


def main():
    t = TPL.read_text(encoding='utf-8')
    helmet = t[t.index('<helmet>') + 8:t.index('</helmet>')]
    styles = re.findall(r'<style[^>]*>(.*?)</style>', helmet, re.S)
    if len(styles) != 2:
        die(f'expected 2 <style> blocks, got {len(styles)}')
    fonts, page_css = styles
    faces = []
    for block in re.findall(r'@font-face\s*\{[^}]*\}', fonts):
        m = re.search(r'url\("?([0-9a-f-]{36})"?\)', block)
        if m and m.group(1).startswith(LATIN):
            faces.append(re.sub(r'\s+', ' ', block.replace(m.group(0), 'url("assets/fonts/ibm-plex-sans-latin.woff2")')))
    if len(faces) != 4:
        die(f'expected 4 latin IBM Plex Sans faces, got {len(faces)}')

    inline = re.search(r'<script>\s*(\(function\(\)\{.*?\}\)\(\);)\s*</script>', helmet, re.S)
    if not inline:
        die('print/fit script not found')
    inline_js = inline.group(1).replace("document.title = 'Divyanshu Parihar — Resume'", 'document.title = ' + json.dumps(TITLE))

    body = t[t.index('</helmet>') + 9:t.index('</x-dc>')].strip()
    body = body.replace('sc-camel-view-box=', 'viewBox=')
    body = body.replace('<button id="dl-pdf" ', '<button type="button" id="dl-pdf" ')
    if re.search(r'\{\{|sc-camel|<sc-|style-hover', body):
        die('unconverted template syntax')

    jsonld = {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage', '@id': URL + '#page', 'url': URL, 'name': TITLE, 'description': DESC, 'inLanguage': 'en',
        'isPartOf': {'@id': SITE + '#website'},
        'mainEntity': {'@type': 'Person', '@id': SITE + '#person', 'name': 'Divyanshu Parihar', 'jobTitle': 'AI Engineer', 'url': SITE,
                       'sameAs': ['https://github.com/Di-ivyanshu', 'https://www.linkedin.com/in/divyanshuparihar']},
    }
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<link rel="canonical" href="{URL}">
<meta name="robots" content="index, follow">
<meta name="author" content="Divyanshu Parihar">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Divyanshu Parihar">
<meta property="og:title" content="Divyanshu Parihar — Resume">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{URL}">
<meta property="og:image" content="{SITE}assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="favicon.ico" sizes="32x32">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="preload" href="assets/fonts/ibm-plex-sans-latin.woff2" as="font" type="font/woff2" crossorigin>
<style>
{chr(10).join(faces)}
{page_css.strip()}
[data-resume] a{{text-decoration:underline;text-decoration-thickness:1px;text-decoration-color:rgba(28,31,38,.35);text-underline-offset:2px}}
</style>
<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False, separators=(',', ':'))}</script>
<script src="assets/js/doc-page.min.js" defer></script>
<script>
{inline_js}
</script>
</head>
<body>
{body}
</body>
</html>
'''
    OUT.write_text(html, encoding='utf-8', newline='\n')
    print(f'wrote {OUT.relative_to(ROOT)}  ({OUT.stat().st_size:,} bytes)')


if __name__ == '__main__':
    main()
