# NEXIV Claude Protocol — Contributor and Maintenance Guide

Built by Al Fayaz, NEXIV Digital Agency

---

## Repository Purpose

NEXIV Claude Protocol is a universal advanced skill system for Claude AI. It is built for professional daily use across development, writing, business strategy, creative work, research, data analysis, and AI engineering. It is maintained by Al Fayaz and open for community contribution.

---

## File Map

File or Directory | Purpose | Edit When
--- | --- | ---
skills/nexiv-core/SKILL.md | Core protocol — all agents load this | Changing compression rules, output structure, prompt amplification, activation triggers, or personalization setup
skills/nexiv-code/SKILL.md | Development mode | Changing debug patterns, code quality standards, or review format
skills/nexiv-write/SKILL.md | Writing mode | Changing platform formats, audience calibration, or editorial structures
skills/nexiv-build/SKILL.md | Business mode | Changing strategy frameworks, decision formats, or recommendation structure
skills/nexiv-create/SKILL.md | Creative mode | Changing character sheet format, scene breakdown, world-building formats, or genre conventions
skills/nexiv-learn/SKILL.md | Learning mode | Changing explanation structure, depth calibration, or active recall format
skills/nexiv-data/SKILL.md | Data mode | Changing analysis structure, visualization guidance, or statistical interpretation rules
skills/nexiv-prompt/SKILL.md | Prompt engineering mode | Changing prompt delivery format, audit format, or engineering principles
docs/ | Extended documentation | Adding depth to any topic covered in skills
examples/ | Before and after examples | Adding new examples per domain
README.md | Product page | Feature additions, example additions, install changes
CLAUDE.md | This file | Structural repo changes only

---

## Contribution Rules

**Skill file rules:**
The description frontmatter field must list all activation triggers exactly. Agents use this field to decide when to load the skill. If you add a trigger phrase to the behavior, add it to the description too.

Core rules in nexiv-core/SKILL.md are the source of truth. Domain files do not restate core rules. They extend them. If you find yourself copying a rule from the core file into a domain file, that is the wrong approach — reference the core instead.

Output format examples must be complete. Partial examples cause partial implementations. Every format block should be something that can be filled in and used immediately.

**README rules:**
Before and after examples must show real improvement with honest token comparisons. Do not use trivial examples where both versions are acceptable.

The installation commands must be tested before committing. A broken install command actively harms users.

The rating table must reflect actual capabilities. Update it when a mode is added or changed.

**Version bumping:**
Patch version (third number): Typo fixes, wording improvements, clarifications that do not change behavior.
Minor version (second number): New shorthand, new format option, new example, new sub-rule extending behavior without breaking existing behavior.
Major version (first number): Behavioral change that would produce different outputs for the same input, new mode, breaking change to output format.

When bumping the core version, bump the README version number as well.

---

## Testing a Change

Before merging any change to a skill file, test by:

1. Activating the relevant mode in a Claude conversation.
2. Sending five representative prompts for that domain.
3. Confirming output follows the expected format and compression rules.
4. Confirming code blocks are unaffected by compression.
5. Confirming security warnings are written in full sentences.
6. Confirming prompt amplification triggers on vague prompts.

---

## Issues and Requests

Use GitHub Issues for:
- Bug reports: the protocol activates but a rule is not being applied
- Mode requests: a domain that is not covered by existing modes
- Example contributions: real before and after examples from your work
- Improvement suggestions: specific rule changes with reasoning

---

NEXIV Claude Protocol Version 2.0.0
Built by Al Fayaz, NEXIV Digital Agency, Chittagong, Bangladesh
github.com/alfayazofficial/CLAUDE
