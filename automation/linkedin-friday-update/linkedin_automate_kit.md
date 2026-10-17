# LinkedIn Automate Kit: Friday Update

Companion to `n8n_friday_status_report.json`. Contains the comment reply, the DM, setup steps, and connection notes.

---

## 1. Comment reply (post the same day someone comments)

> Thanks {Name}! Sending you the Friday update template in a DM now.

Keep it short. Do not paste the template in the comment.

## 2. Saved DM (manual, paste the name, about 20 seconds)

> Hi {Name}, thanks for the comment on my Friday update post. Here's the 3-line template I use:
>
> Done: one sentence on what shipped.
> Next: one sentence on next week's top priority.
> Blocked: one sentence on blockers, or "Nothing blocked."
>
> If you want, I can share the n8n workflow that drafts it from Jira every Friday at 4 PM. Just say the word.

**Why manual:** LinkedIn does not allow automated reading of comments or auto-DMs, and bots risk your account. Save the DM as a text snippet and paste in the name.

---

## 3. Workflow setup

The workflow runs every Friday at 4 PM, pulls your done and open Jira tickets, asks Claude for a 3-line update (Done / Next / Blocked), and saves it as a **Gmail draft**. Nothing is sent automatically.

1. In n8n: **Workflows > Import from File** and select `n8n_friday_status_report.json`.
2. Open **Jira Done** and **Jira Open**. Select or create a **Jira Software Cloud** credential. Adjust the JQL if you want a specific project, e.g. add `AND project = ABC`.
3. Open **Gmail Draft**. Select or create a **Gmail OAuth2** credential. Replace `YOUR_MANAGER@example.com` with the recipient.
4. Open **Claude Write Update**. Replace `YOURKEY` in the `x-api-key` header with your Anthropic API key. If you prefer n8n credentials, switch the node to Header Auth with the same header name.
5. The model is `claude-sonnet-4-5`, set in the JSON body of **Claude Write Update**. Change it there if you prefer another.
6. Check the schedule in **Every Friday 4 PM** (cron `0 16 * * 5`). It uses the n8n instance timezone, so set that in Settings or in the workflow settings.
7. **Run it once manually** (Execute Workflow) and check the Gmail draft before you activate the workflow. This workflow has not been run end to end.

### Connection notes for the nodes

- Tickets marked blocked are detected by status or label containing "blocked" or "waiting". Change the wording in **Build Prompt** if your team uses something else.
- If no tickets match, the prompt says "(none)" and Claude writes a short placeholder line. Review before sending.
- The API key sits in the workflow JSON once pasted. Do not re-export or share the workflow after adding it.

---

## 4. Connection request notes

Free accounts limit notes to 200 characters. Replace every `{...}` with one specific detail before sending.

**Post engagers (166 chars before filling)**

> Hi {Name}, thanks for engaging with my Friday update post, especially your point on {specific detail}. I'd like to stay connected and swap notes on how you run yours.

**Recruiters (150 chars before filling)**

> Hi {Name}, I'm a {role} with {X} years in {domain}. I saw you hire for {team/role type} and would like to connect in case something relevant opens up.

**Fellow PMs (152 chars before filling)**

> Hi {Name}, I liked your take on {specific post or product}. I'm a PM working on {area} and always keen to compare how other teams handle status updates.

**Cold (141 chars before filling)**

> Hi {Name}, I noticed {specific detail: their launch, talk or article}. I work on {area} and think we'd have useful overlap. Happy to connect.

Count the characters after you fill the placeholders. Trim if over 200.
