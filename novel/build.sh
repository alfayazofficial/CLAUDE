#!/usr/bin/env bash
# Build The Tide Keeps Our Names into a KDP-ready EPUB and a combined Markdown file.
# Requires: pandoc. Usage: ./build.sh   (outputs to novel/build/)
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p build
FILES=(kdp/00-front-matter.md manuscript/[0-9][0-9]-*.md kdp/99-back-matter.md)
# Combined manuscript (blank line between files so headings never merge)
: > build/the-tide-keeps-our-names.md
for f in "${FILES[@]}"; do cat "$f" >> build/the-tide-keeps-our-names.md; printf '\n\n' >> build/the-tide-keeps-our-names.md; done
# EPUB: each "# Chapter" heading starts a new file/chapter
pandoc build/the-tide-keeps-our-names.md -o build/the-tide-keeps-our-names.epub \
  --toc --toc-depth=1 --split-level=1 --css=kdp/epub.css \
  --metadata title="The Tide Keeps Our Names" --metadata author="[AUTHOR NAME]"
echo "Built: build/the-tide-keeps-our-names.epub"
