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

---

# Task 2 — AI-Native IT Infrastructure Design

## Design principles (the "why" behind every choice)
1. **Identity is the control plane.** Every access decision flows from one identity, one group model, one audit trail.
2. **Classify data first, then design controls.** Not all data deserves the same friction. Regulated data gets strong controls, everything else stays fast.
3. **Buy and configure before building.** At ~25 people with sensitive data, a small number of well-configured platforms beats a custom stack.
4. **Automate evidence.** Compliance that depends on screenshots fails. Compliance that is generated by the system passes audits.
5. **AI is a user, a tool, and a threat surface.** It needs identity, least privilege and logging like any other actor.

**Assumptions** (I would verify in week 1): Google Workspace and Notion are in use today (the scenario names Notion and Google Drive); no existing MDM or SSO beyond Google; healthcare clients likely make Ajaia a HIPAA **business associate**; education clients likely make Ajaia a FERPA **school official** under contract.

---

## 2A. Architecture Design

### Core platform choices

| Layer | Choice | Why this, and the tradeoff |
|---|---|---|
| **Identity (IdP)** | **Google Workspace** as the single IdP, SSO/SAML to every app. Phishing-resistant MFA (passkeys / security keys). Move to Okta only if SaaS count or compliance needs outgrow it. | Already in use, one fewer vendor, supports context-aware access. *Tradeoff:* less advanced lifecycle and policy engine than Okta. Acceptable at this size. |
| **Collaboration** | Google Workspace (Drive, Gmail, Meet) + Notion (wiki/projects) + Slack | Matches how the team already works. Regulated content is restricted to specific Shared Drives, not general Notion. |
| **Cloud** | **One cloud, one region policy.** GCP (aligns with Workspace, offers a BAA). Separate projects for prod and non-prod; per-client isolation for regulated workloads. | Single cloud reduces attack surface and skills load. *Tradeoff:* lock-in. Fine for now. |
| **AI layer** | **AI gateway** (e.g., LiteLLM or Portkey self-hosted) in front of approved LLM providers; approved vendor list with BAA / zero-retention terms; enterprise tiers for copilots | One place for keys, logging, redaction, spend caps and model allow-lists. This directly fixes Task 1's key-exposure root cause. |
| **Secrets** | 1Password Business (humans) + cloud Secret Manager (services) | No keys in code, chat or Notion. |
| **Endpoint** | MDM (Kandji or Jamf for Mac; Intune if Windows is needed) + EDR (CrowdStrike Falcon Go / SentinelOne / Defender) | Pick **one** MDM. Posture feeds into access decisions. |
| **Network access** | ZTNA (Cloudflare Zero Trust or Tailscale) instead of a flat VPN | Per-app access, works for multi-region remote teams. |
| **Logging / SIEM-lite** | Workspace + cloud audit logs + MDM + IdP → log store (BigQuery or Panther) with alert rules | Real SIEM is overkill now. Centralised, retained, queryable logs are the requirement. |
| **Compliance automation** | **Vanta or Drata** | Continuous control monitoring, policy library, auditor evidence, access reviews. Cuts SOC 2 prep from months to weeks. |
| **ITSM / ticketing** | Jira Service Management (or Linear + Slack if kept lighter) | SLAs, audit trail, Slack integration, automation rules. |

### Architecture diagram

