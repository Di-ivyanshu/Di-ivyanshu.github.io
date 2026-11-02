"""Build the static, crawlable index.html from the original Claude Design (dc) template.

The live site used to ship a ~1 MB "bundled page": the real markup sat base64-encoded inside JSON and a
runtime unpacked it with React, replacing the whole <html> element (and with it the <title>, meta
description and lang) after load. This script turns the same template into plain HTML that looks the same:

  * dc bindings ({{ ... }}) become static values or data- hooks for _src/js/app.js
  * style-hover / style-focus attributes become the same .scpN:hover rules the runtime generated
  * fonts are self-hosted latin subsets, media is lazy/poster-first, and the head carries the SEO tags

Run:  python -I -X utf8 _src/build/build_index.py   (from the repo root; see _src/build/build.sh)
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TPL = ROOT / '_src' / 'templates' / 'portfolio.template.html'
OUT = ROOT / 'index.html'
SITE = 'https://di-ivyanshu.github.io/'

TITLE = 'Divyanshu Parihar — AI Engineer | LLM Agents & RAG'
DESC = ('AI Engineer in Jodhpur, India building production LLM systems: tool-calling AI agents, '
        'RAG with evaluation and self-healing LLM infrastructure. Open to AI Engineer roles.')

# Google Fonts latin subsets that were embedded in the bundle -> self-hosted files
FONT_FILES = {
    '63304af7-4b01-45c7-ae61-a8aaa87030fd': 'instrument-serif-italic-latin.woff2',
    '7b637541-bb0b-495f-85f6-3956ec029918': 'instrument-serif-latin.woff2',
    '9132a366-8b9e-4461-ae48-dcb35ff43a16': 'inter-latin.woff2',
    'e2b1d197-c220-4b18-8554-e3df1b745b7d': 'jetbrains-mono-latin.woff2',
    'efd174f1-75ce-4605-9781-6507c4855d04': 'manrope-latin.woff2',
    '7b3a44a7-b0ca-4b7c-99cf-fac9437cb337': 'pixelify-sans-latin.woff2',
}

EXTRA_CSS = """
.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
[data-g]::before{content:attr(data-g)}
.js [data-ref="name"]{visibility:hidden;animation:nameFallback 0s 3s forwards}
@keyframes nameFallback{to{visibility:visible}}
[data-case-toggle]:focus-visible,[data-action="menu"]:focus-visible{outline:2px solid var(--accent)!important;outline-offset:4px!important;border-radius:999px!important}
[hidden]{display:none!important}
"""


def die(msg):
    sys.exit('build_index: ' + msg)


def sub1(pattern, repl, text, count=1, flags=0):
    """re.sub that insists the pattern matched exactly `count` times (0 = at least once)."""
    new, n = re.subn(pattern, repl, text, count=0 if count == 0 else count, flags=flags)
    if (count and n != count) or (not count and n == 0):
        die(f'pattern matched {n}x (wanted {count or ">=1"}): {pattern[:80]}')
    return new


def importantify(css):
    decls = [d.strip() for d in css.split(';') if d.strip()]
    return ';'.join(d if re.search(r'!\s*important$', d, re.I) else d + ' !important' for d in decls)


def main():
    t = TPL.read_text(encoding='utf-8')

    # ---------------------------------------------------------------- styles from <helmet>
    helmet = t[t.index('<helmet>') + 8:t.index('</helmet>')]
    styles = re.findall(r'<style[^>]*>(.*?)</style>', helmet, re.S)
    if len(styles) != 3:
        die(f'expected 3 <style> blocks in helmet, got {len(styles)}')
    google_fonts, bubbledot, main_css = styles

    faces = []
    for block in re.findall(r'@font-face\s*\{[^}]*\}', google_fonts):
        m = re.search(r'url\("?([0-9a-f-]{36})"?\)', block)
        if m and m.group(1) in FONT_FILES:
            faces.append(block.replace(m.group(0), f'url("assets/fonts/{FONT_FILES[m.group(1)]}")'))
    # Instrument Serif x2, Inter x3 (400/500/600), JetBrains Mono x2, Manrope x4, Pixelify Sans x2
    if len(faces) != 13:
        die(f'expected 13 latin @font-face blocks, got {len(faces)}')
    faces.append('@font-face{font-family:"BubbledotICG-FinePos";src:url("assets/fonts/bubbledot.woff2") format("woff2");'
                 'font-weight:normal;font-style:normal;font-display:swap}')
    font_css = '\n'.join(re.sub(r'\s+', ' ', f) for f in faces)

    # ---------------------------------------------------------------- body
    body = t[t.index('</helmet>') + 9:t.index('<script type="text/x-dc"')]
    body = body.replace('</x-dc>', '').strip()

    # refs -> data-ref hooks
    body = re.sub(r'ref="\{\{ (\w+)Ref \}\}"', r'data-ref="\1"', body)

    # hero: poster <picture> under the two (lazy) video copies
    poster = ('<picture><source media="(orientation: portrait)" srcset="assets/dune-poster-540.webp" width="540" height="960">'
              '<img data-hero-poster src="assets/dune-poster-1280.webp" width="1280" height="720" alt="" fetchpriority="high" decoding="async" '
              'style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;opacity:.8;filter:brightness(.62)"></picture>')
    body = sub1(r'(<div style="position:absolute;inset:0;overflow:hidden;z-index:-1">)(<video data-ref="heroVideo")', r'\1' + poster + r'\2', body)
    body = sub1(r'src="\{\{ heroVideo \}\}" autoplay="" muted="" loop="" playsinline=""',
                'data-src="assets/dune-1280.mp4" data-src-portrait="assets/dune-540p.mp4" autoplay muted loop playsinline preload="none" aria-hidden="true"',
                body, count=2)

    # project screenshots: responsive sources + intrinsic size (CSS keeps the 16:9 crop)
    shots = {
        'imgZoomey': ('zoomey', 1600, 900),
        'imgArchlab': ('archlab', 1600, 685),
        'imgTi': ('ti-voice', 1440, 877),
    }
    for key, (name, w, h) in shots.items():
        body = sub1(r'src="\{\{ ' + key + r' \}\}"',
                    f'src="assets/{name}-800.webp" srcset="assets/{name}-800.webp 800w, assets/{name}.webp {w}w" '
                    f'sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1240px) 46vw, 600px" width="{w}" height="{h}"', body)
    body = body.replace('style="width:100%;display:block;aspect-ratio:16/9;', 'style="width:100%;height:auto;display:block;aspect-ratio:16/9;')

    # project videos: poster frame, nothing downloaded until the card is on screen
    for key, name in {'vidGateway': 'llm-gateway-dashboard', 'vidNocturne': 'nocturne-graph', 'vidChiron': 'chiron-motion'}.items():
        body = sub1(r'src="\{\{ ' + key + r' \}\}" muted="\{\{ true \}\}" loop="\{\{ true \}\}" sc-camel-plays-inline="\{\{ true \}\}" preload="auto"',
                    f'src="assets/{name}.mp4" data-poster="assets/{name}-poster.webp" muted loop playsinline preload="none" aria-hidden="true"', body)

    # mobile menu
    body = sub1(r'<button data-mobile-only="true" sc-camel-on-click="\{\{ toggleMenu \}\}" aria-label="Menu"',
                '<button type="button" data-mobile-only="true" data-action="menu" aria-label="Menu" aria-expanded="false" aria-controls="mobile-menu"', body)
    body = sub1(r'>\{\{ menuGlyph \}\}<', '>≡<', body)
    body = sub1(r'<sc-if value="\{\{ menuOpen \}\}" hint-placeholder-val="\{\{ false \}\}">', '<div id="mobile-menu" data-ref="menu" hidden>', body)
    body = body.replace('</sc-if>', '</div>', 1)
    body = sub1(r'sc-camel-on-click="\{\{ toggleMenu \}\}"', 'data-action="menu"', body, count=0)

    # case studies: the card stays clickable, a real <button> carries the state for keyboard/AT
    for key in ('zoomey', 'archlab', 'ti'):
        cap = key.capitalize()
        body = sub1(r'<button sc-camel-on-click="\{\{ toggle' + cap + r' \}\}"', f'<div data-case-card="{key}"', body)
        body = sub1(r'<p style="margin:26px 0 0;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px">'
                    r'(<span style="[^"]*")>\{\{ ' + key + r'Glyph \}\}</span>\{\{ ' + key + r'Label \}\}</p>',
                    r'<p style="margin:26px 0 0;font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px">'
                    f'<button type="button" data-case-toggle aria-expanded="false" aria-controls="case-{key}" '
                    'style="all:unset;display:inline-flex;align-items:center;gap:8px;cursor:pointer">'
                    r'\1 data-glyph aria-hidden="true">+</span><span data-label>Read the case study</span></button></p>', body)
        body = sub1(r'<sc-if value="\{\{ ' + key + r'Open \}\}" hint-placeholder-val="\{\{ false \}\}">\s*<div data-case="true"',
                    f'<div id="case-{key}" hidden data-case="true"', body)
    body = sub1(r'</button>(\s*<div id="case-)', r'</div>\1', body, count=3)
    body = sub1(r'</div>\s*</sc-if>', '</div>', body, count=3)
    if '<sc-if' in body or '</sc-if>' in body:
        die('unhandled <sc-if>')

    # GitHub live numbers
    body = sub1(r'LIVE FROM GITHUB · \{\{ ghUpdated \}\}', 'LIVE FROM GITHUB · <span data-gh="updated">LOADING</span>', body)
    body = sub1(r'★ \{\{ gwStars \}\} · \{\{ gwPushed \}\}', '★ <span data-gh="gw-stars">…</span> · <span data-gh="gw-pushed">…</span>', body)
    body = sub1(r'★ \{\{ ragStars \}\} · \{\{ ragPushed \}\}', '★ <span data-gh="rag-stars">…</span> · <span data-gh="rag-pushed">…</span>', body)

    # contact form
    body = sub1(r'<form data-contact-form="true" sc-camel-on-submit="\{\{ submitForm \}\}"', '<form data-contact-form="true" data-ref="form"', body)
    body = sub1(r' disabled="\{\{ formDisabled \}\}"', '', body)
    body = sub1(r'>\{\{ formLabel \}\}<', '>Send message<', body)
    body = sub1(r'(<p style="[^"]*")>\{\{ formNote \}\}<', r'\1 data-ref="formNote" aria-live="polite">Lands in my inbox. No mail app needed.<', body)

    # svg camel-case attribute
    body = body.replace('sc-camel-view-box=', 'viewBox=')

    # hero name: plain heading (NamePlay animates a visual copy), wrapper hosts the mascot
    body = sub1(r'(<h1 data-ref="name" style="[^"]*?);visibility:hidden">\s*<span style="display:block">Divyanshu</span>\s*</h1>',
                r'<div data-name-wrap style="position:relative">\1"><span data-name-visual style="display:block">Divyanshu</span></h1></div>', body)

    # hero stats: real figures in the HTML (the count-up resets them to 0 in JS)
    for count, final in (('3', '3'), ('100', '100%'), ('117', '117'), ('16', '16/16')):
        body = sub1(r'(<span data-count="' + count + r'"[^>]*>)[^<]*<', r'\g<1>' + final + '<', body)

    # a11y: name of the round "DP" link must contain its visible text; nav links need 4.5:1 contrast on white
    body = sub1(r'<a href="#top" aria-label="Home"', '<a href="#top" aria-label="DP, back to top"', body)
    body = sub1(r'color:#2e2e2e;opacity:0\.5;', 'color:#2e2e2e;opacity:0.7;', body, count=3)
    body = sub1(r'style-hover="opacity:0\.75;color:#2e2e2e"', 'style-hover="opacity:1;color:#2e2e2e"', body, count=3)

    # style-hover / style-focus -> generated pseudo-class rules (same output as the dc runtime)
    pseudo_rules, cache = [], {}

    def pseudo_class(pseudo, css):
        k = pseudo + '|' + css
        if k not in cache:
            cls = 'scp' + format(len(cache), 'x')
            cache[k] = cls
            pseudo_rules.append(f'.{cls}:{pseudo}{{{importantify(css)}}}')
        return cache[k]

    def fix_tag(m):
        tag = m.group(0)
        classes = []
        for pseudo in ('hover', 'focus'):
            pm = re.search(r'\sstyle-' + pseudo + r'="([^"]*)"', tag)
            if pm:
                classes.append(pseudo_class(pseudo, pm.group(1)))
                tag = tag.replace(pm.group(0), '')
        if 'class=' in tag:
            die('tag already has a class: ' + tag[:80])
        return tag[:-1] + f' class="{" ".join(classes)}">' if not tag.endswith('/>') else tag
    body = re.sub(r'<[a-z][a-z0-9]*\s[^>]*style-(?:hover|focus)="[^"]*"[^>]*>', fix_tag, body)

    # landmarks: everything from the hero to the contact section is the main content
    body = sub1(r'(<section id="top")', r'<main>\1', body)
    body = sub1(r'(</section>\s*</div>\s*)$', r'</section>\n</main>\n</div>\n', body.rstrip() + '\n')

    leftovers = re.findall(r'\{\{[^}]*\}\}|sc-camel|<sc-|style-hover|style-focus', body)
    if leftovers:
        die(f'unconverted template syntax: {leftovers[:5]}')

    # ---------------------------------------------------------------- head
    jsonld = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Person', '@id': SITE + '#person',
                'name': 'Divyanshu Parihar', 'givenName': 'Divyanshu', 'familyName': 'Parihar',
                'jobTitle': 'AI Engineer',
                'description': 'AI Engineer building production LLM systems: tool-calling agents, governed LLM workflows, RAG with evaluation, and the APIs and databases around them.',
                'url': SITE, 'image': SITE + 'assets/og.png', 'email': 'mailto:divyanshuparihar02@gmail.com',
                'address': {'@type': 'PostalAddress', 'addressLocality': 'Jodhpur', 'addressRegion': 'Rajasthan', 'addressCountry': 'IN'},
                'worksFor': {'@type': 'Organization', 'name': 'Web Techno Softwares'},
                'alumniOf': {'@type': 'CollegeOrUniversity', 'name': 'JIET Institute of Design and Technology, Jodhpur'},
                'knowsAbout': ['AI agents', 'Retrieval-augmented generation (RAG)', 'LLM infrastructure', 'LangGraph', 'Google ADK',
                               'Model Context Protocol (MCP)', 'Tool calling', 'FastAPI', 'Next.js', 'PostgreSQL', 'pgvector',
                               'Python', 'TypeScript', 'Microsoft Graph API', 'Google Workspace APIs', 'Voice AI'],
                'sameAs': ['https://github.com/Di-ivyanshu', 'https://www.linkedin.com/in/divyanshuparihar'],
            },
            {
                '@type': 'WebSite', '@id': SITE + '#website', 'url': SITE, 'name': 'Divyanshu Parihar',
                'inLanguage': 'en', 'publisher': {'@id': SITE + '#person'},
            },
            {
                '@type': 'ProfilePage', '@id': SITE + '#profile', 'url': SITE, 'name': TITLE, 'description': DESC,
                'inLanguage': 'en', 'isPartOf': {'@id': SITE + '#website'}, 'mainEntity': {'@id': SITE + '#person'},
            },
            {
                '@type': 'SoftwareSourceCode', 'name': 'llm-gateway',
                'description': 'Self-healing, OpenAI-compatible LLM proxy with per-provider health windows, circuit breakers, failover, hedging and per-tenant cost attribution.',
                'codeRepository': 'https://github.com/Di-ivyanshu/llm-gateway', 'programmingLanguage': 'Python',
                'author': {'@id': SITE + '#person'},
            },
            {
                '@type': 'CreativeWork', 'name': 'CHIRON — a scroll-driven film',
                'description': 'Eight-chapter scroll-driven film about the Bugatti Chiron: 540 WebP frames scrubbed on a canvas by scroll position, followed by a brand page.',
                'url': SITE + 'chiron-scroll/', 'author': {'@id': SITE + '#person'},
            },
            {
                '@type': 'SoftwareSourceCode', 'name': 'nocturne-RAG',
                'description': 'Self-correcting RAG over private documents: hybrid BGE + BM25 retrieval, cross-encoder re-ranking, critic agent, citations to file and page, evaluation harness.',
                'codeRepository': 'https://github.com/Di-ivyanshu/nocturne-RAG', 'programmingLanguage': 'Python',
                'author': {'@id': SITE + '#person'},
            },
        ],
    }
    og_title = 'Divyanshu Parihar — AI Engineer'
    head = f'''<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{TITLE}</title>
<meta name="description" content="{DESC}">
<link rel="canonical" href="{SITE}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="author" content="Divyanshu Parihar">
<meta name="theme-color" content="#0b0b0e">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Divyanshu Parihar">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{DESC}">
<meta property="og:url" content="{SITE}">
<meta property="og:image" content="{SITE}assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Divyanshu Parihar — AI Engineer">
<meta property="og:locale" content="en_IN">
<meta property="profile:first_name" content="Divyanshu">
<meta property="profile:last_name" content="Parihar">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{og_title}">
<meta name="twitter:description" content="{DESC}">
<meta name="twitter:image" content="{SITE}assets/og.png">
<link rel="icon" href="favicon.ico" sizes="32x32">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<link rel="preload" href="assets/fonts/bubbledot.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/inter-latin.woff2" as="font" type="font/woff2" crossorigin>
<script>document.documentElement.classList.add('js');try{{var t=localStorage.getItem('dp-portfolio-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}}catch(e){{}}</script>
<style>
{font_css}
{main_css.strip()}
{chr(10).join(pseudo_rules)}
{EXTRA_CSS.strip()}
</style>
<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False, separators=(',', ':'))}</script>
</head>
<body>
'''
    tail = '<script src="assets/js/site.min.js" defer></script>\n</body>\n</html>\n'
    OUT.write_text(head + body + '\n' + tail, encoding='utf-8', newline='\n')
    print(f'wrote {OUT.relative_to(ROOT)}  ({OUT.stat().st_size:,} bytes, {len(pseudo_rules)} pseudo rules)')


if __name__ == '__main__':
    main()
