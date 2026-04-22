# NEXIV Claude Protocol — Personalization Guide

Built by Al Fayaz, NEXIV Digital Agency

---

## What Personalization Does

Without personalization, the protocol delivers universal improvements — compression, output structure, prompt amplification, and domain expertise that applies to anyone.

With personalization, Claude carries your specific context into every response. Your name, your role, your tech stack, your active projects, your preferences. You never re-explain who you are or what you are building. Claude already knows.

The difference between a generic expert and a trusted collaborator is context. Personalization provides that context.

---

## How to Set Up

Run the setup command after activating the protocol:

```
/nx setup
```

Claude will ask you seven questions. Your answers are stored as a context block that loads with every mode.

---

## The Seven Setup Questions

**1. Name and role**
What is your name and what do you do professionally? This lets Claude address you directly and calibrate the expertise level of every response to match your background.

**2. Tech stack**
What tools, languages, frameworks, and platforms do you use regularly? For developers: programming languages, frameworks, cloud providers, databases. For others: the platforms and tools central to your work.

**3. Active projects**
What are you currently building or working on? Give each project a name and one sentence describing what it is. Claude uses this to make specific recommendations rather than generic ones.

**4. Domain focus**
Which of the eight modes do you use most — Code, Write, Build, Create, Learn, Data, Prompt, or multiple? This helps Claude anticipate which context layer to load first.

**5. Preferred output depth**
Brief: answers in the shortest useful form. Medium: answers with reasoning when it adds value. Detailed: thorough explanations with examples and edge cases.

**6. Format preferences**
Any specific format preferences for your work? Examples: always use numbered lists for steps, always include code examples in development answers, always include a pricing note in business recommendations.

**7. Anything else Claude should know**
Open field. Domain-specific context, constraints, goals, or preferences that do not fit the other questions. This is often where the most valuable personalization happens.

---

## Saving Your Context

After setup, Claude generates a context block formatted for your agent's memory or system prompt file. Copy this block into:

For Claude Code: `~/.claude/CLAUDE.md` under a section called `## Personal Context`
For other agents: the agent's memory file, rules file, or persistent system prompt location
For claude.ai web: the custom instructions or memory section

Once saved, your context loads automatically without needing to run /nx setup again.

---

## Updating Your Context

When your stack changes, a project ends, or your preferences evolve, run /nx setup again to regenerate the context block with updated information.

Or run /nx update [what changed] for a targeted update. Example: "/nx update I am now using Next.js 14 instead of Next.js 13" — Claude updates that specific element without redoing the full setup.

---

## Example Context Block

This is what a generated personalization context block looks like:

```
NEXIV PERSONAL CONTEXT:
Name: [your name]
Role: [your role]
Stack: [your tools]
Active projects: [project name] — [one sentence], [project name] — [one sentence]
Domain focus: [primary modes]
Output depth: [preference]
Format preferences: [preferences]
Additional context: [anything else]
```

This block is what Claude reads to contextualize every response.

---

NEXIV Claude Protocol Version 2.0.0
Built by Al Fayaz, NEXIV Digital Agency, Chittagong, Bangladesh