```
                           ┌─────────────────────────────────────────┐
                           │              PEOPLE & DEVICES             │
                           │  Employees (multi-region) · Contractors    │
                           │  Managed laptops (MDM+EDR) · BYOD mobile   │
                           └───────────────────┬─────────────────────┘
                                               │  device posture + MFA
                                               ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │   IDENTITY CONTROL PLANE — Google Workspace (SSO / SAML / SCIM)    │
        │   Groups = roles · Passkeys/security keys · Context-aware access   │
        └───────┬───────────────┬───────────────┬──────────────┬───────────┘
                │               │               │              │
                ▼               ▼               ▼              ▼
        ┌────────────┐  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
        │COLLABORATION│  │  BUSINESS   │ │  ENGINEERING │ │  IT / SEC OPS│
        │ Drive Mail  │  │ SaaS (CRM,  │ │ GitHub, CI   │ │ MDM, EDR,    │
        │ Notion Slack│  │ finance,HR) │ │ GCP projects │ │ ITSM, Vanta  │
        └──────┬─────┘  └──────┬──────┘ └──────┬───────┘ └──────┬───────┘
               │               │               │                │
               │      L0-L2 data (public / internal / confidential)
               │                               │                │
               │         ┌─────────────────────▼────────────┐   │
               │         │   AI GATEWAY (policy enforcement)  │   │
               │         │ keys · logging · PII/PHI redaction │   │
               │         │ model allow-list · spend caps      │   │
               │         └───────┬───────────────┬───────────┘   │
               │                 ▼               ▼               │
               │       ┌────────────────┐ ┌────────────────┐     │
               │       │ Approved LLMs  │ │ Copilots/agents │     │
               │       │ (BAA, no train)│ │ scoped svc accts│     │
               │       └────────────────┘ └────────────────┘     │
               │                                                  │
        ┌──────▼──────────────────────────────────────────────────▼──────┐
        │        REGULATED ZONE — L3 data (PHI, student records, PII)      │
        │  Restricted Shared Drives · per-client GCP projects · CMEK       │
        │  Named-group access only · JIT elevation · full audit logging     │
        │  De-identify before it leaves this zone (esp. before AI use)      │
        └──────────────────────────────┬───────────────────────────────────┘
                                       │ all logs
                                       ▼
        ┌──────────────────────────────────────────────────────────────────┐
        │  LOGGING & COMPLIANCE — central log store · alert rules · Vanta    │
        │  Evidence for SOC 2 / HIPAA / FERPA · access reviews · incident    │
        └──────────────────────────────────────────────────────────────────┘
```

### How the systems connect

**Identity flow:** HR system (or a simple hire form) → creates user in Google Workspace → **group membership** (department + role) → SCIM/SAML pushes accounts and permissions into Notion, Slack, GitHub, ITSM and other apps. **No one gets access by being added to an app directly.** Offboarding removes the Google user and everything downstream follows within the hour.

**Data flow:** Data enters at one of four classification levels (below). L3 data stays in the Regulated Zone. If L3 data must feed an AI workflow, it goes through the AI gateway, which **de-identifies/redacts first** and only calls models that have a BAA and no-retention terms. AI outputs written back are tagged with the source classification.

**Permission flow:** access is *role-based by default, project-based for client data, time-limited for anything elevated*. Every grant and every use is logged to the central store.

**Data classification used everywhere**

| Level | Name | Examples | Rule |
|---|---|---|---|
| L0 | Public | Website, marketing | No restriction |
| L1 | Internal | Policies, general wiki | Employees only |
| L2 | Confidential | Contracts, financials, client business info | Need-to-know groups, no external sharing without approval |
| L3 | Regulated | PHI, student education records, PII | Regulated Zone only, named access, logged, encrypted, de-identified for AI |

---

## 2B. Security and Access Control

### IAM structure

**Roles are Google groups. Groups map to permissions. People map to groups.** No direct grants.

| Tier | Who | Access | Controls |
|---|---|---|---|
| **T0 — Standard** | All employees | L0–L1, department tools, approved AI tools | SSO + MFA, managed device |
| **T1 — Department / Project** | By role and project (e.g., `grp-client-acme-delivery`) | L2 and project-specific L3 | Approved by the **data owner**, reviewed quarterly, removed at project end |
| **T2 — Elevated (just-in-time)** | Engineers, analysts needing production or broader L3 access | Time-boxed (e.g., 4–8h) access to prod / regulated data | Ticket + approval + auto-expiry + session logging |
| **T3 — Privileged / Admin** | IT admins, cloud admins (2–3 people max) | Workspace super admin, cloud org admin, MDM | **Separate admin accounts**, hardware security keys, never used for daily work, all actions alerted |
| **Break-glass** | 1–2 emergency accounts | Super admin if SSO fails | Credentials sealed, alerts on any use, tested quarterly |

**Role matrix (illustrative):**

| Role | L1 | L2 | L3 (client) | Prod/Infra | AI tools |
|---|---|---|---|---|---|
| Operations / Sales | ✅ | By need | ❌ | ❌ | Approved tier |
| Delivery / Client success | ✅ | ✅ (their clients) | ✅ project-based | ❌ | Approved + de-identified L3 |
| Engineering / Data | ✅ | ✅ | JIT only | JIT | Approved + gateway |
| IT / Security | ✅ | Audit view | Metadata only, not content | ✅ T3 | Full audit |
| Contractors | Scoped | Project only | Only if contracted and justified | ❌ | Limited tier |

