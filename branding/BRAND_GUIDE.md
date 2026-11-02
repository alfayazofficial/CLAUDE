# Paperwright — Brand Guide

> **Research, written right.**

Paperwright is a team that helps students, researchers and engineers produce research papers, technical papers, journal manuscripts and assignments that are clear, rigorous and ready to submit. A *wright* is a maker (playwright, shipwright). We make papers that hold up under review.

> **Name is a working title.** Before you print or register anything, run a trademark and domain/handle check for "Paperwright". Everything here is generated from `build/generate.cjs`, so renaming is a one-line change.

---

## 1. Brand platform

| | |
|---|---|
| **Mission** | Make rigorous, well-structured research accessible to every student and early-career researcher. |
| **Vision** | A world where good ideas are never rejected because of how they were written. |
| **Promise** | Clear argument. Sound method. Submit-ready format. |
| **Personality** | Precise · Calm · Encouraging · Scholarly but human |
| **Audience** | Graduate and PhD students · early-career researchers · engineers writing technical papers · small labs and departments · startups publishing white papers |

**Tagline options** (primary in bold)
- **Research, written right.**
- From draft to submit-ready.
- Your ideas. Review-proof.

**Elevator pitch:** *Paperwright is a research-writing studio. We coach, edit, structure, analyse and format, so your paper makes its point and meets the journal's rules. You stay the author; we make the work stronger.*

### Academic-integrity position (part of the brand)
We **coach, edit, review, format and analyse**. We do **not** write assignments or papers for clients to submit as their own, and we do not sit exams. This is stated on the website, in every contract and in sales conversations. It protects clients, protects the team, and is a trust signal that competitors who ghost-write cannot copy.

---

## 2. Logo

**Files** (`logo/`, each as `.svg` and `.png`)

| File | Use |
|---|---|
| `paperwright-horizontal-light` | Default lockup on light / parchment backgrounds |
| `paperwright-horizontal-dark` | Lockup on Ink Navy / dark photos |
| `paperwright-stacked-light` | Square or narrow spaces, slide covers |
| `paperwright-mark` | App icon, social icon, stamp |
| `paperwright-avatar` | Profile photo on every platform (1000×1000, safe for circle crop) |
| `paperwright-favicon` | Website favicon (SVG) |
| `paperwright-mono-black` / `-white` | One-colour print, stamps, fax-quality documents |

**Concept.** A manuscript page with a folded corner and a highlighter stroke across one line: the moment a reviewer, or a mentor, marks what matters. The amber highlight is the brand's signature; it appears in the logo and as the single accent on every asset.

**Clear space:** keep a margin equal to half the mark's height on all sides.
**Minimum size:** mark 24 px / 8 mm; horizontal lockup 120 px / 30 mm wide. Below that, use the mark only.
**Don't:** recolour the mark · stretch or rotate it · add shadows or gradients · place the light lockup on busy photos · use amber text on white (see contrast).

---

## 3. Colour

Full table with RGB, HSL, approximate CMYK and contrast ratios: [`tokens/COLORS.md`](tokens/COLORS.md).
Machine-readable: `tokens/colors.json`, `tokens/colors.css`, `tokens/tailwind.colors.js`. Visual: `logo/paperwright-palette.png`.

### Core palette

| Role | Name | HEX | RGB |
|---|---|---|---|
| Primary | **Ink Navy** | `#0F1B33` | 15, 27, 51 |
| Primary accent | **Citation Indigo** | `#3A4FE0` | 58, 79, 224 |
| Signature accent | **Highlighter Amber** | `#F6A82C` | 246, 168, 44 |
| Background (warm) | **Parchment** | `#F7F4EC` | 247, 244, 236 |
| Background (clean) | **Paper White** | `#FFFFFF` | 255, 255, 255 |

### Supporting

| Role | Name | HEX |
|---|---|---|
| Cards on dark | Deep Margin | `#1A2B4D` |
| Soft tints, fold corner | Footnote Sky | `#DCE3FF` |
| Borders, dividers | Mist | `#E6E9F0` |
| Secondary text | Slate | `#5B6477` |
| Amber used as **text** on light | Amber Text | `#8F5400` |
| Success / approved | Verified Sage | `#17795A` |
| Error / correction | Reviewer Red | `#C23636` |

### Usage ratio
**60 %** Parchment / Paper White or Ink Navy (one dominant ground) · **25 %** Ink Navy / Slate (text, structure) · **10 %** Citation Indigo (links, buttons, emphasis) · **5 %** Highlighter Amber (one highlight per layout).

