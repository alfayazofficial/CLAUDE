# Paperwright — Brand Kit

*Research, written right.*

A complete brand system for a team that supports research papers, technical papers, journal manuscripts and assignments.

| Start here | |
|---|---|
| [`BRAND_GUIDE.md`](BRAND_GUIDE.md) | Logo rules, **colour codes**, typography, voice, social system, profile copy |
| [`BUSINESS_MODEL.md`](BUSINESS_MODEL.md) | Services, pricing, lean canvas, team, workflow, 90-day plan, risks |
| [`brand-board.html`](brand-board.html) | Open in a browser to see every asset at once |

```
branding/
├── logo/      mark, horizontal (light/dark), stacked, mono, avatar, favicon, palette sheet   (.svg + .png)
├── social/
│   ├── banners/   LinkedIn, X, Facebook, YouTube                                             (.svg + .png)
│   └── posts/     6 Instagram posts, 1 story, 1 LinkedIn post                                (.svg + .png)
├── tokens/    colors.json · colors.css · tailwind.colors.js · COLORS.md (RGB/HSL/CMYK/contrast)
└── build/     generate.cjs  (single source of truth for every asset)
```

## Brand colours at a glance

| Name | HEX |
|---|---|
| Ink Navy | `#0F1B33` |
| Citation Indigo | `#3A4FE0` |
| Highlighter Amber | `#F6A82C` |
| Parchment | `#F7F4EC` |
| Paper White | `#FFFFFF` |
| Footnote Sky | `#DCE3FF` |
| Slate | `#5B6477` |
| Verified Sage | `#17795A` |
| Reviewer Red | `#C23636` |

Fonts: **Fraunces** (headlines) + **Inter** (body), both free on Google Fonts.

## Regenerate

```bash
node branding/build/generate.cjs --png
```
