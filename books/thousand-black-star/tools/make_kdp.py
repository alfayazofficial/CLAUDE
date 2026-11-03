#!/usr/bin/env python3
"""Builds KDP files: cover draft, front matter, EPUB and DOCX from the chapter files."""
import glob, random, re, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

R = Path(__file__).resolve().parent.parent
K = R / "kdp"; K.mkdir(exist_ok=True)
M = R / "manuscript"

# ---- cover (draft, typographic) ----
W, H = 1600, 2560
img = Image.new("RGB", (W, H), (6, 8, 20))
d = ImageDraw.Draw(img)
random.seed(1000)
for y in range(H):  # subtle vertical gradient
    c = int(6 + 22 * (y / H)); d.line([(0, y), (W, y)], fill=(c, c + 2, 30 + c))
for _ in range(1000):  # a thousand stars; the black ones are rings
    x, y = random.randint(0, W), random.randint(0, int(H * 0.72))
    r = random.choice([1, 1, 1, 2, 2, 3])
    d.ellipse([x - r, y - r, x + r, y + r], fill=(205, 205, 225))
cx, cy = W // 2, 980  # the one black star
for rr, a in [(260, 18), (200, 30), (150, 50), (110, 90)]:
    d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], outline=(160 + a, 140 + a // 2, 90), width=3)
d.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], fill=(0, 0, 0), outline=(212, 175, 90), width=5)
def font(p, s): return ImageFont.truetype(p, s)
SER = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
SAN = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
def centered(text, y, f, fill):
    w = d.textlength(text, font=f); d.text(((W - w) / 2, y), text, font=f, fill=fill)
centered("THOUSAND", 1560, font(SER, 190), (232, 222, 190))
centered("BLACK STAR", 1790, font(SER, 190), (232, 222, 190))
centered("A NOVEL OF SIXTY LOVES BENEATH ONE DARK SKY", 2060, font(SAN, 44), (190, 185, 170))
centered("AL FAYAZ", 2360, font(SER, 90), (212, 175, 90))
img.save(K / "cover-draft.jpg", quality=92)

# ---- front matter ----
rows = []
for line in (R / "02-character-bible-principals.md").read_text(encoding="utf-8").splitlines():
    if line.startswith("| S"):
        c = [x.strip() for x in line.strip().strip("|").split("|")]
        rows.append((c[0], c[1], c[3]))
couples = {}
for pid, name, place in rows:
    couples.setdefault(pid[:3], []).append((name, place))
dp = ["## The Sixty Couples", "", "*Dramatis Personae. Each pair is a love story; the Register numbers of all one thousand souls are kept in the Keeper's ledger.*", ""]
for s in sorted(couples):
    (a, pa), (b, pb) = couples[s]
    dp.append(f"- **{a}** & **{b}**: {pa}" if pa == pb else f"- **{a}** ({pa}) & **{b}** ({pb})")
front = f"""---
title: "Thousand Black Star"
subtitle: "A Novel of Sixty Loves Beneath One Dark Sky"
author: "Al Fayaz"
lang: en
rights: "© 2026 Al Fayaz. All rights reserved."
---

# THOUSAND BLACK STAR

*A Novel of Sixty Loves Beneath One Dark Sky*

**Al Fayaz**

&nbsp;

© 2026 Al Fayaz. All rights reserved.

This is a work of fiction. Names, characters, places and events are products of the author's imagination or are used fictitiously. Any resemblance to actual persons, living or dead, or to actual events is coincidental.

&nbsp;

*For everyone who has kept a sentence behind their teeth.*

&nbsp;

{chr(10).join(dp)}

"""
(K / "front-matter.md").write_text(front, encoding="utf-8")

# ---- assemble from the compiled manuscript (skip its own title block) ----
full = (R / "THOUSAND-BLACK-STAR-full-manuscript.md").read_text(encoding="utf-8")
body = full.split("## PROLOGUE", 1)[1]
body = "## PROLOGUE" + body
body = re.sub(r"^## PROLOGUE\n### \*Spoken by the Chorus\*", "# PROLOGUE\n\n*Spoken by the Chorus*", body, count=1)
body = re.sub(r"^## Chapter (\d+)\n+### (.+)$", r"## Chapter \1: \2", body, flags=re.M)
(K / "book.md").write_text(front + "\n\n" + body, encoding="utf-8")

common = ["pandoc", str(K / "book.md"), "--toc", "--toc-depth=2", "--split-level=1"]
subprocess.run(common + ["--epub-cover-image", str(K / "cover-draft.jpg"), "-o", str(K / "thousand-black-star.epub")], check=True)
subprocess.run(["pandoc", str(K / "book.md"), "-o", str(K / "thousand-black-star.docx"), "--toc", "--toc-depth=2"], check=True)
print("built", [p.name for p in K.iterdir()])
