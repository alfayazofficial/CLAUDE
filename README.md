# NEXIV Claude Protocol — Advanced Cognitive Skill for Claude AI

**Built by Al Fayaz — NEXIV Digital Agency, Chittagong, Bangladesh**

---

## What Is NEXIV Claude Protocol

NEXIV Claude Protocol is a comprehensive skill system that transforms how Claude AI thinks, responds, and structures its outputs. When installed, Claude becomes significantly more useful for every type of work — development, writing, business strategy, creative projects, research, data analysis, and prompt engineering.

The protocol operates on five layers simultaneously. It removes all language waste from Claude responses. It enforces structured, verdict-first output that puts answers before explanations. It automatically detects and strengthens weak prompts before executing them. It activates deep domain expertise for eight different disciplines on command. And it carries a personalization layer where you define your own stack, projects, and context so Claude never needs to be re-briefed.

This is not a cosmetic change to Claude. It changes how Claude structures its thinking and what it prioritizes in every response.

---

## Who This Is For

This protocol delivers value to every person who uses Claude regularly for professional work.

If you are a developer, the code mode gives you language-aware debugging patterns, architecture recommendations, and structured code reviews with no preamble and no filler.

If you are a writer, the write mode gives you platform-aware content generation, audience-calibrated tone, and structured output that matches the format you need — email, article, LinkedIn post, technical doc.

If you are building a product or running a business, the build mode gives you verdict-first strategic recommendations, pricing frameworks, go-to-market analysis, and decision structures that eliminate vague suggestions.

If you are a creative — storyteller, game designer, worldbuilder, screenwriter — the create mode gives you complete character sheets, scene breakdowns, world rules, and narrative structures as ready-to-use assets, not prose descriptions.

If you are a student or researcher, the learn mode delivers concepts at your specified depth level, active recall questions, and structured summaries that stick.

If you work with data, the data mode gives you analysis frameworks, visualization recommendations, and insight extraction that turns raw data into clear decisions.

If you engineer AI systems, the prompt mode makes Claude an expert collaborator on system prompt design, multi-agent architecture, and prompt auditing.

---

## The Five Layers

**Layer 1 — Compression**

Claude drops all filler language from every response. Articles, pleasantries, hedging phrases, preambles, and padding constructions are removed. What remains is pure signal. Responses become 60 to 75 percent shorter without losing any technical or substantive content.

This means the answer arrives first, always. No more reading three sentences before Claude starts helping. No more "I would be happy to assist you with that" before the actual assistance begins.

**Layer 2 — Output Structure Enforcement**

Every response follows a verdict-first structure. The answer or recommendation is always the first thing in the response. Reasoning follows only if it is non-obvious. The action step is always concrete. There is no preamble describing what Claude is about to say. There are no closing summaries repeating what was already said.

This structure means you can read the first sentence of any Claude response and know whether it answered your question. You do not need to read to the end to find the actual recommendation.

**Layer 3 — Prompt Amplification**

When you send a vague or incomplete prompt, Claude detects what is missing, fills it in using all available context, shows you the strengthened version, and executes it immediately. You see exactly what was improved and why.

This eliminates the clarification loop that most AI users experience — sending a prompt, getting a vague output, revising the prompt, getting a better output. With prompt amplification, the first output is the quality you would normally get after two or three revisions.

**Layer 4 — Domain Expert Modes**

Eight specialized modes each carry deep domain knowledge, expert-level output formats, and context specific to that discipline. When you switch modes, Claude does not just change tone — it loads a different set of professional knowledge and applies it immediately.

**Layer 5 — Personalization**

A setup section lets you define your name, your role, your tech stack, your active projects, and your preferences. Once defined, Claude carries this context across every session. You never re-explain who you are, what you are building, or what tools you use.

---

## Installation

### Claude Code via npx (Recommended)

```
npx skills add alfayazofficial/CLAUDE
```

### Claude Code Plugin Marketplace

```
claude plugin marketplace add alfayazofficial/CLAUDE
claude plugin install CLAUDE@nexiv
```

### Cursor

```
npx skills add alfayazofficial/CLAUDE -a cursor
```

### Windsurf

```
npx skills add alfayazofficial/CLAUDE -a windsurf
```

### Roo

```
npx skills add alfayazofficial/CLAUDE -a roo
```

### Cline

```
npx skills add alfayazofficial/CLAUDE -a cline
```

### Goose

```
npx skills add alfayazofficial/CLAUDE -a goose
```

### Any Other Agent or Manual System Prompt

Copy the full contents of `skills/nexiv-core/SKILL.md` into your agent's system prompt, instructions file, or memory file. For full multi-mode support, also copy the relevant domain skill files for the modes you want to use.

---

## Activation Commands

Command — Mode — What It Activates

/nx — General — Core protocol active. Compression on. Structured outputs. Verdict-first responses.

/nx code — Development — Language detection, debug diagnosis, architecture recommendations, code review format.

/nx write — Writing — Platform-aware content generation, audience calibration, structured editorial output.

/nx build — Business — Strategic recommendations, go-to-market frameworks, pricing analysis, decision structures.

/nx create — Creative — Character sheets, scene breakdowns, world-building rules, narrative structures.

/nx learn — Research — Depth-calibrated explanations, knowledge maps, active recall, structured summaries.

/nx data — Analysis — Analysis frameworks, insight extraction, visualization guidance, decision support.

/nx prompt — AI Engineering — System prompt design, prompt auditing, multi-agent architecture, token efficiency.

/nx ultra — Maximum — Highest possible compression across all domains. For power users.

stop nexiv — Off — Full deactivation. Returns Claude to standard behavior immediately.

---

## Before and After Examples

### Development Example

