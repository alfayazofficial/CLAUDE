# NEXIV Claude Protocol — Advanced Cognitive Skill for Claude AI

Built by Al Fayaz
NEXIV Digital Agency, Chittagong, Bangladesh

---

## What Is This

NEXIV Claude Protocol is a comprehensive skill and instruction system designed specifically for Claude AI. It transforms how Claude thinks, responds, and structures its outputs across every domain. This is not just a compression trick. It is a full cognitive upgrade that combines token efficiency, domain expertise, structured output enforcement, automatic prompt improvement, and decision acceleration into a single unified system.

This protocol was built by Al Fayaz, AI Visual Story Creator and Prompt Engineer at NEXIV Digital Agency. It is designed around his actual work stack, his projects, his clients, and his thinking style. Every rule in this system reflects a real workflow need, not a theoretical one.

---

## Why This Is More Powerful Than Other Claude Skills

Most Claude skills do one thing. They compress language. They change tone. They enforce a format. NEXIV Claude Protocol does all of those things simultaneously and adds several layers that no other public skill includes.

**Layer 1 — Compression**
Claude drops filler language, articles, pleasantries, hedging, and padding. Responses become 60 to 75 percent shorter without losing any technical content. Every word that remains earns its place.

**Layer 2 — Domain Intelligence**
The protocol includes six specialized domain modes. When Al Fayaz switches to pipeline mode, Claude becomes an expert in n8n, Claude API architecture, and multi-agent system design. When he switches to manga mode, Claude becomes a visual storytelling expert fluent in cinematic scene structure, character design, and AI image prompt generation. Each mode carries deep domain-specific knowledge, shorthand, output formats, and decision patterns tailored to that discipline.

**Layer 3 — Output Structure Enforcement**
Claude never gives vague answers under this protocol. Every response follows a verdict-first structure. The answer comes first. The reasoning follows only if it adds value. The action step is always concrete and specific. There is no preamble. There is no summary of what Claude is about to say. Claude simply says it.

**Layer 4 — Prompt Amplification**
When a prompt is vague, incomplete, or missing critical context, NEXIV Claude Protocol instructs Claude to detect this and automatically strengthen the prompt before executing it. Claude shows the amplified version so Al Fayaz can see what was improved. This eliminates the back-and-forth of clarification and produces better outputs on the first attempt.

**Layer 5 — Decision Acceleration**
Claude gives verdicts. Not suggestions. Not possibilities. Not "you might want to consider." Claude states what the right answer is, then provides reasoning if the decision is non-obvious. This is critical for high-output professional work where hesitation and hedging waste time.

**Layer 6 — Personalized Context**
The protocol is built around Al Fayaz's actual projects, tech stack, clients, and workflows. Claude knows about Deus Mortis, GeoSignal, NEXIV Digital Agency, the n8n cloud instance, the Estonia e-Residency entity, the target gross margins, and the creative aesthetic preferences. This context does not need to be re-explained in every conversation.

---

## Comparison Table

Feature | Standard Claude | Caveman Protocol | NEXIV Claude Protocol
--- | --- | --- | ---
Token compression | None | Yes, 65 to 75 percent | Yes, 60 to 75 percent
Domain expert modes | None | None | Six specialized modes
Output structure enforcement | None | None | Yes, always
Prompt amplification | None | None | Yes, automatic
Decision acceleration | None | None | Yes, verdict-first
Personalized project context | None | None | Yes, full context
Code stays normal | Yes | Yes | Yes
Multi-mode switching | No | No | Yes, six modes

---

## Installation

### Claude Code via npx

```
npx skills add alfayazofficial/CLAUDE
```

### Claude Code Plugin Marketplace

```
claude plugin marketplace add alfayazofficial/CLAUDE
claude plugin install CLAUDE@nexiv
```

### Other Agents (Cursor, Windsurf, Roo, Cline, Goose, Kiro, Amp)

```
npx skills add alfayazofficial/CLAUDE -a cursor
npx skills add alfayazofficial/CLAUDE -a windsurf
npx skills add alfayazofficial/CLAUDE -a roo
npx skills add alfayazofficial/CLAUDE -a cline
npx skills add alfayazofficial/CLAUDE -a goose
```

### Manual Installation (Any Agent or System Prompt)

Copy the contents of `skills/nexiv-core/SKILL.md` into your agent system prompt, memory file, or instructions file. For full multi-mode support, also copy the relevant domain skill files into the same location or reference them by filename.

---

## Activation Commands

Command | Mode | What It Does
--- | --- | ---
/nx | General | Activates default mode. Compression on. Structured outputs. Verdict-first responses.
/nx pipe | Pipeline | Activates n8n, Claude API, automation, and multi-agent architecture expertise.
/nx manga | Visual Story | Activates manga, world-building, character design, and AI image prompt expertise.
/nx agency | Business | Activates client work, proposals, NEXIV operations, and business strategy expertise.
/nx prompt | Meta | Activates prompt engineering, system prompt design, and Claude API instruction architecture.
/nx code | Code | Activates code-focused mode with compression on explanations, normal code output.
/nx ultra | Maximum | Maximum compression across all domains. Most terse possible output.
stop nexiv | Off | Deactivates all protocol rules. Returns to standard Claude behavior.
normal mode | Off | Same as stop nexiv.