**Lifecycle rules:** access granted via ticket and approval; manager + data owner attest quarterly; leaver access removed **within 1 hour of termination**; contractor accounts auto-expire.

### Device security for remote teams
- **Managed devices only for L2/L3.** Enrolled in MDM at purchase, shipped pre-configured (zero-touch).
- **Baseline enforced by MDM:** full-disk encryption, screen lock, auto-updates (critical patches within 14 days, or faster for actively exploited), firewall on, EDR running, no local admin by default.
- **Device posture gates access.** Non-compliant device = blocked from sensitive apps via Google context-aware access.
- **L3 data does not live on laptops.** Work in browser or controlled drive. Block download/sync of Regulated Zone folders to unmanaged devices.
- **BYOD:** mobile only, with app-level management; no L3 data on BYOD.
- **Remote-first extras:** DNS filtering, secure browser policy (Chrome Enterprise), ZTNA instead of full VPN, lost-device remote lock/wipe within 1 hour, regional travel guidance (high-risk country device policy).
- **Phishing-resistant MFA** (passkeys/security keys) for all admins and anyone with L3 access.

### Data protection model for sensitive client data
1. **Minimise:** collect and copy only what the work needs. Fewer copies = less to protect.
2. **Isolate:** per-client project and drive boundaries. A compromise of one client's scope does not expose another's.
3. **Encrypt:** TLS in transit, encryption at rest, customer-managed keys (CMEK) for the Regulated Zone.
4. **Control egress:** DLP rules detect PHI/PII patterns on share, email, download and AI-gateway calls. Block or require justification.
5. **De-identify before AI:** strip identifiers before any LLM use, re-attach after if needed. Mapping table stays in the Regulated Zone.
6. **Retention and deletion:** retention schedule per client contract. Deletion on contract end, with proof.
7. **Backups:** encrypted, tested restore, same access rules as source.
8. **Vendor chain:** every vendor that touches L3 has a signed **BAA** (HIPAA) or FERPA-compliant terms, and appears in the vendor register.

### Realistic security risks and mitigations

| # | Risk | Likelihood / impact | Mitigation | Residual risk |
|---|---|---|---|---|
| 1 | **Sensitive data leaks into AI tools** (employee pastes PHI/student data into a consumer LLM, or an AI feature trains on it) | High / High | Approved-tools registry; AI gateway with redaction and logging; DLP on browser and egress; contract terms (no training, BAA); short, clear training; make the approved path faster than the unapproved one | Employees can still paste from memory on a personal device. Training and culture matter. |
| 2 | **Account takeover** (phishing, MFA fatigue, token theft) → access to client data | High / High | Phishing-resistant MFA, device-bound sessions, conditional access, impossible-travel alerts, EDR, short session lifetimes for L3, separate admin accounts | Targeted attacks on individuals. Detection and fast revoke limit the blast radius. |
| 3 | **Access sprawl / oversharing** (the Task 1 problem recurring as the team grows to 25+ and beyond) | High / Medium–High | Group-only grants, owner per resource, restricted-by-default sharing, quarterly reviews, weekly "anyone with link" report, JIT elevation | Reviews depend on owners taking them seriously. Vanta reminders and escalations to leadership. |
| 4 *(bonus)* | **Prompt injection or over-privileged AI agent** acts on untrusted content (reads a malicious doc, then emails data out) | Medium / High | Agents run as scoped service accounts, read-only by default, no outbound email/sharing without human approval, tool-call logging, untrusted content treated as data not instructions | New attack class. Keep humans in the loop for any irreversible or external action. |

---

## 2C. Compliance Framework

**Honest framing first:** these three are different things.
- **HIPAA** is a law. There is no "HIPAA certification". Ajaia must meet the Security, Privacy and Breach Notification Rules as a **business associate**, sign **BAAs** with clients and subprocessors, perform a documented **risk analysis**, and train staff.
- **FERPA** is a law governing student education records. Ajaia operates under the **school official exception**: under the school's direct control, uses records only for the contracted purpose, no re-disclosure.
- **SOC 2** is an **attestation** by an independent auditor against the Trust Services Criteria. Realistic path: **Type I** (design) at roughly months 4–6, **Type II** after a 3–6 month observation window. Do not claim "SOC 2 compliant" until the report exists.

**Strategy: build one control set and map it to all three**, instead of three separate programs.

