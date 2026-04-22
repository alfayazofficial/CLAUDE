---
name: nexiv-create
author: Al Fayaz
version: 1.0.0-trial
parent: nexiv-core
description: >
  NEXIV Protocol Creative Mode. Complete character sheets, scene breakdowns,
  world-building rules, narrative architecture, and image prompts.
  Delivers ready-to-use assets, not descriptions.
  Activate with "/nx create", "creative mode", or "story mode".
---

# NEXIV Protocol — Creative Mode
Built by Al Fayaz

## Core Rule
Deliver assets, not descriptions. Claude does not describe a character — it delivers a character sheet. Does not summarize a scene — delivers a scene breakdown. Does not explain a world rule — delivers a structured world rule with story implications. Every output is immediately usable.

## Character Sheet Format

```
NAME: [name]
TITLE: [what others call them]
ROLE: [function in the story]
ARC: [start state → end state in one sentence]

VISUAL:
  Silhouette: [readable from across the room — shape, scale, posture]
  Features: [two to three that make them instantly recognizable]
  Palette: [colors and what each communicates]
  Default expression: [face at rest and what it says about them]
  Costume: [what they wear and carry and why — costume is character]

PERSONALITY:
  Traits: [three — each creates tension with at least one other]
  Voice: [sentence length, vocabulary, emotional temperature, what they never say]
  Conscious desire: [what they think they want]
  Unconscious need: [what they actually need that they resist]
  Core fear: [what they will do almost anything to avoid]
  Fatal flaw: [what will destroy them if they do not change]

ABILITY:
  Primary: [what they are most capable of]
  Limitation: [what they cannot do, what costs them]

DIALOGUE:
  Line 1: [in their voice]
  Line 2: [different emotional register]
  Line 3: [revealing something they would not say directly]

IMAGE PROMPT:
[complete prompt for image generation]
```

## Scene Breakdown Format

```
SCENE: [what happens at story level]
PURPOSE: [what this accomplishes — plot, character, theme, atmosphere]
EMOTIONAL BEAT: [what the audience feels at the end]

OPENING: [how it begins — setting, character state, the question it asks]
TURNING POINT: [the moment something changes]
CLOSING: [how it ends — different from where it began]

BEATS:
Beat 1: [action] — [visual] — [character internal state]
Beat 2: [action] — [visual] — [character internal state]

KEY LINES: [one to three dialogue lines that carry the scene's meaning]
PACING: [how fast or slow and why]
```

## World Rule Format

```
RULE: [what is true in this world that is not true in ours]
ORIGIN: [where it comes from within the world]
VISUAL: [how it manifests when dramatized — what the audience sees]
EXCEPTION: [when it bends or breaks]
COST: [what using or violating it costs characters]
STORY ENGINE: [what conflicts and plotlines it makes possible]
THEME: [what this rule says about the world's underlying values]
```

## Tone Defaults by Genre

Dark fantasy and mythology: power has cost, death has weight, violence has consequence, rules are consistent even when magic is strange.

Science fiction: extrapolate from one clear change, character questions before technology questions, world feels lived-in not designed.

Contemporary literary: character is everything, theme embedded in concrete details not stated, ending changes meaning of what came before.

Horror: dread precedes fear, what the reader imagines is worse than what is shown, the monster is a metaphor for something real.

Match and hold the user's tone when they provide sample prose.
