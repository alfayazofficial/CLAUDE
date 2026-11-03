#!/usr/bin/env python3
"""Compile the title page, prologue, act sonnets and 60 chapters into one file."""
import glob, re
from pathlib import Path
R = Path(__file__).resolve().parent.parent
M = R / "manuscript"
pro = (M / "00-prologue-and-act-sonnets.md").read_text(encoding="utf-8")
head, _, rest = pro.partition("## ACT I — THE LEDGER OPENS")
sonnets = {}
for roman in ("II", "III", "IV", "V"):
    m = re.search(rf"## ACT {roman} —.*?### \*The Chorus\*\n\n(.*?)(?:\n\n---|\Z)", pro, re.S)
    sonnets[roman] = m.group(1).strip()
out = [head.rstrip(), "\n\n---\n\n"]
for f in sorted(glob.glob(str(M / "ch-*.md"))):
    t = Path(f).read_text(encoding="utf-8").rstrip() + "\n"
    m = re.match(r"# ACT (I{1,3}|IV|V) ", t)
    if m and m.group(1) in sonnets and sonnets[m.group(1)].splitlines()[0] not in t:
        lines = t.splitlines()
        lines.insert(1, "\n### *The Chorus*\n\n" + sonnets[m.group(1)] + "\n\n---\n")
        t = "\n".join(lines) + "\n"
    out.append(t)
    out.append("\n\n---\n\n")
(R / "THOUSAND-BLACK-STAR-full-manuscript.md").write_text("".join(out), encoding="utf-8")
print("built", len(glob.glob(str(M / 'ch-*.md'))), "chapters")
