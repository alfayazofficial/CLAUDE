# Task 1 — Live IT Incident Response

**Candidate:** Abdullah Al Fayaz · **Role:** AI-Native IT Manager, Ajaia LLC

## Triage: four issues, one order

I do not treat these as four equal fires. I rank them by *blast radius × time-sensitivity*:

| # | Issue | Priority | Why |
|---|---|---|---|
| 1 | Exposed AI API key | **P1 — now** | Active, exploitable, costs money, and may touch client data. Every minute matters. |
| 2 | Over-permissioned Notion / Drive | **P1 — within 24h** | Likely the larger *latent* risk: healthcare/education data may be readable by people who should not see it. It is not being exploited as far as we know, so it waits behind the key, but not long. |
| 3 | Ungoverned AI tools | **P2 — interim rule today, real governance in 30 days** | Ongoing data leakage risk. One sentence of policy today stops the bleeding; the full model takes time. |
| 4 | Slow, inconsistent onboarding | **P3 — but a multiplier** | 25+ people are arriving. Every new hire onboarded badly widens issues 2 and 3. I fix it right after containment, not before. |

**Principle:** contain first, investigate second, fix root cause third, communicate throughout. I name one incident owner (me) so nobody waits on a committee.

---

## 1A. Immediate Response (0–2 hours)

### What I do first, and why

**Minute 0–10: declare the incident and get facts.**
1. Open a private incident channel (`#inc-2026-xx-apikey`) and a running timeline doc. Everything gets a timestamp. I will need this for any compliance conversation later.
2. Ask only the questions that change my next action:
   - Which key, which provider, which permissions/scopes?
   - Where was it exposed (public GitHub repo, Slack, Notion page, a screenshot, a client-facing doc)?
   - When was it exposed, and for how long?
   - What systems or data can that key reach (does it touch PHI or student records)?
3. Tell the CEO/leadership in two lines: *"Key exposed, I am rotating it now, will update in 60 minutes."* Short, factual, no speculation.

**Why this order:** the cost of a 10-minute fact-find is small. The cost of rotating a key I do not understand (breaking production) or ignoring where it leaked (leaving a second copy live) is larger.

### Containment steps for the API key exposure

**Rule: assume the key is compromised the moment it was exposed. Rotating is the fix. Cleaning up the leak is not.**

| Step | Action | Why |
|---|---|---|
| 1 | **Revoke or rotate the key at the provider** (do not just delete the message or commit) | A key in a public place is already scraped. Bots find leaked keys in minutes. Deleting the post does not un-leak it. |
| 2 | **Issue a replacement** with the *minimum* scope, store it in a secrets manager (not env files in chat, not Notion), and deploy it to the dependent service | Restores service with a safer setup. If the dependent service is business-critical, I do step 2 *before* step 1 by minutes, using overlap rotation, so we do not cause an outage. |
| 3 | **Review provider usage logs** for the whole exposure window: unfamiliar IPs, unusual models, spikes in tokens, off-hours usage | Tells us if it was actually abused. |
| 4 | **Set hard spend limits and alerts** on the provider account | Caps the damage if another key leaks. |
| 5 | **Remove the exposed copy**: scrub the commit/page/message, purge git history if needed (`git filter-repo`), and ask search engines/caches to drop it if public | Secondary hygiene. The key is already dead. |
| 6 | **Hunt for sibling secrets**: run a secret scan (gitleaks / trufflehog / GitHub secret scanning) across repos, Notion, Drive and Slack | Where there is one leaked key there are usually more. |
| 7 | **Turn on push protection** in GitHub so it cannot be committed again | Prevention starts today, not in the long-term plan. |
| 8 | **Decide on data impact**: did the key give access to client data? If yes, escalate to the compliance/legal decision path (below) | Under HIPAA, a breach assessment clock starts at *discovery*, so I document when we found it. |

### The compliance question I raise in hour one
If the key could reach client health or student data, I do **not** decide alone whether it is a reportable breach. I log the facts, preserve evidence, and bring in counsel/compliance within the first day. HIPAA's four-factor risk assessment and client contract notification clauses decide the answer, not my gut. If there is no evidence of data access, I document that conclusion and why.

### End of hour 2 — what "done" looks like
- Old key dead, new key live, service healthy.
- Usage logs reviewed, abuse yes/no stated.
- Spend caps on.
- Leadership updated in writing.
- Remaining items assigned with owners and times.

---

## 1B. Short-Term Fixes (24 hours)

### Access cleanup (Notion / Google Drive)

I use **restrict first, tidy later**. I do not delete anything.

1. **Get the facts:** export the Drive sharing report (Admin console → Reporting → Drive audit) and the Notion workspace member/page-sharing list. Sort by: shared "anyone with the link", shared externally, org-wide edit access, owned by people who have left.
2. **Triage by sensitivity, not alphabetically.** Anything that might contain client data (healthcare, education), credentials, contracts or HR comes first.
3. **Change "Anyone with the link" and "Entire organization can edit" to restricted** on the sensitive set. Preserve named collaborators.
4. **Move client-data content into restricted shared drives / Notion teamspaces** owned by a group, not a person, with named members only.
5. **Org-level settings:** set Drive default sharing to restricted, disable external sharing outside allow-listed domains for sensitive drives, require admin approval for new Notion guests.
6. **Remove stale access:** departed staff, contractors without active work, duplicate guest accounts.
7. **Log every change** (who, what, before/after) so I can reverse a mistake and prove the cleanup.

