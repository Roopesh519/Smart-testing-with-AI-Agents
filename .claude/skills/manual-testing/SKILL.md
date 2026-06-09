---
name: manual-testing
description: >
  Manual Testing branch orchestrator. Follows the flowchart:
  Jira Card Input → UI Testing (Figma MCP, optional) → Manual Testing (Playwright MCP)
  → Bug Reporting (Atlassian MCP) → Test Charter → Automation Agent (optional handoff).
  Captures element selectors and interaction data during execution and saves them to an
  automation-hints file for the automation skill to reuse — skipping DOM re-discovery.
  Uses Playwright CLI for zero-token screenshots. Token tracking enabled.
  Can also be run standalone without the qa-agent.
  Triggers when user says: "test [JIRA-KEY]", "run manual testing for [JIRA-KEY]",
  "do QA on [JIRA-KEY]", "manual test", or "manual-testing".
user-invocable: true
---

# Manual Testing Skill — Full Branch Orchestrator

## Token Budget Rules — enforce throughout this skill

| Operation | USE | NEVER USE |
|-----------|-----|-----------|
| Test screenshots | `npx playwright screenshot --full-page URL file.png` | `browser_screenshot()` |
| DOM reading | `browser_evaluate` with targeted selectors only | `browser_snapshot()` |
| Login | Playwright MCP `browser_fill` / `browser_click` | — |
| Element discovery | `browser_evaluate` on `document.activeElement` after each interaction | `browser_snapshot()` |

## Token Tracking

Silent background task — follow the **Token Tracking** pattern in `SKILLS_CONTEXT.md`.
Checkpoints: `start` → `jira_fetch` → `ui_testing` → `test_execution` → `end + report + session`.
Replace `CARD_ID` with the actual card ID. Never show tracking output to user.

---

## Pipeline

```
Jira Card ID
      ↓
[Phase 1] Fetch Jira Card
      ↓
[Phase 2] UI Testing (Figma) — optional, ask user
      ↓
[Phase 3] Manual Test Execution + Automation Hint Capture
      ↓
[Phase 4] Bug Reporting (Atlassian MCP)
      ↓
[Phase 5] Test Charter (publish)
      ↓
[Phase 6] Offer Automation Agent handoff
```

---

## Phase 0 — Collect Card ID

Run token tracking `start` checkpoint.

If the user has not already provided a Jira card ID, ask:
> "Please share the **Jira card ID** to begin (e.g. `PROJ-123`)."

Wait for the card ID. Then immediately proceed to Phase 1 — do not ask for anything else yet.

---

## Phase 1 — Fetch Jira Card

Use `getJiraIssue` to fetch `CARD_ID`. Extract and store:
- `CARD_TITLE` — summary
- `CARD_DESCRIPTION` — full description
- `ACCEPTANCE_CRITERIA` — look for "AC:", "Given/When/Then", numbered/checklist items
- `FIGMA_URL_FROM_CARD` — any Figma link found in description or comments
- `PROJECT_KEY` — for bug filing later

Run token tracking `jira_fetch` checkpoint.

If no AC found:
> "No Acceptance Criteria found on this card. What should be tested?"
Wait for user response before continuing.

After fetch, ask these **one at a time**:

**Question A — UI Testing:**
> "Do you want to compare the app against a Figma design before testing? (yes / no)"

- If yes: ask for Figma URL (suggest `FIGMA_URL_FROM_CARD` if found), then app URL + credentials
- If no: ask for app URL + credentials only

Store:
- `RUN_UI_TEST` — true/false
- `FIGMA_URL` — if yes
- `APP_URL` — full base URL of the app
- `USERNAME`, `PASSWORD` — login credentials (ask only if not obvious from card)

---

## Phase 2 — UI Testing (optional)

**Skip if `RUN_UI_TEST = false`** — note "UI Testing: skipped" in final summary.

If running:
> **[Step 1/4] UI Testing — comparing [CARD_ID] live app against Figma...**

Invoke the ui-test-figma skill. Pre-fill its questions using collected values:
- Figma URL → `FIGMA_URL`
- App URL → `APP_URL`
- Credentials → `USERNAME` / `PASSWORD`

```
Skill: ui-test-figma
```

Run token tracking `ui_testing` checkpoint after completion.

Brief summary:
> "UI Testing complete — [N] failures, [N] warnings. Proceeding to manual tests."

---

## Phase 3 — Manual Test Execution + Automation Hint Capture

> **[Step 2/4] Manual Testing — executing tests for [CARD_ID]...**

