---
name: test-charter
description: >
  Generates a structured Test Charter in Markdown from a manual test execution report
  (MD format) in the outputs/ folder, then publishes it to the team decision record
  site via REST API. Triggers when the user mentions: test charter, manual test report,
  exploratory session, session-based testing, "generate a test charter", "create a
  charter", or "run the charter skill".
---

# Test Charter Skill

You are a senior QA engineer. Parse a manual test execution report, generate a Test
Charter document, and publish it to the decision record API.

---

## Step 1 — Read the report

List every `.md` file in `outputs/`. If more than one is found, show the list and ask:
> "I found multiple reports in `outputs/`. Which one should I use?"

If only one is found, use it automatically.

If none found:
> "No MD file in `outputs/`. Drop your manual test execution report there and confirm,
> or paste it directly."

Wait for the file or pasted content before continuing.

---

## Step 2 — Extract fields from the report

Infer the following from the report's content. Do not ask the user — derive intelligently.
Use `"Not provided"` only when a field truly cannot be inferred.

| Field | How to derive |
|---|---|
| `scope` | Feature/module name — from the report title or heading |
| `objectives` | Purpose of the test session — from intro or summary section |
| `tester` | Author or tester name — from report metadata or signature |
| `duration` | Session length — look for time references; default `"1h"` |
| `duration_short` | `"30m"` / `"1h"` / `"2h"` — must match `duration`; derive from same source |
| `charter_vs_opportunity` | If stated; default `"90/10"` |
| `bug_investigation_time` | If stated; default `"30m"` |
| `testing_areas` | Derive from sections covered (Functional, UI/UX, Navigation, Security, Error Handling) |
| `environment` | QA / Staging / Prod — from report metadata |
| `persona` | User role being tested — from report context |
| `session_recording` | If mentioned; else `"Not provided"` |
| `bugs` | All bugs/defects listed — extract: severity, description, steps, status |
| `test_notes` | Key observations per area |
| `test_cases` | Any test case table rows present in the report |
| `risks` | Any risks or blockers mentioned |
| `issues` | Open questions or clarifications noted |
| `enhancements` | Improvement suggestions noted |
| `execution_notes` | Any notes for the next tester |

Count total bugs → `bug_count` (integer).

---

## Step 3 — Collect charter metadata (one prompt)

Ask once:
> "Quick details before I generate:
> 1. Charter title / Jira card key (e.g. `FF-420`)
> 2. Your name and email (creator)
> 3. Reviewer name and email
> 4. Test environment (QA / Staging / Prod) — skip if already clear from the report"

Parse response into: `title`, `code` (card key or slugified title), `creator`, `reviewer`, `environment` (override inferred value if provided).

---

## Step 4 — Generate the charter

Produce the Markdown below. Only include AREAS rows for areas present in `testing_areas`.
For BUGS: one row per extracted bug; placeholder row if none.

**CRITICAL — TEST CASES is a mandatory section.** Always populate it from the report's test results table. If the report has no test case rows, include three blank placeholder rows. Never omit this section — it is a core feature of the Test Charter format and must appear in every charter generated or published.

```markdown
# [title]

* Status: Proposed
* Reviewer: [reviewer.name]
* Number of Bugs: [bug_count]
* Duration: [duration]
* Date: [M/D/YYYY]

## CHARTER

**Scope:** [scope]

**Objectives:** [objectives]

## AREAS

| Testing Area   | Focus                                                            |
|----------------|------------------------------------------------------------------|
[Only include rows for areas present in testing_areas. Row options:]
| Functional     | Validate core features work as specified                         |
| UI/UX          | Verify visual consistency, layout, and usability                 |
| Navigation     | Confirm user flows, links, and routing behave correctly          |
| Security       | Check for common vulnerabilities and access control              |
| Error Handling | Validate error messages, edge cases, and graceful failure states |

## TESTER

**Name:** [tester]

## TASK BREAKDOWN

1. Review application against charter objectives
2. Execute functional test cases
3. Explore UI/UX and navigation paths
4. Probe security touchpoints
5. Trigger and verify error-handling scenarios
6. Log bugs and observations
7. Summarise findings and flag risks

## DURATION

**Session Length:** [duration]

## BUG INVESTIGATION & REPORTING

**Time Allocated:** [bug_investigation_time]

## CHARTER VS. OPPORTUNITY

**Ratio:** [charter_vs_opportunity]

## TEST NOTES

[test_notes — one sub-section per testing area, bullet points only]

## TEST CASES

| Test Case ID | Steps | Expected Outcome | Actual Outcome | Status (Pass/Fail) |
|---|---|---|---|---|
[rows from report or three blank rows]

## POTENTIAL RISKS

[risks from report, or generic defaults if none found]

## BUGS

| Bug ID | Severity | Description | Steps to Reproduce | Status |
|---|---|---|---|---|
[one row per bug; placeholder row if none]

## ISSUES & CLARIFICATIONS

[issues list or single placeholder]

## ENHANCEMENTS

[enhancements list or single placeholder]

## PERSONA

[persona — describe assumed user role, goals, and technical proficiency]

## TEST EXECUTION NOTES

**Session Recording:** [session_recording]

[execution_notes]

## RESOURCES

**Test Environment:** [environment]
**Date:** [M/D/YYYY]
```