### How compliance is enforced — technical and operational

| Control family | Technical enforcement | Operational enforcement | HIPAA | FERPA | SOC 2 |
|---|---|---|---|---|---|
| Access control | SSO, MFA, group RBAC, JIT, device posture | Quarterly access reviews, joiner/mover/leaver SLAs | §164.312(a),(d) | Direct control, need-to-know | CC6 |
| Audit logging | Central logs, tamper-resistant, alerting | Weekly log review, anomaly triage | §164.312(b) | Disclosure log | CC7 |
| Encryption | At rest and in transit, CMEK | Key rotation policy | §164.312(a)(2)(iv), (e) | Reasonable safeguards | CC6.1, CC6.7 |
| Risk management | Vulnerability scans, config monitoring (Vanta) | Annual (and on-change) documented **risk analysis** | §164.308(a)(1) | n/a | CC3, CC4 |
| Vendor management | Vendor register, SSO/log checks | BAAs, security review before onboarding, annual re-review | BAA required | Contractual controls | CC9 |
| Incident response | Detection rules, runbooks in ITSM | Tabletop 2x/year, post-incident reviews | Breach rule | Notify school per contract | CC7.3–7.5 |
| Training | LMS completion tracked | Onboarding + annual + role-based (clinical/education data handling) | §164.308(a)(5) | Staff awareness | CC1, CC2 |
| Data lifecycle | Retention / deletion automation | Per-contract schedules, proof of deletion | Minimum necessary | Purpose limitation | C1, P-series as scoped |
| Policies | Policy library in Vanta, versioned | Annual review, acknowledgement tracked | §164.316 (documentation retained 6 years) | Written policy | CC1–CC5 |

### Access, logging and auditing
- **Access:** every grant has a ticket, an approver and an expiry (for T2). Evidence is the ticket and the group membership history.
- **Logging scope:** IdP sign-ins, Drive/Notion access to L3 locations, admin actions, cloud audit logs, MDM/EDR events, **AI gateway calls** (who, which model, data class, redaction result, tokens, cost).
- **Never log raw PHI** in logs. Log metadata, hashes and references.
- **Retention:** security logs retained at least 12 months (hot 90 days), with compliance documentation retained 6 years for HIPAA. Final periods confirmed with counsel and client contracts.
- **Integrity:** logs write to a separate project with restricted write access so an admin cannot quietly alter them.
- **Auditing rhythm:** weekly automated review, monthly IT/security review, quarterly access recertification, annual risk analysis and external audit.

### How AI tools are governed under compliance rules
1. **Approved registry** (Task 1C): each tool recorded with allowed data classes, BAA status, training opt-out, retention and owner.
2. **Data rules by class:** L0–L1 any approved tool; L2 approved enterprise tools; **L3 only through the gateway to BAA-covered, zero-retention models, de-identified where possible**. Anything else is blocked.
3. **Gateway enforcement:** redaction, model allow-list, per-team budgets, logging, kill switch.
4. **Human accountability:** AI-generated content that reaches a client, a patient or a student is reviewed by a named person. No fully automated decisions about individuals.
5. **Vendor review:** BAA, FERPA school-official terms, subprocessors, data location, incident notification terms.
6. **Agents:** least privilege, scoped service accounts, approval required for external actions, full tool-call logging.
7. **Evaluation and change control:** new model or major version = lightweight re-review before it enters the allow-list.

### How violations are detected and prevented

| Layer | Prevent | Detect | Respond |
|---|---|---|---|
| Data egress | DLP blocks PHI patterns to external shares, personal email and unapproved AI domains | DLP alerts, gateway redaction events, unusual download volume | Auto-block, ticket to IT/security, user coaching |
| Access | Restricted-by-default, JIT, device posture | Access to L3 outside normal pattern, impossible travel, new admin grants | Auto-suspend session, review in 1 business hour (P1) |
| Configuration | Baseline policies as code, Vanta continuous tests | Drift alerts (public bucket, MFA off, unmanaged device) | Fix SLA by severity, tracked to closure |
| AI misuse | Gateway allow-list and redaction | Gateway logs: unapproved model, L3 sent unredacted, spend spike | Block, review, retrain, policy update |
| People | Training, clear rules, easy reporting channel | Self-reports encouraged (blame-free), manager escalations | Consistent, documented consequence ladder |

