# AI Workflow Note

> **EDIT BEFORE SUBMITTING.** Everything in [brackets] must reflect what you actually did. The evaluators are testing honesty and judgment. Do not claim an override you did not make, and be ready to defend every line in the interview.

## Which AI tools I used
- **Claude (Claude Code)**: structured first drafts of the incident response, architecture, compliance mapping, ticketing design and the video outline.
- [Add any others you actually used, e.g. search, a diagramming tool, a second model for review.]

## How they helped
- **Speed on structure:** AI produced the skeleton (headings, tables, the ASCII architecture diagram, the control-mapping matrix) quickly, so my time went into judgment instead of formatting.
- **Coverage check:** used it as a checklist partner to make sure I had not missed a rubric area (HIPAA / FERPA / SOC 2 mapping, SLA tiers, device posture).
- **Drafting repetitive content:** tables for roles, SLAs, and workflow steps.
- **Rehearsal:** drafted the video script and timings.

## Where I overrode or corrected AI output
*(Replace with your real examples. These are the types of decisions worth stating, include only the ones that are true for you.)*
1. **Ordering of the four incidents.** [The AI tended to treat all four equally. I ranked the key exposure first, permissions second, AI governance third, onboarding fourth, because of blast radius and time-sensitivity.]
2. **Compliance claims.** [I removed or softened wording that implied "HIPAA certified" or quick "SOC 2 compliance". HIPAA has no certification, and SOC 2 is an auditor's attestation (Type I, then Type II after an observation window).]
3. **Over-automation.** [I limited AI to recommend-and-draft for anything touching access, MFA resets or regulated data, with humans approving. I rejected a fully autonomous IT agent.]
4. **Tool sprawl.** [I trimmed the vendor list to a small set (one IdP, one MDM, one compliance platform, one ITSM) because 25 people cannot operate a large stack.]
5. **Unverifiable numbers.** [I labelled impact figures as targets to measure, not results, and dropped any invented statistics.]
6. **No prototype.** [I chose not to ship a thin prototype in the time limit and put effort into design quality.]

## Decisions that were ultimately my own
- The **priority order** and the "contain first, investigate second" principle.
- **Restrict first, clean later** for permission cleanup, rather than mass deletion.
- **Google Workspace as the IdP now, revisit at scale**, rather than adding Okta immediately.
- The **three-tier AI governance model** (approved / limited / prohibited) and the one-line interim rule.
- **Where humans stay in the loop** (access to regulated data, privileged actions, incident decisions).
- The **honest compliance timeline** and the choice to build one control set mapped to three frameworks.
- The **30-day sequencing**: stabilise, inventory, foundations, onboarding automation first because of the 25+ hires.

## How I verified AI output
- [Checked compliance statements against primary sources: HHS HIPAA Security and Breach Notification Rules, U.S. Dept. of Education FERPA school-official guidance, AICPA Trust Services Criteria.]
- [Re-read every number and tool claim and removed what I could not stand behind.]
- [Tested the logic by walking the key-leak scenario end to end.]
