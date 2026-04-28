---
name: manual-testing
description: >
  Manual Testing branch orchestrator. Follows the flowchart:
  Jira Card Input → UI Testing (Figma MCP) → Manual Testing (Playwright MCP)
  → Bug Reporting (Atlassian MCP) → Test Charter → Manual Testing complete.
  Accepts a Jira card ID and runs all four sub-steps in sequence.
  Uses Playwright CLI for zero-token test screenshots. Token tracking enabled.
  Can also be run standalone without the qa-agent.
  Triggers when user says: "test [JIRA-KEY]", "run manual testing for [JIRA-KEY]",
  "do QA on [JIRA-KEY]", "manual test", or "manual-testing".
user-invocable: true
---

# Manual Testing Skill — Full Branch Orchestrator

## Context Engineering
<!-- Load SKILLS_CONTEXT.md for pipeline map. Load individual SKILL.md only when dispatching
     to that skill. Do NOT load all SKILL.md files at skill entry. -->

## Token Budget Rules — enforce throughout this skill

| Operation | USE | NEVER USE |
|-----------|-----|-----------|
| Test screenshots | `npx playwright screenshot --full-page URL file.png` | `browser_screenshot()` |
| DOM reading | `browser_evaluate` with targeted selectors only | `browser_snapshot()` |
| Login | Playwright MCP `browser_fill` / `browser_click` | — |

## Token Tracking — silent background task

```bash
PROJECT=/home/user/projects/Smart-testing-with-AI-Agents

# Skill entry
SNAP=$(python3 $PROJECT/context_snapshot.py --phase start) && \
python3 $PROJECT/track_tokens.py start --card CARD_ID $SNAP --model claude-sonnet-4-6

# After Jira fetch
SNAP=$(python3 $PROJECT/context_snapshot.py --phase jira_fetch) && \
python3 $PROJECT/track_tokens.py phase --card CARD_ID --name jira_fetch $SNAP

# After UI Testing (Phase 2)
SNAP=$(python3 $PROJECT/context_snapshot.py --phase ui_testing) && \
python3 $PROJECT/track_tokens.py phase --card CARD_ID --name ui_testing $SNAP

# After test execution (Phase 3)
SNAP=$(python3 $PROJECT/context_snapshot.py --phase test_execution) && \
python3 $PROJECT/track_tokens.py phase --card CARD_ID --name test_execution $SNAP

# Skill exit (after charter published)
SNAP=$(python3 $PROJECT/context_snapshot.py --phase end) && \
python3 $PROJECT/track_tokens.py end --card CARD_ID $SNAP --model claude-sonnet-4-6 && \
python3 $PROJECT/track_tokens.py report && python3 $PROJECT/track_tokens.py session
```

Replace CARD_ID with the actual card ID. Never show tracking output to user.

You run the **Manual Testing branch** of the QA pipeline:

```
Jira Card Input
      ↓
[Step 1] UI Testing (Figma MCP)         ← ui-test-figma skill
      ↓
[Step 2] Manual Testing (Playwright MCP) ← test execution in browser
      ↓
[Step 3] Bug Reporting (Atlassian MCP)   ← bug-reporting skill
      ↓
[Step 4] Test Charter                    ← test-charter skill
      ↓
Manual Testing Complete
```

Each step can also be skipped if the user explicitly says so.

---

## Phase 0 — Collect Inputs

**Single prompt to user** (ask everything at once):

```
To start the Manual Testing pipeline, I need:

1. Jira card ID (e.g. PROJ-123) — if not already given
2. App URL (e.g. https://staging.myapp.com)
3. Login required? If yes — Username: [___]  Password: [___]
4. Figma design link? (optional — UI Testing step will be skipped if omitted)
```

Wait for the user's response. Extract and store:
- `CARD_ID` — the Jira card key
- `APP_URL` — the full application URL
- `USERNAME`, `PASSWORD` — login credentials (if required)
- `FIGMA_URL` — Figma design link (optional)

---

## Phase 1 — Fetch Jira Card

Use Atlassian MCP (`getJiraIssue`) to fetch `CARD_ID`. Extract:
- Summary / title
- Description
- Acceptance Criteria (look for "AC:", "Given/When/Then", checkboxes)
- Labels, project key
- Any Figma links in description (use if `FIGMA_URL` was not provided)

If no AC found:
> "No Acceptance Criteria found on this card. What should be tested?"

Wait for the user's response before continuing.

---

## Phase 2 — UI Testing (Figma MCP)

### Skip condition
If no `FIGMA_URL` was provided and none found in the card, display:
> "No Figma link provided — skipping UI Testing step."
Then proceed to Phase 3.

### When Figma URL is available

Announce:

> **[Step 1/4] UI Testing — comparing [CARD_ID] live app against Figma design...**

Invoke the ui-test-figma skill, passing `FIGMA_URL` and `APP_URL` as context so it does
not need to re-ask for them:

```
Skill: ui-test-figma
```

Pre-fill the answers to its questions using the values already collected:
- Figma URL → `FIGMA_URL`
- App URL → `APP_URL`
- Credentials → `USERNAME` / `PASSWORD` (if available)

