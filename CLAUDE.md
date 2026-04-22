# NEXIV Claude Protocol — Contributor and Maintenance Guide

Built by Al Fayaz, NEXIV Digital Agency

---

## Repository Purpose

This repository contains the NEXIV Claude Protocol, a comprehensive skill and instruction system for Claude AI. It is built by Al Fayaz for his personal and professional use across NEXIV Digital Agency, GeoSignal, and Deus Mortis. It is public so others can install and benefit from it, but its context layers are personalized to Al Fayaz's work and should not be generalized.

---

## File Structure and Ownership

File | Purpose | When to Edit
--- | --- | ---
skills/nexiv-core/SKILL.md | Core protocol, all modes read this | Changing base compression, output structure, prompt amplification, or context rules
skills/nexiv-pipe/SKILL.md | Pipeline and automation mode | Changing n8n, Claude API, or multi-agent behavior
skills/nexiv-manga/SKILL.md | Manga and visual story mode | Changing Deus Mortis lore, character formats, or image prompt behavior
skills/nexiv-agency/SKILL.md | Business and agency mode | Changing strategy, client, or GeoSignal go-to-market behavior
skills/nexiv-prompt/SKILL.md | Prompt engineering mode | Changing prompt audit, delivery, or architecture behavior
skills/nexiv-code/SKILL.md | Code mode | Changing code quality defaults or code boundary rules
docs/philosophy.md | Design philosophy extended | Changing the reasoning behind the system
docs/compression-guide.md | Compression reference | Adding or changing compression rules with examples
docs/mode-switching-guide.md | Mode switching reference | Adding modes or changing activation triggers
examples/ | Before and after examples per domain | Adding new examples
README.md | Product page and installation guide | Feature additions, new examples, install changes
CLAUDE.md | This file | Structural changes to the repo only

---

## Rules for Editing SKILL.md Files

1. The description field in the frontmatter must list all activation triggers exactly. If a new trigger phrase is added to the skill behavior, it must appear in the description field too. Agents use the description field to decide when to load the skill.

2. Core grammar rules in nexiv-core/SKILL.md are the source of truth. Domain skill files do not restate core rules. They extend them.

3. Known Context sections are intentionally specific to Al Fayaz. Do not generalize them. If you are adapting this for your own use, replace the Known Context section with your own context.

4. Format examples must be complete. Do not show partial examples. Every format block should be something that could be filled in and used immediately.

---

## Rules for the README

The README is the product front door. Non-technical people read it to decide whether to install this skill. Rules:

1. Before and after examples must demonstrate real improvement. Do not fabricate token counts. Do not use trivial examples where both responses are fine.

2. The comparison table must reflect actual capabilities. If a feature is removed, remove it from the table. If a feature is added, add it.

3. Installation commands must be tested and working. A broken install command is worse than no install command.

4. Keep the author attribution and origin context. This is Al Fayaz's personal protocol and that context matters for its credibility.

---

## Version Bumping

Each SKILL.md file has a version field in its frontmatter. Bump versions when:

Patch version (third number): Typo fixes, wording improvements, clarifications that do not change behavior
Minor version (second number): New shorthand, new format, new example, new sub-rule that extends behavior
Major version (first number): Behavioral change that would produce different outputs for the same input, new mode, breaking change to output format, significant change to context

When bumping a domain skill version, also note the change in the README changelog if significant.

---

## Testing a Change

Before committing a change to any SKILL.md file, test it by:

1. Activating the relevant mode in a Claude conversation
2. Sending three to five representative prompts from that domain
3. Checking that the output follows the expected format and applies the compression correctly
4. Checking that code blocks are unaffected by compression
5. Checking that security-sensitive responses are written in full sentences

---

NEXIV Claude Protocol Version 1.0.0
Built by Al Fayaz, NEXIV Digital Agency, Chittagong, Bangladesh
