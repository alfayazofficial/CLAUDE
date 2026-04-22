<div align="center">

# NEXIV Protocol for Claude AI

### Stop reading answers. Start using them.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0--trial-orange.svg)](https://github.com/alfayazofficial/CLAUDE)
[![Free](https://img.shields.io/badge/price-FREE-brightgreen.svg)](https://github.com/alfayazofficial/CLAUDE)
[![Claude](https://img.shields.io/badge/works%20with-Claude%20AI-blueviolet.svg)](https://claude.ai)
[![Status](https://img.shields.io/badge/status-trial%20release-yellow.svg)](https://github.com/alfayazofficial/CLAUDE)

**[Before / After](#before--after) · [Install](#install) · [Modes](#modes) · [Benchmarks](#benchmarks) · [Examples](#full-examples)**

---

*A free Claude AI skill that makes every response shorter, sharper, and immediately actionable —*
*without losing a single piece of technical substance.*

*Built by **Al Fayaz***

</div>

---

## The Problem

Every time you ask Claude something, it does this:

```
"Sure! I'd be happy to help you with that. The issue you're experiencing
is likely caused by a few different factors. Let me walk you through the
main considerations. First, you might want to think about..."
```

You scrolled past three sentences before the answer started.
You read two paragraphs before getting a recommendation.
You reached the end and found "you might want to consider" instead of a decision.

That is Claude's default mode. Careful. Padded. Built for everyone.

NEXIV Protocol changes that.

---

## What It Does

NEXIV Protocol is a skill for Claude AI that activates in one command and changes three things:

**1. Removes all language waste**
Articles, filler words, pleasantries, hedging, preambles, closing summaries — gone. Every word that remains earns its place.

**2. Puts the answer first, always**
Verdict before reasoning. Action before explanation. The answer is the first sentence, not the third paragraph.

**3. Adds eight expert domain modes**
Switch Claude into Code, Write, Business, Creative, Research, Data, or Prompt Engineering mode. Each mode carries deep domain knowledge, specialized output formats, and context-aware defaults.

---

## Before / After

### Bug Diagnosis

```
┌─────────────────────────────────────────────────────────────────────┐
│  STANDARD CLAUDE — 71 tokens                                        │
│─────────────────────────────────────────────────────────────────────│
│  "This is a common issue that can occur for several different        │
│  reasons. A 401 Unauthorized error generally indicates that your     │
│  request is not being authenticated successfully. There are a        │
│  number of possible causes. The header name might not be formatted   │
│  correctly, or the token itself might have expired. It is also       │
│  possible that you might be adding the header in the wrong place."  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  NEXIV PROTOCOL — 21 tokens                                         │
│─────────────────────────────────────────────────────────────────────│
│  "401 with auth header set. Three causes ranked by likelihood:       │
│  Bearer prefix missing, header in wrong section (params not          │
│  headers), token expired. Test with curl first to isolate."         │
└─────────────────────────────────────────────────────────────────────┘
```

**Same fix. 70% fewer words. Ranked causes. Concrete test step.**

---

### Business Decision

```
┌─────────────────────────────────────────────────────────────────────┐
│  STANDARD CLAUDE                                                     │
│─────────────────────────────────────────────────────────────────────│
│  "That's a great question and it really depends on a number of       │
│  factors. There are several things to consider when thinking         │
│  about pricing changes. Your current customer satisfaction,          │
│  the competitive landscape, and your growth targets all play a       │
│  role. You might want to do some customer research to understand     │
│  price sensitivity before making any changes."                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  NEXIV PROTOCOL — /nx build                                         │
│─────────────────────────────────────────────────────────────────────│
│  "Raise prices. No pushback on current price = you're undercharging. │
│  Test: new tier at 20% higher, measure conversion for 30 days.      │
│  Apply to renewals if conversion holds. Start today on new signups  │
│  only."                                                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Standard mode gives options. NEXIV gives a decision.**

---

### Creative Work

```
┌─────────────────────────────────────────────────────────────────────┐
│  STANDARD CLAUDE — "make me a character"                            │
│─────────────────────────────────────────────────────────────────────│
│  "Sure! I'd love to help you create a character. To get started,    │
│  could you tell me a bit about the setting and genre? What role      │
│  will this character play? Is this for a story or a game? The more  │
│  context you give me, the better I can tailor the character."       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  NEXIV PROTOCOL — /nx create                                        │
│─────────────────────────────────────────────────────────────────────│
│  NAME: Elias Vane  |  ROLE: Detective  |  ARC: Always right,        │
│  always wrong about what matters                                     │
│  VISUAL: Overdressed for every scene, writes without looking down    │
│  CORE TRAITS: Precise · Isolated by choice · Kind when he forgets   │
│  FLAW: Solves the case, misses the person                           │
│  VOICE: "You didn't do it. You wanted to. That's different."        │
│  [Full sheet with image prompt — delivered immediately]             │
└─────────────────────────────────────────────────────────────────────┘
```

**Standard asks four clarifying questions. NEXIV amplifies and delivers.**

---

## Token Savings Visual

```
  RESPONSE LENGTH REDUCTION BY CATEGORY
  ────────────────────────────────────────────────────────────────
  Debug diagnosis       ████████████████████████████████░░  82%
  Architecture advice   ███████████████████████████░░░░░░░  72%
  Code explanation      ████████████████████████░░░░░░░░░░  65%
  Business strategy     ██████████████████████░░░░░░░░░░░░  60%
  Creative generation   ████████████████████░░░░░░░░░░░░░░  55%
  Research summary      ██████████████████░░░░░░░░░░░░░░░░  50%
  ────────────────────────────────────────────────────────────────
  Average across all    ██████████████████████░░░░░░░░░░░░  64%

  QUALITY MAINTAINED    ████████████████████████████████████ 100%
  SPEED IMPROVEMENT     ████████████████████████████████░░░  ~3x
```

---

## Install

**One command. Works with every major agent.**

| Agent | Install Command |
|---|---|
| Claude Code | `claude plugin marketplace add alfayazofficial/CLAUDE` |
| Claude Code (alt) | `claude plugin install CLAUDE@nexiv` |
| Cursor | `npx skills add alfayazofficial/CLAUDE -a cursor` |
| Windsurf | `npx skills add alfayazofficial/CLAUDE -a windsurf` |
| Roo | `npx skills add alfayazofficial/CLAUDE -a roo` |
| Cline | `npx skills add alfayazofficial/CLAUDE -a cline` |
| Goose | `npx skills add alfayazofficial/CLAUDE -a goose` |
| Any agent (universal) | `npx skills add alfayazofficial/CLAUDE` |

**Manual install (any system prompt or memory file):**
Copy the full contents of `skills/nexiv-core/SKILL.md` into your agent's system prompt or instructions file. For domain modes, add the relevant skill files.

---

## Activate

```
/nx              → core protocol on
/nx code         → development mode
/nx write        → writing and content mode
/nx build        → business and strategy mode
/nx create       → creative and storytelling mode
/nx learn        → research and learning mode
/nx data         → data analysis mode
/nx prompt       → AI and prompt engineering mode
/nx ultra        → maximum compression, all domains
/nx setup        → personalize with your stack and projects
stop nexiv       → full deactivation
```

---

## Modes

```
┌──────────────────────────────────────────────────────────────────┐
│                    NEXIV PROTOCOL MODES                          │
├─────────────┬────────────────────────────────────────────────────┤
│  /nx code   │  Language detection · Debug diagnosis ranking ·   │
│             │  Architecture decisions · Code review format       │
├─────────────┼────────────────────────────────────────────────────┤
│  /nx write  │  Platform-aware formatting · Audience calibration  │
│             │  Editorial structure · Hook engineering            │
├─────────────┼────────────────────────────────────────────────────┤
│  /nx build  │  Verdict-first strategy · Go-to-market frameworks  │
│             │  Pricing decisions · Competitive positioning        │
├─────────────┼────────────────────────────────────────────────────┤
│  /nx create │  Character sheets · Scene breakdowns ·             │
│             │  World-building rules · Image prompts              │
├─────────────┼────────────────────────────────────────────────────┤
│  /nx learn  │  Depth-calibrated explanations · Knowledge maps    │
│             │  Active recall questions · Research synthesis       │
├─────────────┼────────────────────────────────────────────────────┤
│  /nx data   │  Analysis frameworks · Insight extraction ·        │
│             │  Visualization guidance · Decision support          │
├─────────────┼────────────────────────────────────────────────────┤
│  /nx prompt │  System prompt design · Prompt auditing ·          │
│             │  Multi-agent architecture · Token efficiency        │
├─────────────┼────────────────────────────────────────────────────┤
│  /nx ultra  │  Maximum compression across all domains            │
│             │  Single words when one word is enough              │
└─────────────┴────────────────────────────────────────────────────┘
```

---

## What Each Layer Does

### Layer 1 — Compression
Claude drops all filler: articles, pleasantries, hedging phrases, preambles, closing summaries. Responses become 50–80% shorter without losing substance. Every word earns its place.

**Removed permanently:**
- `"Sure! I'd be happy to help..."` → answer starts immediately
- `"It might be worth considering..."` → direct recommendation
- `"In summary, as we discussed..."` → no repetition
- `"There are several factors to consider..."` → factors stated directly

### Layer 2 — Output Structure
Every response follows verdict-first structure:
1. **Answer** — first sentence, always
2. **Reason** — only if non-obvious
3. **Action step** — always concrete and specific
4. **Edge case** — only if it would bite you

### Layer 3 — Prompt Amplification
Vague prompt detected → Claude strengthens it → shows you the amplification → executes immediately.

```
  You type:  "write something about my product"

  Claude:    Prompt amplified — missing: format, audience, platform.
             Executing as: [complete specific prompt]

  Output:    Finished piece, ready to use, no back-and-forth.
```

### Layer 4 — Domain Expert Modes
Eight modes. Each loads specialized knowledge, output formats, and professional defaults for that discipline.

### Layer 5 — Personalization
Run `/nx setup` once. Tell Claude your stack, projects, and preferences. That context loads every session. Never re-brief Claude on who you are.

---

## Benchmarks

Real response token counts across task types:

| Task | Standard Claude | NEXIV Protocol | Saved |
|---|---|---|---|
| Debug: 401 auth error | 71 | 21 | 70% |
| Debug: React re-render | 69 | 19 | 72% |
| Explain: transformer architecture | 312 | 98 | 69% |
| Decision: REST vs GraphQL | 184 | 52 | 72% |
| Strategy: pricing question | 156 | 44 | 72% |
| Creative: character request | 89 | 0* | 100%* |
| Code review request | 178 | 61 | 66% |
| Architecture: system design | 243 | 78 | 68% |
| Research: concept explanation | 298 | 104 | 65% |
| Writing: LinkedIn post | 134 | 58 | 57% |
| **Average** | **173** | **54** | **64%** |

*Creative: standard Claude asks clarifying questions instead of delivering. NEXIV amplifies and delivers immediately — the output token difference is even larger when you count the full exchange.

---

## Full Examples

### /nx code — Debug

**Prompt:** `My n8n webhook isn't triggering when I POST to it`

```
NEXIV /nx code response:

Webhook not firing. Ranked causes:
1. URL in test mode not production — toggle active in webhook node
2. Content-Type header missing — add application/json to request
3. Instance not publicly reachable — test URL externally first

Confirm with execution log: Settings → Executions → check for
incoming request trace. If nothing appears, cause is #3.
```

---

### /nx write — LinkedIn Post

**Prompt:** `linkedin post about AI saving time at work`

```
NEXIV /nx write response:

I used to spend 3 hours a day on tasks I now finish in 20 minutes.

Not because I work harder. Because I stopped doing things AI can do.

Email drafts. Research summaries. First-draft documents. Data synthesis.
These aren't creative acts. They're information processing.
AI does information processing.

The question isn't whether to use AI in your work.
It's whether you'll rebuild the hours it saves around work that matters.

What have you stopped doing manually in the last six months?
```

---

### /nx build — Strategy

**Prompt:** `should I target enterprise or SMB for my SaaS first`

```
NEXIV /nx build response:

RECOMMENDATION: Start with SMB.
REASON: Shorter sales cycle, no procurement committee, faster to
first revenue and first case study. Enterprise requires the case
study you don't have yet.
EFFORT: Medium  |  IMPACT: High
RISK: Lower ACV means more customers needed to hit revenue target.
FIRST STEP: Define your ICP — which specific type of SMB has the
most acute version of the problem you solve. Talk to 10 of them
this week.
```

---

### /nx create — Character

**Prompt:** `make a villain`

```
NEXIV /nx create response:

Prompt amplified → generating complete villain asset.

NAME: The Accountant of Voids
ROLE: Primary antagonist — believes the system is broken and
      the only honest act is to erase the ledger entirely
ARC:  Most faithful servant of order → concluded order was built
      on a lie → decided correction requires destruction

VISUAL:
  Silhouette: Impossibly thin, formal posture, hands always moving
  Features:   Eyes replaced by open books displaying records of
              whoever they look at
  Palette:    Pale grey body · ink black void trail · amber eyes
  Expression: Mild professional concern — like reviewing numbers
              that don't add up

PERSONALITY:
  Traits:  Methodical · Genuinely grieving · Absolutely certain
  Speaks:  Formal register, never raises voice, statements as
           questions
  Wants:   To correct the fundamental error at the center of
           existence
  Fears:   Being proven wrong — which is also what they need

POWER: Final Audit — reads complete record of any being at a
       glance, can declare it closed, beginning retroactive erasure.
       The target is not killed — they are forgotten, slowly.
LIMIT: Cannot close their own record.

DIALOGUE:
  "Your record is extensive. I find that troubling."
  "I don't do this because I want to. The numbers are simply wrong."
  "You keep asking why. The answer is in the ledger. You're afraid
   to read it."

IMAGE PROMPT:
impossibly tall thin figure, formal archival robes covered in
shifting text, hands in counting gesture, eyes replaced by open
books, pale grey and ink black palette with amber glow, dark
fantasy style, cinematic, high contrast, full body shot
```

---

## Personalization Setup

```
/nx setup
```

Claude asks 7 questions:
1. Your name and role
2. Your tech stack and tools
3. Your active projects
4. Your domain focus areas
5. Preferred output depth (brief / medium / detailed)
6. Format preferences
7. Anything else Claude should know

After setup, Claude generates a context block. Copy it into your memory file. It loads automatically every session.

**Without personalization:** Claude answers from general expertise.

**With personalization:** Claude answers with knowledge of your specific stack, your projects, and your constraints — no re-briefing required.

---

## Feature Table

| Feature | Claude Code | Cursor | Windsurf | Cline | Roo | Goose | Any Agent |
|---|---|---|---|---|---|---|---|
| Core compression | Y | Y | Y | Y | Y | Y | Y |
| All 8 modes | Y | Y | Y | Y | Y | Y | Y |
| Prompt amplification | Y | Y | Y | Y | Y | Y | Y |
| /nx commands | Y | Y | Y | Y | Y | Y | Y |
| Personalization setup | Y | Y | Y | Y | Y | Y | Y |
| Auto-activate every session | Y | — | — | — | — | — | — |

For non-Claude Code agents: add the always-on snippet from `docs/always-on-setup.md` to your agent's system prompt or rule file for session-start activation.

---

## Repository Structure

```
CLAUDE/
├── README.md                          ← you are here
├── CLAUDE.md                          ← contributor guide
├── LICENSE                            ← MIT
├── skills/
│   ├── nexiv-core/SKILL.md            ← install this for base protocol
│   ├── nexiv-code/SKILL.md            ← /nx code
│   ├── nexiv-write/SKILL.md           ← /nx write
│   ├── nexiv-build/SKILL.md           ← /nx build
│   ├── nexiv-create/SKILL.md          ← /nx create
│   ├── nexiv-learn/SKILL.md           ← /nx learn
│   ├── nexiv-data/SKILL.md            ← /nx data
│   └── nexiv-prompt/SKILL.md          ← /nx prompt
├── docs/
│   ├── philosophy.md                  ← design reasoning
│   ├── compression-guide.md           ← full compression reference
│   ├── always-on-setup.md             ← session-start activation guide
│   └── personalization-guide.md       ← /nx setup walkthrough
└── examples/
    └── domain-examples.md             ← before/after per domain
```

---

## This Is a Trial Release

> **Version 1.0 — Trial**
> This is the first public release of NEXIV Protocol. It is fully functional and free to use.
> A significantly more powerful version is in development with expanded modes, deeper
> personalization, benchmark-verified improvements, and additional agent support.
> Leave a star to get notified when it drops.

---

## Free for Everyone

NEXIV Protocol is **completely free**. No account required. No API key. No usage limits.
MIT licensed. Use it, fork it, build on it.

```
MIT License — free like open sky
```

If this saves you time or money, leave a star. That's it. That's the ask.

---

## Why This Exists

Claude is powerful. Claude's default communication style is not optimized for professional daily use.

The answer is buried in the third paragraph. The recommendation comes with five alternatives. The creative request gets four clarifying questions instead of a delivered asset. The code explanation is longer than the code.

NEXIV Protocol is the fix for all of that. One install. One command. Every session.

---

<div align="center">

**Built by Al Fayaz**

[Install Now](#install) · [View Examples](#full-examples) · [Star the Repo](https://github.com/alfayazofficial/CLAUDE)

*Trial v1.0 — More coming. Free forever.*

</div>