*What I deliberately do not do:* mass-revoke everything at once. That breaks work, trains people to ignore IT, and hides real owners. I fix the riskiest 20% in 24 hours and schedule the rest.

### Risk reduction steps
- **MFA enforced for everyone** on Google Workspace, Notion, GitHub and the AI platforms. Prefer passkeys or authenticator apps over SMS.
- **Inventory OAuth apps and browser extensions** connected to company accounts. Revoke unknown ones.
- **Interim AI rule (published today):** *No client data, PHI, student records or credentials may be pasted into any AI tool that IT has not approved. If unsure, ask in #it-help.* One sentence, impossible to misread.
- **Publish a short approved-tools list** with the 3–5 tools I can verify today (enterprise tiers, no training on our data).
- **Check the other admin and service accounts** for shared passwords and move them into a password manager.

### Communication approach

**Principles:** fast, factual, blame-free, one source of truth. People hide mistakes when they are punished for them, and I need people to report problems early.

| Audience | Message | Channel | When |
|---|---|---|---|
| **Leadership** | What happened, impact so far, what I did, what I need from them (decisions on client notification) | Direct message plus 1-page brief | Hour 1, hour 4, end of day |
| **All staff** | "We found some sharing settings and a leaked key. We fixed it. Here is what changes for you, here is what to do (2 actions). No one is in trouble." | Slack announcement | Within 24h |
| **People whose access changes** | What changed, why, how to request it back (link to ticket form) | Direct message | Before or as I change it |
| **Affected clients** | Only if the facts and counsel say so | Via leadership/counsel | Counsel decides |

The all-staff message ends with a single place to ask questions (`#it-help`), so I do not become a bottleneck on direct messages.

---

## 1C. Long-Term Prevention

### System changes to prevent recurrence

| Problem | Root cause | System fix |
|---|---|---|
| Key exposed | Secrets handled by hand; no scanning | Central **secrets manager** (1Password for humans, cloud Secret Manager for services); **secret scanning + push protection** in GitHub; **short-lived, scoped, per-service keys**; scheduled rotation; **spend caps** on every AI account; route all LLM calls through an **AI gateway** so app code never holds raw provider keys |
| Over-permissioned docs | Default-open sharing, no ownership, no reviews | **Restricted-by-default** sharing; **group-based** access, never individuals; every folder and teamspace has a named owner; **quarterly access reviews** with owner sign-off; **DLP rules** that flag PHI-like patterns shared externally; automated "anyone with link" report weekly |
| Shadow AI | No approved path, so people made their own | An **AI tool registry** and fast intake process (below); SSO-only access; browser/network visibility into AI domains; make the approved path *faster* than the shadow path |
| Slow onboarding | Manual, person-dependent | **Role-based onboarding automation** (identity group → every app and permission provisioned from one trigger); device shipped pre-enrolled in MDM; day-one checklist; offboarding is the same workflow in reverse |
| Repeat incidents | No learning loop | Blameless **post-incident review** within 5 business days; action items tracked as tickets with owners and dates |

### Governance model for AI tools

**Goal: be the department that says "yes, safely" quickly, not the one that says "no".**

**1. Classify tools into three tiers**

| Tier | Meaning | Examples of what qualifies | Data allowed |
|---|---|---|---|
| 🟢 **Approved** | Reviewed, enterprise agreement, SSO, logging, no training on our data, BAA where needed | Selected LLM platform, coding copilot, meeting notes tool (once vetted) | Up to the classification each is approved for |
| 🟡 **Limited** | Reviewed, usable for non-sensitive work only | Public-data research tools, image generators | Public and internal-only data. **Never client data.** |
| 🔴 **Prohibited** | Failed review or no review | Free consumer tools using inputs for training; unknown browser extensions | None |

**2. Intake: one form, 5-business-day SLA.** Reviewer checklist:
- Does the vendor train on our inputs? Can that be disabled by contract?
- Data retention and deletion; data residency
- Will the vendor sign a **BAA** (HIPAA) and meet FERPA "school official" conditions?
- SOC 2 report available? SSO/SAML and audit logs supported?
- What can its agents *do* (read mail, write to Drive)? Least privilege and prompt-injection exposure

**3. Who decides:** a small **AI Review Group** of three: IT (me), a security/compliance lead (can be fractional or external at this stage), and a business owner of the use case. Anything touching regulated data needs compliance sign-off. Everything else I can approve alone.

**4. Rules that apply to every tool**
- Access through company SSO only. No personal accounts for work.
- Data classification decides what goes in. Regulated data only goes to tools approved for it, ideally **de-identified first**.
- **A human is accountable** for any AI output that goes to a client or affects a person.
- Agents and automations use **scoped service accounts** with least privilege, never a person's full credentials.
- All calls to approved models go through the gateway, which provides logging, spend caps and redaction.

**5. Review cadence:** registry reviewed quarterly; vendors re-checked when terms or model providers change; usage report to leadership monthly.
