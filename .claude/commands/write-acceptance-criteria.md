---
name: write-acceptance-criteria
description: >
  Generates structured acceptance criteria for a feature or user story,
  covering happy paths, unhappy paths, and edge cases in a clear,
  testable format suitable for development and QA handoff. If given a
  Jira card ID (e.g. FF-420), fetches the card automatically and appends
  the acceptance criteria to the bottom of the issue description without
  overwriting any existing content.
argument-hint: "<Jira card ID or feature description>"
user-invocable: true
---

## Core Workflow

0. **Detect Jira card ID** — If the argument matches the pattern `[A-Z]+-[0-9]+` (e.g. `FF-420`, `AA-12`),
   fetch the issue using the `getJiraIssue` tool with cloudId `853e134e-6574-491a-a075-1b06f7d4b478`.
   Use the issue summary and description as the feature input for the next steps.
   If the issue has no description, use the summary only and note this in the Assumptions section.
   If the argument is not a Jira card ID, treat it as a raw feature description and skip to step 1.

1. **Parse the feature** — Read the feature description or user story provided by the user

2. **Identify actors and goals** — Determine who is doing what and what success looks like

3. **Derive all scenarios** — Map out standard flows, variations, error states, and edge cases

4. **Write acceptance criteria** — Follow the output format exactly

5. **Flag assumptions** — Note anything inferred that the user should confirm

6. **Append to Jira description** — If the input was a Jira card ID:
   - Fetch the current description of the issue using `getJiraIssue`
   - Preserve the full existing description exactly as-is (do NOT remove or overwrite any content, including COS or any other existing sections)
   - Append the generated acceptance criteria at the very bottom of the existing description, separated by a divider line (`---`)
   - Update the issue description using `editJiraIssue` with cloudId `853e134e-6574-491a-a075-1b06f7d4b478`
   - After updating, confirm to the user with the Jira issue URL: `https://7edge.atlassian.net/browse/<CARD-ID>`

---

## Output Format

Always produce output in exactly this structure, in this order.

---

### Acceptance Criteria

### Happy Paths

Numbered list of standard, successful user flows. Each step is one clear action or system response. Steps must be sequential and realistic.

1. Step one
2. Step two
3. ...

Include one or more complete flows if the feature has multiple valid entry points or user types.

---

### Unhappy Paths

Numbered list of failure scenarios, edge cases, and error conditions. Be specific — name the actual error, input, or state, not a generic category.

Include:
- Validation failures (missing fields, invalid formats, out-of-range values)
- System errors (timeouts, service unavailability, unexpected states)
- User errors (wrong order of actions, duplicate submissions, unauthorised access)
- Edge cases (empty states, maximum limits, concurrent actions)
- Missing or misleading feedback (no confirmation, silent failure, confusing error messages)

---

## Writing Guidelines

- **Acceptance criteria must be testable.** Every `Then` clause must be answerable with pass/fail by a QA engineer.
- **Happy paths = the expected, successful flow.** Write them as a user would experience them, step by step.
- **Unhappy paths = everything that can go wrong.** Be exhaustive and specific. "User enters invalid email" is better than "validation fails."
- **Avoid implementation language.** Write what happens, not how the system achieves it.
- **One action per step.** Don't bundle two user actions into one step.
- **Tone:** Neutral, precise, present tense. No filler.

---

## Handling Incomplete Input

If the feature description is vague:
- Infer the most common interpretation based on domain patterns
- Write complete output using those inferences
- Add a short **Assumptions** section at the end listing what was inferred
- Only ask for clarification if the description is too ambiguous to produce any meaningful output

---

## Example

**Input:** "Add email notifications when a report is exported"

---

### Acceptance Criteria

### Happy Paths

1. User navigates to the Reports section and selects a report to export
2. User clicks "Export" and selects the desired format (e.g., CSV, PDF)
3. System queues the export job and displays a confirmation message: "Your export is being processed. You'll receive an email when it's ready."
4. Export job completes; system sends an email to the user's registered address
5. Email arrives with subject line, report name, and a clearly labelled download button
6. User clicks the download link; file downloads immediately in the selected format
7. Link remains active for 24 hours from time of export completion

---

### Unhappy Paths

1. User triggers an export but has no verified email address on file — system blocks the action and prompts the user to add and verify an email before exporting
2. Export job fails due to a data processing error — user receives a failure email with a human-readable reason (not a raw error code) and a "Try Again" link
3. User clicks the download link after it has expired (>24 hours) — page displays: "This link has expired. Return to Reports to export again." with a direct link back
4. User clicks the download link but the file has been deleted from storage — system returns a 404 page with a clear message and re-export option, not a generic browser error
5. Email delivery fails (e.g., inbox full, domain rejected) — system retries up to 3 times over 10 minutes; if all retries fail, the failure is logged and flagged in the admin panel
6. User triggers the same export twice in quick succession — system deduplicates and sends only one email; no duplicate files are created
7. User has disabled email notifications in their profile settings — system respects the preference and does not send the email; the export still completes and is accessible via the Reports page

---

*Assumed: web-based product with a registered user model and a transactional email provider already in place. Adjust if this is a mobile or API-only context.*



<!-- Created by Roopesh Yadava

Generate detailed documentation for the feature: {{feature_description}}

Follow these steps:

1. **Identify scenarios** — Analyze the feature description and derive all possible user flows, including standard usage and edge cases.

2. **Understand expected behavior** — Determine:

   * What the user is trying to achieve
   * System responses for valid and invalid inputs
   * Possible failure points or UX gaps

3. **Generate output** with the following structure:

## Acceptance Criteria

(Leave this section empty — do not list or rewrite anything here.)

## Happy Paths

* List all happy paths using numbered bullets.
* Each step should describe one clear user action or system result.
* Keep steps concise, realistic, and sequential.

## Unhappy Paths

* List all unhappy paths using numbered bullets.
* Include:

  * User errors
  * Validation failures
  * System issues
  * Edge cases
  * Missing or incorrect feedback
  * Be specific and practical in each scenario. -->