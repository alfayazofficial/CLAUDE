#!/usr/bin/env python3
"""Builds the 6x9 PDF (via pandoc + headless Chromium) and a tidied 6x9 DOCX from kdp/book.md.
Run tools/make_kdp.py first (it writes kdp/book.md)."""
import re, subprocess, tempfile, os
from pathlib import Path
R = Path(__file__).resolve().parent.parent
K = R / "kdp"
subprocess.run(["pandoc", str(K / "book.md"), "-f", "markdown", "-t", "html5", "-s", "--toc", "--toc-depth=2",
                "--metadata", "pagetitle=Thousand Black Star", "-c", "style.css", "--embed-resources",
                "--resource-path", str(K), "-o", str(K / "book.html")], check=True)
s = (K / "book.html").read_text(encoding="utf-8")
nav = re.search(r'<nav id="TOC".*?</nav>', s, re.S).group(0)
s = s.replace(nav, "", 1)
nav2 = nav.replace('role="doc-toc">', 'role="doc-toc"><h2 style="margin-top:0.3in;page-break-before:avoid">Contents</h2>', 1)
i = s.find('<h1 id="prologue"'); assert i > 0
(K / "book.html").write_text(s[:i] + nav2 + s[i:], encoding="utf-8")
js = f"""const {{ chromium }} = require('playwright');
(async () => {{ const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://{K}/book.html', {{ waitUntil: 'load' }});
await p.pdf({{ path: '{K}/thousand-black-star.pdf', width: '6in', height: '9in', printBackground: true, preferCSSPageSize: true,
displayHeaderFooter: true, headerTemplate: '<span></span>',
footerTemplate: '<div style="font-size:8pt;width:100%;text-align:center;color:#666;font-family:Georgia,serif"><span class="pageNumber"></span></div>',
margin: {{ top: '0.8in', bottom: '0.9in', left: '0.7in', right: '0.7in' }} }});
await b.close(); }})();"""
with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False) as f: f.write(js); name = f.name
subprocess.run(["node", name], check=True); os.unlink(name)

# DOCX: tidy page size, margins, fonts
import docx
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
subprocess.run(["pandoc", str(K / "book.md"), "-o", str(K / "thousand-black-star.docx"), "--toc", "--toc-depth=2"], check=True)
d = docx.Document(str(K / "thousand-black-star.docx"))
for sec in d.sections:
    sec.page_width, sec.page_height = Inches(6), Inches(9)
    sec.left_margin = sec.right_margin = Inches(0.8); sec.top_margin = Inches(0.8); sec.bottom_margin = Inches(0.9)
def find(n):
    for x in d.styles:
        if x.name.lower() == n.lower(): return x
for name in ("Normal", "Body Text", "First Paragraph", "Compact", "Block Text"):
    st = find(name)
    if st is not None: st.font.name = "Times New Roman"; st.font.size = Pt(11)
for name in ("Heading 1", "Heading 2", "Heading 3", "Title"):
    st = find(name)
    if st is not None:
        st.font.name = "Times New Roman"; st.font.color.rgb = docx.shared.RGBColor(0, 0, 0)
        st.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
        if name == "Heading 1": st.font.size = Pt(20); st.paragraph_format.page_break_before = True
        if name == "Heading 2": st.font.size = Pt(15); st.paragraph_format.page_break_before = True
        if name == "Heading 3": st.font.size = Pt(12); st.font.italic = True
d.save(str(K / "thousand-black-star.docx"))
print("built pdf + docx")
