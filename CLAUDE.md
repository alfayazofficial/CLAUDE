# NEXIV Protocol — Contributor Guide

Built by Al Fayaz

---

## What This Repo Is

NEXIV Protocol is a free, open-source skill system for Claude AI. It makes Claude faster, more direct, and more useful for professional daily work across eight domains. MIT licensed. Free forever.

This is version 1.0 — a trial release. Contributions to improve coverage, fix behavior, and add examples are welcome.

---

## File Map

| File | Purpose | Edit When |
|---|---|---|
| skills/nexiv-core/SKILL.md | Core protocol — all agents load this | Changing compression, output structure, prompt amplification, or personalization |
| skills/nexiv-code/SKILL.md | Development mode | Debug patterns, code quality, review format |
| skills/nexiv-write/SKILL.md | Writing mode | Platform formats, audience calibration, editorial structures |
| skills/nexiv-build/SKILL.md | Business mode | Strategy frameworks, decision formats, recommendation structure |
| skills/nexiv-create/SKILL.md | Creative mode | Character sheet, scene breakdown, world-building, genre conventions |
| skills/nexiv-learn/SKILL.md | Learning mode | Explanation structure, depth calibration, active recall |
| skills/nexiv-data/SKILL.md | Data mode | Analysis structure, visualization guidance |
| skills/nexiv-prompt/SKILL.md | Prompt engineering mode | Prompt delivery, audit format, engineering principles |
| docs/ | Extended documentation | Depth additions |
| examples/ | Before and after examples | Adding real examples |
| README.md | Product page | Feature additions, examples, install changes |

---

## Contribution Rules

**Skill files:**
The `description` frontmatter field lists all activation triggers exactly. If you add a trigger phrase, add it to the description. Agents use this field to decide when to load the skill.

Core rules in nexiv-core/SKILL.md are the source of truth. Domain files extend the core — they do not restate it.

Format examples must be complete. Partial examples produce partial implementations.

**README:**
Before/after examples must show real improvement. Do not fabricate token counts.
Install commands must be tested before commit. A broken command harms users.

**Version bumping:**
Patch (x.x.Z): typos, wording, no behavior change
Minor (x.Y.0): new shorthand, new format, new rule extending behavior
Major (X.0.0): behavior change producing different output, new mode, breaking change

---

## Testing a Change

1. Activate the mode in a Claude conversation
2. Send five representative prompts for that domain
3. Confirm output follows expected format and compression
4. Confirm code blocks are uncompressed
5. Confirm security warnings are full sentences
6. Confirm prompt amplification triggers on vague prompts

---

## Issues

Use GitHub Issues for:
- Bug reports: protocol activates but a rule is not applied
- Mode requests: a domain not covered by existing modes
- Example contributions: real before/after from your work
- Improvement suggestions: specific rule changes with reasoning

---

NEXIV Protocol v1.0.0 Trial
Built by Al Fayaz
MIT License — Free for everyone
github.com/alfayazofficial/CLAUDE