Initialize an empty hints log in memory:
```
HINTS = {
  card: CARD_ID,
  baseUrl: BASE_URL,
  appUrl: APP_URL,
  pages: [],
  elements: {},    // keyed by page URL
  testCases: [],
  notes: []
}
```

### 3a — Generate Test Plan

From the AC, generate numbered test ideas:
- 1–3 tests per AC item
- 2+ negative/edge case tests
- 1+ error state test

Show as a compact table (T-01, T-02 ... with name and expected outcome).
Ask: `"Ready to run these tests? (yes / no or edit)"`
Proceed on confirmation.

### 3b — Setup Browser + Capture Login Selectors

1. `browser_navigate(url: APP_URL)`
2. `browser_wait_for(state: "networkidle")`

**If login required:**
3. `browser_snapshot()` — one allowed snapshot to read login form selectors
4. Record all login elements found into `HINTS.elements[LOGIN_URL]`:
   - For each input/button interacted with, note: tag, locator used, role/text, data-testid if present
5. Fill email → `browser_fill`
6. Fill password → `browser_fill`
7. Click login button → `browser_click`
8. `browser_wait_for(state: "networkidle")`

**If OTP screen appears:**
9. Click first OTP box → `browser_click`
10. `browser_type(text: "999999")` — always this value
11. Click verify → `browser_click`
12. `browser_wait_for(state: "networkidle")`

Confirm login success before proceeding.

Add to `HINTS.pages`: `{ url: LOGIN_URL, description: "Login page" }`
Add to `HINTS.notes`: any special login behavior observed (OTP type, error format, redirect URL)

### 3c — Execute Tests + Log Automation Hints

For each test T-01, T-02, ...:

1. Navigate to the feature area via Playwright MCP (preserves session)
2. Add current URL to `HINTS.pages` if not already present

3. For each browser interaction (`browser_fill`, `browser_click`, `browser_select_option`):
   - Execute the interaction
   - Immediately run element capture (zero-token, targeted JS):
     ```javascript
     browser_evaluate({ expression: `
       (() => {
         const el = document.activeElement;
         if (!el || el === document.body) return null;
         return {
           tag:    el.tagName.toLowerCase(),
           id:     el.id || null,
           testid: el.getAttribute('data-testid') || null,
           role:   el.getAttribute('role') || el.type || null,
           text:   el.innerText?.trim().slice(0, 60) || el.value?.slice(0, 60) || null,
           name:   el.name || null,
           type:   el.type || null,
           nth:    [...document.querySelectorAll(el.tagName)].indexOf(el)
         };
       })()
     ` })
     ```
   - Append result to `HINTS.elements[CURRENT_URL]` with a label (e.g. "email input", "submit button")

4. Take screenshot via Playwright CLI (zero response tokens):
   ```bash
   mkdir -p outputs/screenshots
   npx playwright screenshot \
     --browser chromium \
     --full-page \
     --wait-for-timeout 2000 \
     "CURRENT_URL" \
     outputs/screenshots/T-[N]-[pass|fail|observation].png
   ```

5. Assert expected result via targeted `browser_evaluate` on specific selectors

6. Log test result (to file only, not chat):
   `T-N | title | status | expected | actual | screenshot path`

7. Append to `HINTS.testCases`:
   ```
   { id: "T-N", name: "...", status: "PASS|FAIL|OBSERVATION|BLOCKED",
     actions: ["fill email", "click submit", "type OTP 999999"],
     url: "CURRENT_URL" }
   ```

Show only running count in chat: `T-01 ✅ T-02 ❌ T-03 ✅ ...`

Status codes: ✅ PASS | ❌ FAIL | ⚠️ OBSERVATION | 🔒 BLOCKED

Never skip a test.

### 3d — Save Execution Report

Save to `outputs/test-execution-[CARD_ID]-[YYYYMMDD].md`:
- Tester, date, environment, session duration
- All test results with expected vs actual
- Screenshot references
- Observations, risks

### 3e — Save Automation Hints File

After all tests complete, write `outputs/automation-hints-[CARD_ID]-[YYYYMMDD].md`:

```markdown
# Automation Hints — [CARD_ID]
Generated: [date] by manual-testing skill
Card: [JIRA_URL]
Base URL: [BASE_URL]

## Environment
App URL: [APP_URL]
Login: [USERNAME] / [PASSWORD REDACTED]

## Pages Visited
| URL | Description |
|-----|-------------|
| [url] | [description] |

## Elements Discovered

### [Page Name] ([URL])
| Element | Locator | Method | data-testid | Notes |
|---------|---------|--------|-------------|-------|
| [label] | [selector] | [positional/testid/role/text] | [value or none] | [observations] |

## Test Cases Executed
| ID | Name | Status | Key Actions |
|----|------|--------|-------------|
| T-01 | [name] | PASS | [comma-separated action list] |

## Automation Notes
[freeform observations: OTP behavior, error message format, API seeding needed,
 redirect URLs, any elements that need data-testid added, etc.]
```