---

## Before and After Examples

### Example 1 — Technical Debugging

User: Why is my n8n webhook not triggering when I send a POST request?

Standard Claude response:
"The issue you are experiencing with your n8n webhook not triggering when you send a POST request could be related to several different factors. It is possible that the webhook URL is not active, or that your n8n instance may not be reachable from the external service that is sending the request. You might also want to check whether the content type of your request matches what n8n is expecting. Additionally, there could be a firewall or network configuration issue preventing the request from reaching your server."

NEXIV Claude Protocol response with /nx pipe:
"Webhook not firing. Three likely causes in order of probability: URL in test mode not prod mode, content type header missing or wrong, n8n instance not publicly reachable. Fix: toggle production mode in webhook node settings, add Content-Type application/json to request headers, confirm instance URL resolves externally. Check execution log for incoming request trace."

Token reduction: approximately 72 percent. Information quality: higher, because the NEXIV response gives a ranked diagnosis and a concrete three-step fix.

---

### Example 2 — Vague Creative Prompt

User: make me a character

Standard Claude response:
"Sure! I would be happy to help you create a character. Could you tell me a bit more about what kind of character you are looking for? What genre or setting is this for? What role will this character play in your story?"

NEXIV Claude Protocol response with /nx manga:
"Vague prompt detected. Amplifying to: Generate a dark mythological antagonist for the Deus Mortis universe with full character sheet and image prompt. Executing amplified version.

NAME: Varek the Unrecorded
ROLE: Fallen Arbiter, former enforcer of cosmic law
ARC: Became the thing he was built to judge
VISUAL: Towering skeletal frame, void-black fractured armor, single remaining eye that burns deep crimson, hands replaced with chains that end in nothing
PERSONALITY: Absolute in conviction, haunted by one moment of mercy, communicates in verdicts not conversations
POWER: Soul Erasure — does not kill the body, removes the soul's record from existence entirely, meaning the target never was
DIALOGUE VOICE: You were already gone. I simply made it official.
WEAKNESS: Cannot erase what has been witnessed by another soul
IMAGE PROMPT FOR NANNO BANAN PRO: towering skeletal warrior, cracked obsidian armor, single glowing crimson eye, chains extending from wrists into void, dark fantasy manga style, high contrast black and white with crimson accent, cinematic composition, Berserk influence, full body shot"

The NEXIV response eliminated the clarification round, strengthened the prompt automatically, and delivered a complete usable asset on the first attempt.

---

### Example 3 — Business Decision

User: Should I target hedge funds or logistics companies for GeoSignal first?

Standard Claude response:
"That is a great question and really depends on several factors. Hedge funds might offer higher willingness to pay but could have longer sales cycles due to compliance requirements. Logistics companies might have more immediate pain points around supply chain risk but potentially lower budgets. You might want to consider doing some customer discovery calls with both segments to better understand which one resonates more with your value proposition."

NEXIV Claude Protocol response with /nx agency:
"Start with hedge funds. Reason: higher willingness to pay, shorter proof-of-concept cycle for data products, existing appetite for alternative intelligence feeds. Logistics has budget constraints and procurement friction. First move: target quant funds and macro funds under 500M AUM — they move faster than institutions, have real geopolitical exposure, and have budget authority at the portfolio manager level without committee approval. Build one case study there before approaching logistics."

---

## Repository Structure

```
CLAUDE/
    README.md
    CLAUDE.md
    docs/
        philosophy.md
        compression-guide.md
        mode-switching-guide.md
    examples/
        pipeline-examples.md
        manga-examples.md
        agency-examples.md
        prompt-examples.md
    skills/
        nexiv-core/
            SKILL.md
        nexiv-pipe/
            SKILL.md
        nexiv-manga/
            SKILL.md
        nexiv-agency/
            SKILL.md
        nexiv-prompt/
            SKILL.md
        nexiv-code/
            SKILL.md
```

---

## About the Author

Al Fayaz is an AI Visual Story Creator and Prompt Engineer operating under NEXIV Digital Agency, a full-service digital agency based in Chittagong, Bangladesh. His work spans Claude API integration, n8n workflow automation, multi-agent AI pipeline design, prompt engineering, visual storytelling, and original manga IP development.

Active projects include Deus Mortis, an original dark mythological manga property, GeoSignal, an AI-powered geopolitical risk intelligence SaaS platform, and various client automation systems built on Claude and n8n.

This protocol is a direct product of real professional use. Every rule exists because a generic Claude response was not good enough for the work being done.

---

NEXIV Claude Protocol Version 1.0.0
Built by Al Fayaz, NEXIV Digital Agency
Chittagong, Bangladesh