**Breach path:** detect → contain → log timeline → **HIPAA four-factor risk assessment with counsel** → notification decisions (HIPAA: without unreasonable delay and no later than 60 days from discovery; client contracts may be shorter) → post-incident review → control fix. Every incident becomes a ticket with corrective actions, which is also SOC 2 evidence.

---

## 2D. AI-Native IT Operations

Three workflows, chosen because they remove the highest-volume or highest-risk manual work. Impact figures are **targets I would measure**, not claims.

### Workflow 1 — AI IT Support Assistant (troubleshooting and internal chatbot)
- **Tools:** Slack bot + LLM through the AI gateway, retrieval over an approved KB (Notion/Drive IT docs, past resolved tickets), ITSM API, MDM/IdP read APIs.
- **Steps:**
  1. Employee asks in `#it-help` or DMs the bot ("my laptop can't connect to Wi-Fi", "I need access to X").
  2. Bot identifies the user and device context (MDM status, last check-in, app versions: read-only).
  3. Bot retrieves relevant KB articles and past fixes, and walks the user through them.
  4. If solved → bot logs a resolved ticket with the fix.
  5. If not → bot creates a ticket with the full diagnostic summary, category and suggested priority, and routes it.
  6. Weekly: bot proposes new KB articles from repeated tickets.
- **Automated:** answering common questions, collecting diagnostics, ticket creation, KB drafting.
- **Human-controlled:** anything that changes access, resets MFA, or involves L3 data. Final say on new KB articles. Escalated incidents.
- **Expected impact (targets):** deflect 30–50% of Tier-1 requests, cut time-to-first-response to under 1 minute, give IT back several hours per week.

### Workflow 2 — AI Onboarding Assistant (joiner / mover / leaver)
- **Tools:** HR form or ATS trigger, Google Workspace Admin API, SCIM-connected apps, MDM zero-touch, Slack, ITSM, LLM for personalised guidance.
- **Steps:**
  1. Manager submits the new-hire form (name, role, start date, region, manager).
  2. Workflow creates the Google account and adds role-based groups. SCIM provisions Notion, Slack, GitHub and others automatically.
  3. MDM ships a pre-enrolled laptop to the hire's region.
  4. Day-before: the assistant sends the hire a personalised checklist (set up passkey, install nothing manually, read the 5 policies, complete security and compliance training, AI tool rules).
  5. Day one: the assistant answers setup questions in Slack and tracks checklist completion.
  6. Day 7 and 30: the assistant confirms access is correct, collects feedback, and flags any extra access requested.
  7. Leaver: the same flow in reverse, with a 1-hour access removal SLA and device recovery task.
- **Automated:** account creation, group assignment, app provisioning, checklist, reminders, offboarding revocation.
- **Human-controlled:** manager approval of the role template, approval of any access above the template, any L3 access (data owner), the final offboarding sign-off.
- **Expected impact (targets):** time-to-productive access from days to under 1 hour at start; onboarding consistent for all 25+ hires; IT effort per hire cut from hours to minutes of review.

### Workflow 3 — Automated Security and Access Audit
- **Tools:** Vanta/Drata, IdP and cloud audit logs, MDM/EDR APIs, Drive/Notion sharing reports, scheduled jobs, LLM summariser via the gateway, ITSM.
- **Steps:**
  1. Scheduled jobs (daily/weekly) pull: users without MFA, stale accounts, public or "anyone with link" files, unmanaged devices, new OAuth apps, admin changes, dormant privileged access, AI gateway anomalies.
  2. Rules score each finding by severity and data class.
  3. The LLM groups findings and drafts a plain-language summary: what changed, who owns it, suggested fix and why it matters.
  4. Low-risk, reversible fixes are auto-remediated (e.g., remove public link on a non-L3 file, notify owner). Everything else becomes a ticket to the owner with an SLA.
  5. Monthly: the system assembles an access review pack for owners to approve or revoke in one click.
  6. Output is stored as audit evidence.
- **Automated:** detection, scoring, summarising, low-risk reversible remediation, ticket creation, evidence collection.
- **Human-controlled:** approving access changes to L3 or privileged roles, deciding on incidents, accepting risk exceptions, any destructive action.
- **Expected impact (targets):** continuous visibility instead of an annual scramble; mean time to detect oversharing from months to under 24h; SOC 2 evidence collection largely automatic.

**Guardrail for all three:** the AI recommends and drafts; it never holds standing privileged access. It operates as a scoped service account, read-heavy and write-light, with every action logged.