Tell the user (one line):
> "Automation hints saved: `outputs/automation-hints-[CARD_ID]-[YYYYMMDD].md`"

Run token tracking `test_execution` checkpoint.

### 3f — Write Selector Context Update

After saving the automation hints file, silently update the product context.

Derive `PRODUCT_FOLDER` from `PROJECT_KEY` fetched in Phase 1 (uppercase, spaces → `_`).

```
CONTEXT_FILE = .claude/skills/qa-agent/product_context/{PRODUCT_FOLDER}/context.md
```

**If context file exists:**
1. For each entry in `HINTS.elements` — append one row to `Element Selectors` if the Element Label is not already present:
   - Element Label | Page URL | Locator | Method (testid/role/css) | data-testid value or "none" | Card ID
2. For each entry in `HINTS.pages` — if the URL is a new module pattern not seen before, add a note to `Environment Notes` with the URL and its description

Use the Edit tool to append rows — do not overwrite any existing content.

**If context file does not exist — skip silently.** qa-agent Step 6 will create it at the end of the run.

One-line confirmation (only if rows were actually added):
```
Selectors added to product context ({N} elements merged).
```

---

## Phase 4 — Bug Reporting (Atlassian MCP)

> **[Step 3/4] Bug Reporting — filing [N] bug(s) for [CARD_ID]...**

For each ❌ FAIL and ⚠️ OBSERVATION:
1. Create Bug issue in same project as `CARD_ID`
2. Summary: clear bug title
3. Description: steps to reproduce, expected vs actual, screenshot reference
4. Severity: Critical (crash/data loss) | High (AC failed) | Medium (partial) | Low (cosmetic)
5. Link bug to original card ("relates to")

Parallelize bug creation where possible.

Add summary comment to `CARD_ID`:
```
🧪 Manual Testing Complete

Results: X Pass | X Fail | X Observation | X Blocked | X Total
Bugs filed: [PROJ-789], [PROJ-790]
Report: outputs/test-execution-[CARD_ID]-[YYYYMMDD].md
```

---

## Phase 5 — Test Charter (Publish)

> **[Step 4/4] Test Charter — generating and publishing for [CARD_ID]...**

Invoke test-charter skill. Pre-fill its context:
- Report file: `outputs/test-execution-[CARD_ID]-[YYYYMMDD].md`
- Card key, tester name, and date already known

```
Skill: test-charter
```

Run token tracking `end + report + session` close-out after charter publishes.

---

## Phase 6 — Automation Handoff

After charter completes, show:

```
Manual Testing Complete — [CARD_ID]

  UI Testing (Figma)  : [completed / skipped]
  Manual Testing      : X Pass | X Fail | X Observation | X Blocked
  Bug Reporting       : [N] bug(s) filed — [keys]
  Test Charter        : [published URL or "saved locally"]

  Automation hints    : outputs/automation-hints-[CARD_ID]-[YYYYMMDD].md
```

Then ask:
> "Would you like to run the **Automation Agent** now to generate BDD tests from these results?
> The hints file is ready — it will skip DOM re-discovery for elements already captured.
> (yes / no)"

- **If yes:** invoke automation skill, telling it the hints file path upfront:
  > "Run automation for [CARD_ID]. Automation hints are at
  > `outputs/automation-hints-[CARD_ID]-[YYYYMMDD].md` — use them to skip DOM inspection."
  ```
  Skill: automation
  ```

- **If no:** exit with the summary above.

---

## Chat Output (Minimized)

Show in chat: phase announcements (1 line), test count running total, failure details only, bug keys, final summary.

Do NOT stream: full charter text, all test results (save to file), full bug reports, verbose execution logs.

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Jira card not found | Ask user to verify key |
| Auth fails | Stop, ask to verify credentials |
| Feature not deployed | Mark related tests 🔒 BLOCKED, continue |
| AC missing | Ask user to describe what to test |
| Playwright MCP unavailable | Stop, ask user to confirm it is running |
| Figma URL missing / user says no | Skip UI Testing, note in final summary |
| `browser_evaluate` returns null for element | Log "element not captured" in hints, continue |
| Bug creation fails | Note failure, continue with remaining bugs, report at end |
