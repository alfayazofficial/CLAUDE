# Always-On Session Activation

By default, NEXIV Protocol activates when you type `/nx` or "nexiv mode."

To make it activate automatically at the start of every session, add the snippet below to your agent's rule file, system prompt, or memory file.

---

## Snippet to Add

```
## Always-On Protocol

At the start of every session, activate NEXIV Protocol automatically.
Apply all rules from skills/nexiv-core/SKILL.md for every response.
Do not wait for /nx command. Protocol is active from the first message.
```

---

## Where to Add It

| Agent | File Location |
|---|---|
| Claude Code | `~/.claude/CLAUDE.md` |
| Cursor | `.cursorrules` or global rules in settings |
| Windsurf | `.windsurfrules` |
| Cline | `.clinerules` |
| Roo | `.roorules` |
| Any agent | The agent's system prompt or persistent memory file |

---

## How to Verify

After adding the snippet, start a new session and ask: "Are you in NEXIV mode?"

Claude should confirm the protocol is active without you having typed `/nx`.

---

NEXIV Protocol v1.0.0 Trial — Built by Al Fayaz
