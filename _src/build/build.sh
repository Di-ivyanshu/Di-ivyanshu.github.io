#!/usr/bin/env sh
# Rebuild the static site from _src/ (run from the repo root):
#   sh _src/build/build.sh
# Needs Python 3 and esbuild (npx esbuild works; set ESBUILD=/path/to/esbuild to use a local copy).
set -e
cd "$(dirname "$0")/../.."
ESBUILD="${ESBUILD:-npx --yes esbuild@0.24}"

python -I -X utf8 _src/build/build_index.py
python -I -X utf8 _src/build/build_resume.py

# one deferred script for the page: name animation + effects + page logic (each file is an IIFE)
cat _src/js/name-play.js _src/js/fx.js _src/js/app.js > _src/build/.site.js
$ESBUILD _src/build/.site.js --minify --target=es2020 --sourcemap --outfile=assets/js/site.min.js
$ESBUILD _src/js/doc-page.js --minify --target=es2020 --outfile=assets/js/doc-page.min.js
rm -f _src/build/.site.js
echo "wrote assets/js/site.min.js ($(wc -c < assets/js/site.min.js) bytes)"
