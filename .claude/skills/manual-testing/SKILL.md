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

## Token Budget Rules — Zero Tolerance After Login

| Operation | Allowed | Forbidden | Token cost of violation |
|-----------|---------|-----------|------------------------|
| Login page selectors | ONE `browser_snapshot()` at login URL only | `browser_snapshot()` on any other page | ~10k per call |
| All other DOM reading | `browser_evaluate` with targeted CSS/JS selector | `browser_snapshot()` anywhere else | ~10k wasted |
| All screenshots | `npx playwright screenshot --storage-state .playwright-session.json --full-page URL file.png` | `browser_screenshot()` | ~3k per image |
| Session reuse | Check `.playwright-session.json` before login — skip login if file exists and is valid | Re-logging in when session file exists | full login round-trip wasted |

**After the ONE allowed login snapshot — never call `browser_snapshot()` again in this run.**
Use `browser_evaluate` with a specific CSS selector or JS expression for all DOM inspection.

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

## Phase 0 — Collect Card ID + Load Context

Run token tracking `start` checkpoint.

If the user has not already provided a Jira card ID, ask:
> "Please share the **Jira card ID** to begin (e.g. `PROJ-123`)."

Wait for the card ID.

**After card ID is known — check for product context:**

Derive the project key prefix (e.g. `QE-89` → `QE`) and check:
```
.claude/skills/qa-agent/product_context/{PREFIX}/context.md
```

**If context file exists:**
- Read it and extract: `CTX_APP_URL`, `CTX_USERNAME`, `CTX_PASSWORD`, `CTX_LOGIN_URL`, `CTX_OTP`
- Set `CONTEXT_LOADED = true`
- Confirm one line: "Context loaded for {PRODUCT_NAME} — using saved URL and credentials."

**If context file not found:**
- Set `CONTEXT_LOADED = false`
- Collect URL and credentials during Phase 1 as normal

Then immediately proceed to Phase 1 — do not ask for anything else yet.

---

## Phase 1 — Fetch Jira Card

Use `getJiraIssue` to fetch `CARD_ID`. Extract and store:
- `CARD_TITLE` — summary
- `CARD_DESCRIPTION` — full description
- `ACCEPTANCE_CRITERIA` — look for "AC:", "Given/When/Then", numbered/checklist items
- `FIGMA_URL_FROM_CARD` — any Figma link found in description or comments
- `PROJECT_KEY` — for bug filing later

Run token tracking `jira_fetch` checkpoint.

### 1b — Truncate Jira data if card is verbose

After fetching, check `CARD_DESCRIPTION` length:
- If it exceeds 800 words AND contains sections beyond acceptance criteria (e.g. technical notes, design references, comment threads, embedded images):
  - Keep: Title, all Acceptance Criteria / Given-When-Then blocks, any Figma links
  - Discard: Lengthy prose, embedded image references, comment threads, implementation notes
  - Note internally: "Jira description truncated — AC only retained"
- If it is under 800 words or contains only AC — keep in full

Do NOT tell the user the description was truncated. This prevents verbose cards from consuming 5k+ tokens before testing even starts.

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

**Before navigating — check for an existing session:**
```bash
ls .playwright-session.json 2>/dev/null && echo "SESSION_EXISTS" || echo "NO_SESSION"
```

**If `.playwright-session.json` exists:**
- Use it for all CLI screenshots in Phase 3c — skip the entire login flow below
- Verify the session is still valid by navigating to `APP_URL`:
  - If the dashboard/home loads → session valid, proceed directly to 3a test plan generation
  - If redirected to login → session expired, delete the file and proceed with login below

**If no session file (or session expired):**

1. `browser_navigate(url: APP_URL)`
2. `browser_wait_for(state: "networkidle")`

**If login required:**
3. `browser_snapshot()` — ONE allowed snapshot to read login form selectors
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

**Save session state immediately after successful login:**
```javascript
browser_evaluate({
  expression: `(() => JSON.stringify({
    ls: Object.fromEntries(Object.entries(localStorage)),
    ss: Object.fromEntries(Object.entries(sessionStorage)),
    url: window.location.href
  }))()`
})
```
Write the result to `.playwright-session.json`. All Phase 3c CLI screenshots must now use:
```bash
npx playwright screenshot \
  --storage-state .playwright-session.json \
  --browser chromium \
  --full-page \
  --wait-for-timeout 2000 \
  "TARGET_URL" \
  outputs/screenshots/T-[N]-[status].png
```

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

## Phase 4 — Bug Reporting (Fully Automated)

> **[Step 3/4] Bug Reporting — filing bugs for [CARD_ID]...**

Do NOT invoke the `bug-reporting` skill. File bugs directly using Atlassian MCP inline —
this keeps context contiguous and avoids a second skill invocation.

**Step 4a — Build bug payload for each ❌ FAIL and ⚠️ OBSERVATION**

Derive all fields from test execution data — no user input needed:

| Field | Source |
|-------|--------|
| Summary | `"T-{N}: {test name} — {actual outcome in one line}"` |
| Description | Steps from test case + expected vs actual from execution log |
| Severity | AC explicitly failed → High · Assertion failed → Medium · Observation → Low |
| Screenshot | Match `outputs/screenshots/T-{N}-*.png` by test ID — use exact filename |

**Step 4b — File each bug via Atlassian MCP (parallelise where possible)**

For each failure:
1. `createJiraIssue` — issuetype: Bug, summary and description derived above, project: same as `CARD_ID`
2. `createIssueLink` — link new bug "relates to" `CARD_ID`
3. Screenshot attachment — use Jira REST API curl (same method as bug-reporting SKILL.md Step 6b); skip silently if `.env` credentials not set

**Step 4c — Add summary comment to original card**

`addCommentToJiraIssue` on `CARD_ID`:
```
🧪 Manual Testing Complete

Results: {X} Pass | {X} Fail | {X} Observation | {X} Blocked | {X} Total
Bugs filed: {BUG-KEY1}, {BUG-KEY2}, ...
Report: outputs/test-execution-{CARD_ID}-{YYYYMMDD}.md
```

**Step 4d — Announce**
```
Bug Reporting complete — {N} bug(s) filed: {BUG-KEY1}, {BUG-KEY2}, ...
```

Run `bug_reporting` token checkpoint.

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

After charter completes, show the final summary:

```
Manual Testing Complete — [CARD_ID]

  UI Testing (Figma)  : [completed / skipped]
  Manual Testing      : X Pass | X Fail | X Observation | X Blocked
  Bug Reporting       : [N] bug(s) filed — [keys]
  Test Charter        : [published URL or "saved locally"]
  Automation hints    : outputs/automation-hints-[CARD_ID]-[YYYYMMDD].md
```

**If AUTO_APPROVE = true (called from qa-agent full pipeline):**

Do NOT ask. Immediately chain to automation:
> "Auto-invoking Automation Agent — generating BDD tests from execution results.
> Hints file ready: `outputs/automation-hints-[CARD_ID]-[YYYYMMDD].md` — DOM re-discovery skipped for captured elements."

Invoke:
```
Skill: automation  args: [CARD_ID]  AUTO_APPROVE=true  hints: outputs/automation-hints-[CARD_ID]-[YYYYMMDD].md
```

**If AUTO_APPROVE = false (standalone run):**

Ask once:
> "Would you like to run the **Automation Agent** now to generate BDD tests from these results?
> The hints file is ready — DOM re-discovery will be skipped for captured elements.
> (yes / no)"

- **If yes:** invoke automation with hints file path:
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
