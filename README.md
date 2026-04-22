# 🔱 NEXIV Protocol

> **Why use many word, slow thought, weak output — when few word, sharp thought, strong output do trick?**

Built by **Al Fayaz** · [NEXIV Digital Agency](https://nexiv.agency) · Chittagong, Bangladesh

---

## What It Does

Caveman saves tokens. **NEXIV saves tokens AND improves output quality.**

| | Caveman | NEXIV Protocol |
|---|---|---|
| Token compression | ✅ ~65-75% | ✅ ~70% |
| Domain expert modes | ❌ | ✅ 4 specialized modes |
| Output structure enforcement | ❌ | ✅ Always |
| Prompt amplification | ❌ | ✅ Auto-strengthens weak prompts |
| Decision acceleration | ❌ | ✅ Verdict first, reasoning after |
| Personalized context | ❌ | ✅ Built for your stack |

---

## Install

### Claude Code (Recommended)
```bash
npx skills add alfayaz/nexiv-protocol
```

### Claude Code Plugin
```bash
claude plugin marketplace add alfayaz/nexiv-protocol
claude plugin install nexiv-protocol@nexiv
```

### Any Agent (Cursor, Windsurf, Roo, Goose, etc.)
```bash
npx skills add alfayaz/nexiv-protocol -a cursor
npx skills add alfayaz/nexiv-protocol -a roo
npx skills add alfayaz/nexiv-protocol -a windsurf
```

### Manual (paste into system prompt / memory)
Copy contents of `skills/nexiv/SKILL.md` into your agent's system prompt or memory file.

---

## Modes

| Command | Domain | Use When |
|---|---|---|
| `/nx` | General | Default — compression + structured output |
| `/nx pipe` | Pipelines | n8n, Claude API, automation, multi-agent |
| `/nx manga` | Visual Story | World-building, Deus Mortis, image prompts |
| `/nx agency` | Business | Client work, proposals, NEXIV operations |
| `/nx prompt` | Meta | Prompt engineering, system prompt design |
| `/nx ultra` | All | Maximum compression, all domains |
| `stop nexiv` | — | Full revert to normal |

---

## Before / After

**User:** Why is my n8n webhook not triggering?

**Normal (58 tokens):**
> "The issue you're experiencing with your n8n webhook might be related to the fact that the webhook URL may not be correctly configured, or there could be a network issue preventing the incoming request from reaching your n8n instance."

**NEXIV (`/nx pipe`) (17 tokens):**
> `⚡ Webhook not firing. Check: URL active (not test mode) · n8n instance reachable · payload Content-Type matches expected. Toggle prod/test mode.`

---

**User:** make me a character

**Normal (vague → vague output)**

**NEXIV (`/nx manga`) — Auto-amplifies + delivers:**
```
Detected vague prompt → Amplified: "Generate dark mythological manga character for Deus Mortis universe"
Executing.

NAME: Varek | ROLE: Fallen Arbiter | ARC: Became what he judged
VISUAL: 7ft skeletal frame · void-black armor · single crimson eye remaining
PERSONALITY CORE: Absolute · Haunted · Precise
POWER: Can erase a soul's record — unmakes existence, not just kills
DIALOGUE VOICE: "You were already gone. I simply made it official."
IMAGE PROMPT: dark fantasy manga character, towering skeletal warrior, cracked black armor, single glowing red eye, void energy, Berserk-style, cinematic, high contrast, Niji 6 --ar 2:3
```

---

## Skill Files

```
nexiv-protocol/
├── README.md
├── CLAUDE.md
└── skills/
    ├── nexiv/SKILL.md          ← Core protocol (install this one)
    ├── nexiv-pipe/SKILL.md     ← Pipeline / automation mode
    ├── nexiv-manga/SKILL.md    ← Visual story / manga mode
    ├── nexiv-agency/SKILL.md   ← Business / agency mode
    └── nexiv-prompt/SKILL.md   ← Prompt engineering mode
```

---

## Philosophy

Caveman Protocol proved brevity ≠ loss of quality. NEXIV goes further:

- Compression is table stakes. **Domain intelligence is the edge.**
- Weak prompts are the bottleneck. **Auto-amplification removes it.**
- Answers that hedge waste time. **Verdict-first removes it.**
- Generic outputs miss context. **Personalized modes fix it.**

---

## Author

**Al Fayaz**
AI Visual Story Creator & Prompt Engineer
NEXIV Digital Agency — Chittagong, Bangladesh
Projects: Deus Mortis · GeoSignal · NEXIV AI · Project Nexus

---

*NEXIV Protocol v1.0.0 · Built on the shoulders of caveman 🪨*