Once the UI comparison report is complete, display a brief summary:
> "UI Testing complete — [N] failures, [N] warnings. Proceeding to manual test execution."

---

## Phase 3 — Manual Test Execution (Playwright MCP)

Announce:

> **[Step 2/4] Manual Testing — executing tests for [CARD_ID]...**

### 3a — Generate Test Charter

Generate a test charter from the Jira card's acceptance criteria:
- Mission (1 sentence)
- Target (feature/flow name from card)
- In scope: 1–3 tests per AC item
- Out of scope
- Risk areas
- Test ideas (T-01, T-02, ... — number sequentially)
  - 1–3 tests per AC item
  - 2+ negative/edge case tests
  - 1+ error state test
  - Mobile/responsive check if UI

Show charter summary (5 lines max). Ask:
> "Ready to run these tests?" → proceed on yes.

### 3b — Setup Browser

1. `browser_navigate(url: APP_URL)`
2. If login required:
   - `browser_snapshot()` → find login fields
   - Fill email, password, click login
   - If OTP screen appears: type `999999`
   - Confirm logged in before continuing

### 3c — Execute Tests

For each test T-01, T-02, ...:
1. Navigate to the feature area via Playwright MCP (preserves session)
2. Interact — `browser_fill`, `browser_click`, `browser_select_option`
3. **Capture screenshot via Playwright CLI** (zero response tokens):
   ```bash
   mkdir -p outputs/screenshots
   npx playwright screenshot \
     --browser chromium \
     --full-page \
     --wait-for-timeout 2000 \
     "CURRENT_URL" \
     outputs/screenshots/T-[N]-[pass|fail|observation].png
   ```
   If the page requires the active session (auth-protected), use MCP navigate first
   then CLI screenshot using the same URL from `browser_evaluate("window.location.href")`.
4. Assert against expected result from AC using `browser_evaluate` with targeted selectors
5. Log result to file only (not chat):
   `T-N | title | status | expected | actual | outputs/screenshots/T-N-status.png`

Status codes:
- ✅ PASS
- ❌ FAIL
- ⚠️ OBSERVATION (unexpected but not clearly wrong)
- 🔒 BLOCKED (feature unavailable or not deployed)

Never skip a test. Keep a running count only in chat.

### 3d — Save Execution Report

Save to `outputs/test-execution-[CARD_ID]-[date].md` with:
- Tester name, date, environment, session duration
- All test results (T-01 … T-N)
- All failures with expected vs actual
- Screenshot references
- Observations, risks, enhancements

---

## Phase 4 — Bug Reporting (Atlassian MCP)

Announce:

> **[Step 3/4] Bug Reporting — filing bugs for [CARD_ID]...**

For each ❌ FAIL and ⚠️ OBSERVATION from Phase 3:

Using Atlassian MCP:
1. Create a Bug issue in the same project as `CARD_ID`
2. Summary: clear bug title
3. Description: steps to reproduce, expected vs actual, screenshot reference
4. Severity: Critical (crash/data loss) | High (AC failed) | Medium (partial) | Low (cosmetic)
5. Link bug to original card (link type: "relates to")

Parallelize bug creation where possible.

**Add a summary comment to the original `CARD_ID`:**

```
🧪 Manual Testing Complete

Results: X Pass | X Fail | X Observation | X Blocked | X Total
Bugs filed: [PROJ-789], [PROJ-790]
Report: outputs/test-execution-[CARD_ID]-[date].md
```

---

## Phase 5 — Test Charter (Publish)

Announce:

> **[Step 4/4] Test Charter — generating and publishing charter for [CARD_ID]...**

Invoke the test-charter skill, passing context so it does not need to re-ask:
- Report file is already at `outputs/test-execution-[CARD_ID]-[date].md`
- Card key, tester name, and date are already known

```
Skill: test-charter
```

Pre-fill the test-charter Step 3 metadata prompt using known values so the user
only needs to confirm, not re-enter.

---

## Phase 6 — Complete

After all phases complete, display:

```
Manual Testing Complete — [CARD_ID]

  Step 1 — UI Testing (Figma)  : [completed / skipped — no Figma URL]
  Step 2 — Manual Testing      : X Pass | X Fail | X Observation | X Blocked
  Step 3 — Bug Reporting       : [N] bugs filed — [list of bug keys]
  Step 4 — Test Charter        : [published URL or "saved locally"]

Report : outputs/test-execution-[CARD_ID]-[date].md
```

---

## Chat Output (Minimized)

Show in chat:
- Phase announcements (one line each)
- Charter summary (5 lines)
- Test count and failures (table + details for failures only)
- Bug summary (list of created issue keys)
- Final completion summary

Do NOT stream to chat:
- Full charter text
- All test results (save to file)
- Full bug reports (save to file)
- Verbose step-by-step execution logs

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Jira card not found | Ask user to verify key |
| Auth fails | Stop, ask to verify credentials |
| Feature not deployed | Mark related tests 🔒 BLOCKED, continue |
| AC missing | Ask user to describe what to test |
| Playwright MCP unavailable | Stop, ask user to confirm it is running |
| Figma URL missing | Skip UI Testing step silently, note it in final summary |
| Bug creation fails | Note failure, continue with remaining bugs, report at end |