---

## 2E. IT Ticketing System

### Submission channels
| Channel | Use | Notes |
|---|---|---|
| **Slack `#it-help` + `/it` command** (primary) | 80% of requests | The bot creates the ticket from a natural-language message |
| **Web portal form** | Structured requests (access, new tool, hardware) | Dropdown fields reduce back-and-forth |
| **Email `it@`** | Fallback and external parties | Parsed into tickets |
| **Automated sources** | Alerts from EDR, MDM, Vanta, cloud monitoring | Auto-created, pre-categorised |
| **AI intake** | Free text via bot, voice note transcript or screenshot | LLM extracts category, urgency, affected system and asks one clarifying question if needed |

**Security shortcut:** a `/security` command and a pinned "Report a security issue" button create a P1 ticket and page the on-call immediately. Reporting is always blame-free.

### Categorisation
Categories: **Access & Identity · Device & Hardware · Software & SaaS · AI Tool Request · Security Incident · Onboarding/Offboarding · Network & Connectivity · Data/Compliance Request · Other.**
Tags: affected system, region, and a **data-class flag** (set automatically if L3 is mentioned or involved).

### Prioritisation (impact × urgency)

| | **Urgency: blocked now** | **Urgency: can work around** | **Urgency: no deadline** |
|---|---|---|---|
| **Impact: company / client-facing** | P1 | P2 | P3 |
| **Impact: team** | P2 | P3 | P4 |
| **Impact: one person** | P3 | P4 | P4 |

**Overrides:** any suspected security incident or L3 exposure = **P1 automatically**. Executive or client-meeting blockers = bump one level. AI proposes the priority, the agent can change it, and changes are logged.

### Routing and assignment
- **Security incidents** → on-call IT/security lead immediately.
- **Access requests** → auto-routed to the **data/system owner for approval**, then IT executes. L3 access needs owner plus compliance approval.
- **Onboarding/offboarding** → automated workflow, IT reviews exceptions.
- **Device/hardware** → IT agent, with logistics task if shipping is needed.
- **AI tool requests** → AI Review Group intake.
- **Everything else** → round-robin to available agent, with skill tags. With a small team the rule is simple: first on-call, escalate on SLA risk.
- **Follow-the-sun:** regional on-call windows as the team spreads across time zones.

### SLA structure

| Priority | Examples | First response | Target resolution | Escalation if breached |
|---|---|---|---|---|
| **P1** | Security incident, client-facing outage, L3 exposure | 15 min (24/7 on-call) | 4 hours (contain), RCA in 5 days | Auto-page IT manager, notify leadership |
| **P2** | Team blocked, critical app down | 1 hour (business hours) | 1 business day | Notify IT manager |
| **P3** | Single-user issue with workaround | 4 business hours | 3 business days | Weekly review |
| **P4** | Requests, questions, nice-to-haves | 1 business day | 5 business days | Weekly review |

Standard requests have fixed targets: standard access grant 1 business day after approval, new laptop 5 business days, leaver access removal **1 hour**.

### How AI is used
| Function | What the AI does | Guardrail |
|---|---|---|
| **Triage** | Reads the request, classifies category, estimates priority, detects the data class and duplicates or related incidents | Agent can override. Security and L3 rules are deterministic, not left to the model. |
| **Suggest solutions** | Retrieves matching KB articles and similar resolved tickets, drafts a reply or runbook steps for the agent | Agent reviews before sending. Cites the source article. |
| **Reduce workload** | Auto-answers FAQs, asks clarifying questions up front, auto-closes confirmed-resolved tickets, groups repeated issues into problem tickets, drafts KB articles from resolutions | Cannot grant access, reset MFA or touch L3 without a human. |
| **Reporting** | Weekly summary: volume, SLA hit rate, top repeat issues, suggested automation | Metrics reviewed by IT manager. |

**Metrics I would watch:** SLA hit rate, first-response time, deflection rate, repeat-issue rate, reopen rate, and cost per ticket. If deflection rises while reopen rate also rises, the AI is closing tickets badly and I tighten it.

**Prototype:** none built. I prioritised design quality and judgment in the time limit. The first build would be the Slack intake bot plus ITSM automation rules (Week 2–3 below).

---

## 2F. 30-Day Execution Plan

**Order of operations: stop the bleeding → see what we have → build the foundations → automate.**