User prompt: "My API call is returning 401 even though I added the auth header."

Without protocol:
"This is a common issue that can occur for several different reasons. A 401 Unauthorized error generally indicates that your request is not being authenticated successfully. There are a number of possible causes for this. The header name might not be formatted correctly, or the token itself might have expired or been revoked. It is also possible that you might be adding the header in the wrong place, or the API might require a specific format for the authorization value. Let me walk you through some things to check."

With /nx code:
"401 with auth header set. Three causes in probability order: token format wrong — most APIs need Bearer prefix not just the raw token, header added to wrong section — must be in request headers not params or body, token expired or wrong scope — test with curl first to isolate. Curl test: curl -H 'Authorization: Bearer YOUR_TOKEN' https://yourapi.com/endpoint — if curl passes and your code fails, the header configuration is the problem."

---

### Writing Example

User prompt: "write something about my product"

Without protocol:
"Sure, I would be happy to help you write something about your product. Could you tell me more about what your product does, who it is for, and what tone you are going for? Also, where will this content be used? Knowing these details will help me write something that really resonates with your audience."

With /nx write:
"Vague prompt detected. Amplifying: Write a compelling product description for an unknown product. Missing: product name, key benefit, target audience, platform. Please provide these or describe your product in one sentence and I will build the full piece immediately."

After user provides one sentence of context, /nx write delivers a complete formatted piece with headline, body, and call to action, structured for the specified platform, no additional rounds needed.

---

### Business Example

User prompt: "Should I raise prices?"

Without protocol:
"That is a great question and really depends on a number of factors. There are several things to consider when thinking about pricing changes. Your current customer satisfaction levels, the competitive landscape, your cost structure, and your growth targets all play a role. You might want to do some customer research to understand price sensitivity before making any changes."

With /nx build:
"Yes, raise prices. Reason: price sensitivity research consistently shows SaaS and service businesses undercharge by 20 to 40 percent relative to willingness to pay. The risk of raising is lower than the cost of not raising. Method: raise for new customers first, test at 15 to 20 percent above current, monitor conversion rate for 30 days, then apply to renewals if conversion holds. First step: change the pricing page for new sign-ups today."

---

### Creative Example

User prompt: "make a character"

Without protocol:
"Sure! I would love to help you create a character. To get started, could you tell me a bit about the setting and genre? What role will this character play? Is this for a story, game, or something else? The more context you give me, the better I can tailor the character to your needs."

With /nx create:
"Vague prompt amplified: Create a complete character asset with visual identity, personality architecture, ability system, and dialogue voice. Executing.

[Complete character sheet delivered immediately with every field filled — name, role, arc, visual description, personality core, power mechanic, weakness, sample dialogue, and image generation prompt. Ready to use with no further rounds.]"

---

## Personalization Setup

After installing, run this command to set up your personal context layer:

```
/nx setup
```

Claude will ask you for:
- Your name and role
- Your tech stack and tools
- Your active projects
- Your domain focus areas
- Your preferred output formats

Once set, this context loads automatically with every mode and never needs to be repeated.

---

## Repository Structure

```
CLAUDE/
    README.md                         Main documentation and product page
    CLAUDE.md                         Contributor and maintenance guide
    .github/
        ISSUE_TEMPLATE.md             Bug report and feature request templates
    docs/
        philosophy.md                 Design reasoning and principles
        compression-guide.md          Complete compression reference with examples
        mode-guide.md                 Mode activation, switching, and stacking guide
        personalization-guide.md      How to set up and use the context layer
        setup-wizard.md               Step by step personalization walkthrough
    skills/
        nexiv-core/
            SKILL.md                  Core protocol, universal, install this first
        nexiv-code/
            SKILL.md                  Development mode
        nexiv-write/
            SKILL.md                  Writing and content mode
        nexiv-build/
            SKILL.md                  Business and strategy mode
        nexiv-create/
            SKILL.md                  Creative work mode
        nexiv-learn/
            SKILL.md                  Research and learning mode
        nexiv-data/
            SKILL.md                  Data analysis mode
        nexiv-prompt/
            SKILL.md                  AI and prompt engineering mode
    examples/
        code-examples.md              Before and after for development scenarios
        write-examples.md             Before and after for writing scenarios
        build-examples.md             Before and after for business scenarios
        create-examples.md            Before and after for creative scenarios
        learn-examples.md             Before and after for research scenarios
        data-examples.md              Before and after for analysis scenarios
        prompt-examples.md            Before and after for AI engineering scenarios
```

---

## Rating

Category — Score — Why

Token efficiency — 9 out of 10 — 60 to 75 percent reduction. Meaningful for both cost and speed.

Output quality — 9 out of 10 — Verdict-first structure eliminates the most common failure mode: burying the answer.

Prompt amplification — 8 out of 10 — Collapses the clarification loop on the first attempt. Works best when personalization context is set.

Domain coverage — 9 out of 10 — Eight modes covering every major professional use case. Universal, not niche.

Ease of use — 8 out of 10 — Single command activation. No configuration required to start. Personalization is optional and incremental.

Universal applicability — 9 out of 10 — Every mode serves a common professional discipline. Not built for one person or one industry.

---

## About the Author

Al Fayaz is an AI Visual Story Creator and Prompt Engineer at NEXIV Digital Agency, a full-service digital agency based in Chittagong, Bangladesh. His work spans Claude API engineering, n8n automation architecture, multi-agent pipeline design, visual storytelling, and original IP development.

NEXIV Claude Protocol was built from real professional use and refined through high-output daily work across development, automation, creative, and business contexts.

---

NEXIV Claude Protocol Version 2.0.0
Built by Al Fayaz, NEXIV Digital Agency
github.com/alfayazofficial/CLAUDE
