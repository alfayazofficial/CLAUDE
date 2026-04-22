# NEXIV Protocol — Contributor Guide

Built by Al Fayaz · NEXIV Digital Agency

---

## Repo Purpose

This is Al Fayaz's personal AI skill protocol. More powerful than Caveman:
- Compression + domain intelligence + output structure + prompt amplification
- Personalized for Al Fayaz's actual stack (n8n, Claude API, Deus Mortis, NEXIV agency)

---

## File Ownership

| File | Purpose | Edit when |
|---|---|---|
| `skills/nexiv/SKILL.md` | Core protocol — ALL agents read this | Changing base behavior |
| `skills/nexiv-pipe/SKILL.md` | Pipeline domain mode | Changing automation/n8n behavior |
| `skills/nexiv-manga/SKILL.md` | Manga/story domain mode | Changing creative/visual behavior |
| `skills/nexiv-agency/SKILL.md` | Business domain mode | Changing agency/client behavior |
| `skills/nexiv-prompt/SKILL.md` | Prompt engineering mode | Changing meta-prompt behavior |
| `README.md` | Product front door | Feature add, before/after examples, install changes |
| `CLAUDE.md` | This file — contributor guide | Structural changes only |

---

## Rules for README

- Before/After examples must be real. Never fabricate token counts.
- Install commands must work. Test before merge.
- Keep author attribution — this is Al Fayaz's personal protocol.
- Mode table must stay in sync with actual SKILL.md files.

---

## Rules for SKILL.md files

- `description:` field in frontmatter must describe activation triggers exactly.
- Core grammar rules in `nexiv/SKILL.md` are the source of truth — don't duplicate in sub-skills, reference them.
- Known Context sections are personalized — don't generalize them.

---

## Version Bumping

`version: X.Y.Z` in each SKILL.md frontmatter.
- Patch (Z): wording tweaks, typo fixes
- Minor (Y): new shorthand, format additions
- Major (X): behavioral change, new mode, breaking change

---

NEXIV Protocol · Al Fayaz · NEXIV Digital Agency