### Accessibility rules (verified, WCAG 2.1)
- Ink Navy on Parchment/White: **15.6–17.1 : 1** (AAA). Amber on Ink Navy: **8.6 : 1** (AAA).
- Citation Indigo on white: 6.2 : 1 (AA).
- **Never** put Highlighter Amber on Parchment or white (1.8 : 1). Use Amber Text `#8F5400` (5.6 : 1) for small amber text on light grounds.
- Amber on Citation Indigo (≈3.5 : 1) is for large/bold text only (headlines, labels ≥ 18 px bold).

---

## 4. Typography

| Role | Font | Fallback | Weights |
|---|---|---|---|
| Display / headlines | **Fraunces** (Google Fonts, free) | Georgia, Times New Roman | 600–700 |
| Body / UI | **Inter** (Google Fonts, free) | Helvetica Neue, Arial | 400, 600, 700 |
| Code / data | JetBrains Mono (optional) | Menlo, Consolas | 400 |

- Serif for ideas (headlines, quotes, the tagline). Sans for information (body, labels, captions).
- Headlines: sentence case, tight tracking (−1 %). Eyebrow labels: Inter 700, UPPERCASE, +4–5 % tracking, amber.
- Body copy 16–18 px web, 10.5–11 pt print; line height 1.5.
- Social PNGs in this repo were rendered with the installed system fallback; install Fraunces and Inter locally and re-run the generator for pixel-exact brand type.

---

## 5. Voice

| We are | We are not |
|---|---|
| Precise: specific nouns, real numbers | Vague hype ("world-class", "cutting-edge") |
| Encouraging: "here's how to fix it" | Condescending about the reader's draft |
| Plain: short sentences, define jargon | Jargon-stuffed to sound academic |
| Honest: we state what we won't do | Promising acceptance, grades or "guaranteed publication" |

**Never promise** publication, acceptance or a grade. Promise process and quality: "a reviewer-style report within 48 hours".

**Sample lines**
- "Your research deserves a better finish."
- "Peer review is a conversation. We help you prepare for it."
- "Send your abstract. We'll tell you what a reviewer would flag first."

---

## 6. Social media system

Every platform uses the same handle, avatar (`paperwright-avatar.png`), Ink Navy banner, and amber highlight. Replace `@paperwright` / URLs once real handles exist.

### Assets in this repo (`social/`, SVG + PNG)

| Asset | Size | Safe-zone note |
|---|---|---|
| LinkedIn banner | 1584 × 396 | Left ~330 px kept clear for the profile photo overlap |
| X / Twitter header | 1500 × 500 | Left ~300 px clear for avatar |
| Facebook cover | 1640 × 624 (2× of 820 × 312) | Content inset for mobile crop |
| YouTube banner | 2560 × 1440 | All content inside the 1546 × 423 safe area |
| Instagram post ×6 | 1080 × 1080 | Launch · Services · Tip · Process · Checklist · CTA |
| Instagram / WhatsApp story | 1080 × 1920 | Keep key text out of top and bottom 250 px |
| LinkedIn post | 1200 × 627 | |

Preview everything at once: open `brand-board.html`.

### Profile copy (paste-ready)

- **LinkedIn headline:** Paperwright | Research papers, technical papers & journal manuscripts | Research, written right.
- **LinkedIn / Facebook About:** Paperwright is a research-writing studio. We coach, edit, structure, analyse and format research papers, technical papers, journal submissions and assignments, so your work makes its point and meets the journal's rules. You stay the author. Free 20-minute manuscript check, message us "PAPER".
- **Instagram / X bio (≤150):** Research papers · technical papers · journals. Editing, methodology & formatting. You stay the author. 📄 Free manuscript check ↓
- **YouTube description:** Practical guides on writing, structuring and publishing research, from first draft to journal submission.

### Content pillars (weekly rhythm)

| Day | Pillar | Format |
|---|---|---|
| Mon | **Writing tip** (one rule, one example) | Square post, tip template |
| Wed | **Teardown** (anonymised "before → after" of a paragraph, with permission) | Carousel |
| Fri | **Checklist** (journal formatting, ethics statement, figure specs) | Square post, checklist template |
| Weekly | **Behind the process** / service spotlight | Story or short video |
| Monthly | **Deadline calendar** (major conference and journal cycles) | LinkedIn post |

Hashtags (3–5 max): `#AcademicWriting #ResearchPaper #PhDLife #Publishing #TechnicalWriting`

### Rules
- One highlight (amber) per layout. One idea per post.
- Never post real client work or names without written permission. No fabricated testimonials or statistics.
- Every CTA is the same: **Free 20-minute manuscript check, message "PAPER".**

---

## 7. Regenerating assets

```bash
node branding/build/generate.cjs          # SVGs + tokens
node branding/build/generate.cjs --png    # also PNG exports (needs Playwright + Chromium)
```
To rebrand, change `BRAND`, `HANDLE`, `TAGLINE` and the `C` palette at the top of `generate.cjs` and re-run.
