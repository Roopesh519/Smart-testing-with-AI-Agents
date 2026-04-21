---
name: manual-testing
description: Execute structured manual testing from a Jira card, run tests in browser, file bugs, then automatically hand off the execution report to the test-charter skill to generate and publish the Test Charter.
---

# Manual Testing Agent Skill

## Trigger
Activate when user says: "Test [JIRA-KEY]", "Run manual testing for [JIRA-KEY]", "Do QA on [JIRA-KEY]"

---

## Quick Flow
1. **Setup** — Collect app URL, auth details (one prompt, all fields)
2. **Charter** — Fetch Jira card → generate test charter → show summary only
3. **Execute** — Run all tests in browser → save results to file → report failures/observations only
4. **Report** — File bugs, add summary comment to card → save outputs

---

## PHASE 0 & 1 — Setup & Intelligence

**Single prompt to user:**
```
App URL: [e.g. https://staging.myapp.com]
Login required? [yes/no]
If yes — Username: [___]  Password: [___]
```

**Then fetch Jira card** (issue key provided):
- Extract: summary, description, acceptance criteria, labels, project key
- If AC not found in dedicated field, extract from description (look for: "AC:", "Given/When/Then", checkboxes)
- If still missing, ask user: "No AC found. What should be tested?"

---

## PHASE 2 — Charter Generation

**Generate charter** from `templates/test-charter.md`:
- Mission (1 sentence)
- Target (feature/flow)
- In scope (from AC items)
- Out of scope
- Risk areas
- Test ideas (T-01, T-02... — number sequentially)
  - 1–3 tests per AC item
  - 2+ negative/edge case tests
  - 1+ error state test
  - Mobile/responsive check if UI

**Show charter summary to user** (not full text). Ask: "Ready to test?" → proceed on yes.

---

## PHASE 3 — Test Execution

**Setup browser:**
- Navigate to `APP_URL`
- If login required: navigate to login → enter credentials → confirm logged in

**For each test T-01, T-02, ...**
1. Navigate to feature area (fresh state where possible)
2. Interact (click, type, select, etc.)
3. Observe: read page, capture screenshot (save as `T-[N]-[outcome].png`), check console
4. Assert against expected result
5. **Log to file only** (not chat): `T-N | title | status | expected | actual | screenshot`

**Rules:**
- Never skip a test
- Capture screenshot on each result (pass, fail, observation)
- Mark as ⚠️ OBSERVATION if unexpected but not clearly wrong
- Mark as 🔒 BLOCKED if feature unavailable
- Keep running count only

---

## PHASE 4 — Bug Preparation

**For each ❌ FAIL and ⚠️ OBSERVATION:**
- Use `templates/bug-report.md`
- Title, severity, reproduction steps, expected vs actual, screenshot reference
- Severity: Critical (crash/data loss) | High (AC failed) | Medium (partial failure) | Low (cosmetic)

**Save all bugs to file** (not chat): `bugs-[JIRA-KEY]-[date].md`

---

## PHASE 5 — Reporting

**File bugs in Jira:**
1. Create bug issue per distinct issue (project = card's project, type = Bug)
2. Link bug to original card (type: "relates to")
3. Attach screenshot to bug (if tool succeeds; if not, note in comment)
4. Parallelize bug creation where possible

**Save outputs:**
- `outputs/test-execution-[JIRA-KEY]-[date].md` — full execution report with all test results (this is the source file for the test-charter skill)
- `bugs-[JIRA-KEY]-[date].md` — all bug reports (reference only, not chat output)

The execution report saved to `outputs/` must include: tester name, date, environment,
session duration, all test results (T-01…T-N), all bugs with severity and steps, risks,
observations, and enhancements. This ensures test-charter can extract every field without
asking the user again.

**Add comment to original card:**
```
🧪 Manual Testing Complete

Results: X Pass | X Fail | X Observation | X Blocked | X Total
Bugs: [PROJ-789], [PROJ-790] (see file for details)
Charter: outputs/test-execution-[KEY]-[date].md
```

---

## PHASE 6 — Hand off to Test Charter

After saving the execution report, automatically invoke the `test-charter` skill:
> "Testing complete. Handing off to the test-charter skill to generate and publish the charter."

Pass context to test-charter:
- The report file is already at `outputs/test-execution-[JIRA-KEY]-[date].md`
- Tester name, reviewer (ask user if not known), and Jira card key are already known — pre-fill them in the Step 3 prompt so the user only needs to confirm, not re-enter.

The test-charter skill takes over from Step 1 (it will find the file in `outputs/`).

---

## Chat Output (Minimized)

Show ONLY:
- Charter summary (5 lines)
- Test count + failures/observations (table + details)
- Bug summary (list of created issue keys)
- Links to saved files

Do NOT chat:
- Full charter text
- All test results (save to file)
- Full bug reports (save to file)
- Verbose step-by-step logs

---

## Error Handling

| Situation | Action |
|---|---|
| Jira card not found | Ask user to verify key |
| Auth fails | Stop, ask to verify credentials |
| Feature not deployed | Mark related tests 🔒 BLOCKED, continue |
| AC missing | Ask user to describe what to test |