### Days 1–7: Stabilise and see
**Fix immediately**
- Close out the key-exposure incident (rotation, log review, scanning, spend caps).
- Enforce **MFA** for everyone. Secure the Workspace super-admin accounts (2–3 only, hardware keys, break-glass tested).
- Publish the **interim AI-use rule** and approved-tools list.
- Restrict the highest-risk Drive/Notion exposures (client data first).
- Stand up `#it-help` and a basic intake form so requests stop going to DMs.

**Audit (inventory first, because I cannot protect what I cannot see)**
- Users, admins, groups, guests, contractors, stale accounts.
- All SaaS and OAuth apps connected to company accounts. All AI tools in use (survey + network/OAuth evidence).
- Devices: what exists, who has it, what is encrypted.
- Where client data actually lives.

### Days 8–14: Foundations
- Choose and deploy **MDM** with a baseline policy. Start enrolling devices, new hires first.
- Move to **group-based access**. Create department and client groups. Name an owner for every shared drive and Notion teamspace.
- Roll out the **password/secrets manager**. Move shared credentials and API keys into it.
- Start the **vendor register** and identify which vendors touch L3 and need a **BAA** or FERPA terms.
- Select the compliance platform (Vanta/Drata) and connect it. Get a first gap report.
- Begin the **HIPAA risk analysis** with the compliance lead.

### Days 15–21: Build the first automation
**Build first: the onboarding workflow** (the 25+ hires make it the highest-leverage item) and **ticketing with Slack intake**.
- Role templates for each department. Account creation, groups and app provisioning automated.
- Pre-enrolled laptop shipping process. Day-one checklist.
- ITSM with categories, priorities, SLAs and routing as designed above.
- Draft the first 10 KB articles from the most common questions.

### Days 22–30: Govern and prove
- Launch the **AI tool registry and intake**, with the AI Review Group named.
- Deploy the **AI gateway** in front of approved models (keys centralised, logging and spend caps first, redaction next).
- First **automated weekly security/access audit** report.
- Draft core policies (access control, acceptable use, AI use, incident response, data classification) in the compliance platform.
- Run a **30-minute incident tabletop** (the key-leak scenario) to test the runbook.
- Day-30 readout to leadership: what I fixed, what I found, what is still open, decisions needed, and the 90-day roadmap (SOC 2 Type I readiness, DLP rollout, access recertification).

### Top priorities (summary)
1. Eliminate active exposure (key, public sharing, MFA gaps).
2. Know where regulated data lives and who can reach it.
3. Make onboarding and requests fast and consistent, because speed is what makes people follow the rules.
4. Put guardrails around AI that allow safe use rather than ban it.
5. Start generating compliance evidence from day one.

### Day-30 success measures
- 100% MFA, 100% of company laptops for L2/L3 users in MDM.
- Zero "anyone with link" files in client-data locations.
- Onboarding of a new hire: under 1 hour to full standard access, same process every time.
- Every AI tool in use is either approved, limited or blocked and recorded.
- Ticket SLA reporting live.
- Compliance gap report with an owner and date on every item.

### What I would deliberately not do in 30 days
- Buy a full SIEM, pursue SOC 2 audit fieldwork, or redesign the whole network. The foundations come first, and the gateway and logs give us most of the detection value at this size.

---

## Key tradeoffs I made

| Decision | Alternative | Why I chose this |
|---|---|---|
| Google Workspace as IdP now | Okta from day one | Speed and cost at 25 people. I would revisit at roughly 100 people or when SaaS sprawl demands lifecycle depth. |
| Restrict first, clean later | Delete or reorganise overshared content | Avoids breaking work and destroying evidence. Reversible. |
| Interim one-line AI rule on day 1 | Wait for a full policy | Stops the leakage now, and perfection later. |
| AI gateway as a central control | Trust each tool's own settings | One enforcement point scales better and fixes key sprawl. Adds a component to run. |
| Compliance platform (Vanta/Drata) | Manual spreadsheets | Evidence generation by the system. Costs money, saves months. |
| JIT elevation for L3 | Standing access for engineers | More friction for a small group, much smaller blast radius. |
| AI recommends, humans approve for access and L3 | Fully autonomous IT agent | Accountability and auditability. Automation covers low-risk, reversible actions only. |
| Honest SOC 2 timeline (Type I then Type II) | Promise "compliant" quickly | Credibility with healthcare and education clients depends on not overclaiming. |

---

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
