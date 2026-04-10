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

Read every `.md` file in `outputs/`. Use the first one found as the source report.

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
| `duration_short` | `"30m"` / `"1h"` — derived from duration |
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
> 3. Reviewer name and email"

Parse response into: `title`, `code` (card key or slugified title), `creater`, `reviewer`.

---

## Step 4 — Generate the charter

Produce the Markdown below. Only include AREAS rows for areas in `testing_areas`.
For TEST CASES: use rows from the report if present, otherwise three blank placeholder rows.
For BUGS: one row per extracted bug; join multi-line steps with ` ; `.

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

## Step 5 — Review

Show the charter and ask:
> "Review the charter above. Reply with edits or **'looks good'** to publish."

Apply changes if requested, then proceed.

---

## Step 6 — Credentials (one prompt)

Ask once:
> "To publish, I need:
> 1. Decision record site URL
> 2. Login email
> 3. Password"

---

## Step 7 — Login and capture token

1. `browser_navigate` → site URL
2. `browser_snapshot` → find login fields
3. `browser_fill_form` → email + password
4. `browser_click` → submit
5. `browser_wait_for` → page load
6. `browser_evaluate`:

```javascript
const keys = ['token','authToken','access_token','jwt','id_token'];
for (const k of keys) {
  const v = localStorage.getItem(k) || sessionStorage.getItem(k);
  if (v) return v;
}
return JSON.stringify({...localStorage});
```

If not in storage, use `browser_network_requests` to find the token in the login response.

On failure:
> "Login failed. Fix credentials or complete MFA manually, then confirm to retry."

---

## Step 8 — POST to API

**Endpoint:** `POST https://hrqgymnn16.execute-api.us-east-1.amazonaws.com/dev/test-charter`

Slugify: lowercase title, spaces/special chars → `-`, trim `-`.

```javascript
const response = await fetch('https://hrqgymnn16.execute-api.us-east-1.amazonaws.com/dev/test-charter', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer TOKEN'
  },
  body: JSON.stringify({
    filename: '0-SLUG' + crypto.randomUUID() + '.md',
    adr_type: 'test',
    title: 'TITLE',
    date: 'M/D/YYYY',
    status: 'Proposed',
    reviewer: '[{"email":"EMAIL","name":"NAME","status":"Pending"}]',
    creater: '{"email":"EMAIL","name":"NAME"}',
    number_of_bugs: COUNT,
    duration: DURATION_SHORT,
    content: 'FULL_MARKDOWN',
    code: 'CODE'
  })
});
return { status: response.status, body: await response.json() };
```

On non-200/201: show error, ask to retry.

---

## Step 9 — Done

```
TEST CHARTER PUBLISHED
  Title    : [title]  |  Code     : [code]
  Tester   : [tester] |  Reviewer : [reviewer.name]
  Duration : [duration] | Bugs   : [bug_count]
  Date     : [date]   |  Status   : Proposed
  ✅ Uploaded to decision record
```