---

## Step 5 — Save charter locally

Save the generated Markdown to `outputs/charters/[SLUG].md` using the Write tool.
Create the `outputs/charters/` directory if it does not exist.

Before saving, verify the charter contains all required sections. If any are missing, regenerate before saving:
- `## TEST CASES` — mandatory, must contain rows (never skip)
- `## BUGS`
- `## CHARTER`
- `## AREAS`
- `## TEST NOTES`

Confirm to the user: `"Charter saved locally → outputs/charters/[SLUG].md"`

---

## Step 6 — Review

Show the charter and ask:
> "Review the charter above. Reply with edits or **'looks good'** to publish."

Apply changes if requested (re-save locally before publishing), then proceed.

---

## Step 7 — Credentials (one prompt)

Ask once:
> "To publish, I need:
> 1. Decision record site URL
> 2. Login email
> 3. Password (not echoed or logged)"

Do not display or repeat the password back to the user at any point.

---

## Step 8 — Login and capture token

1. `browser_navigate` → site URL
2. `browser_snapshot` → find login fields
3. `browser_fill_form` → email + password
4. `browser_click` → submit
5. `browser_wait_for` → page load
6. `browser_evaluate`:

```javascript
// Only check known auth key names — avoid dumping all storage
const keys = ['token', 'authToken', 'access_token', 'jwt', 'id_token'];
for (const k of keys) {
  const v = localStorage.getItem(k) || sessionStorage.getItem(k);
  if (v) return v;
}
return null;
```

If the script returns `null`, use `browser_network_requests` to find the token in the
login response headers or body.

On failure:
> "Login failed. Fix credentials or complete MFA manually, then confirm to retry."

---

## Step 9 — POST to API

**Endpoint:** `POST https://hrqgymnn16.execute-api.us-east-1.amazonaws.com/dev/test-charter`

Slugify the title: lowercase, spaces/special chars → `-`, trim leading/trailing `-`.
The `0-` prefix in the filename is the sort-order prefix used by the decision record site.

```javascript
const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const filename = '0-' + slug + '-' + crypto.randomUUID() + '.md';

const response = await fetch('https://hrqgymnn16.execute-api.us-east-1.amazonaws.com/dev/test-charter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer TOKEN'
  },
  body: JSON.stringify({
    filename: filename,
    adr_type: 'test',
    title: 'TITLE',
    date: 'M/D/YYYY',
    status: 'Proposed',
    // reviewer is an array of objects (same shape as creator)
    reviewer: [{ email: 'EMAIL', name: 'NAME', status: 'Pending' }],
    creator: { email: 'EMAIL', name: 'NAME' },
    number_of_bugs: COUNT,
    duration: DURATION_SHORT,
    content: 'FULL_MARKDOWN',
    code: 'CODE'
  })
});
const result = await response.json();
return { status: response.status, body: result };
```

On non-200/201: show the full error status and response body, then ask:
> "Publish failed ([status]). Options: re-authenticate and retry, fix the payload field
> shown above, or cancel."

If the response body contains a URL, capture it as `published_url`.

---

## Step 10 — Done

```
TEST CHARTER PUBLISHED
  Title    : [title]         |  Code       : [code]
  Tester   : [tester]        |  Reviewer   : [reviewer.name]
  Duration : [duration]      |  Bugs       : [bug_count]
  Date     : [date]          |  Status     : Proposed
  Local    : outputs/charters/[SLUG].md
  Published: [published_url or "URL not returned by API"]
  ✅ Uploaded to decision record
```
