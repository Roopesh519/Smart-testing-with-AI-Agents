---
name: accessibility-testing
description: >
  Tests a live web page against WCAG 2.1 Level A and AA criteria. Injects axe-core via
  browser_evaluate for automated rule checks, then runs manual keyboard, focus, skip-link,
  heading, and alt-text checks via Playwright MCP. Accepts a full page URL, logs in with
  Playwright MCP (OTP always 999999), navigates to the target page, runs all checks, saves
  a structured report to outputs/, and files violations as Jira bugs on the provided card.
  Uses Playwright CLI for zero-token screenshots. Token tracking enabled.
  Standalone or callable from qa-agent.
  Trigger: "accessibility test", "a11y test", "run accessibility", "check WCAG",
  "accessibility [URL]", "a11y [JIRA-KEY]", "test accessibility for [page]",
  or "check accessibility".
compatibility: >
  Playwright MCP must be running. axe-core injected at runtime from CDN — no install needed.
  OTP always 999999. Playwright CLI (npx playwright) must be available.
user-invocable: true
---

# Accessibility Testing Skill — WCAG 2.1 Level A/AA

## Token Budget Rules — enforce throughout this skill

| Operation | USE | NEVER USE |
|-----------|-----|-----------|
| Page screenshots | `npx playwright screenshot --full-page URL file.png` | `browser_screenshot()` |
| DOM reading | `browser_evaluate` with targeted JS only | `browser_snapshot()` |
| Login form selectors | `browser_snapshot()` — **one time only** at login screen | Any other snapshot |
| axe-core checks | `browser_evaluate` injection + run | External a11y CLI tools |

## Token Tracking

Silent background task — follow the **Token Tracking** pattern in `SKILLS_CONTEXT.md`.
Checkpoints: `start` → `login` → `a11y_checks` → `end + report + session`.
Use `CARD_ID` if Jira card provided, else `"a11y-test"`. Never show tracking output to user.

---

## Pipeline

```
Full Page URL (input)
        ↓
[Step 0] Collect Inputs — URL, credentials, Jira card
        ↓
[Step 1] Login via Playwright MCP (skip if session active)
        ↓
[Step 2] Navigate to Target Page + Baseline Screenshot
        ↓
[Step 3] axe-Core Automated Checks (WCAG 2.1 A + AA)
        ↓
[Step 4] Manual Checks — keyboard, focus, skip link, headings, alt text
        ↓
[Step 5] Generate + Save Report → outputs/a11y-report-[slug]-[date].html
        ↓
[Step 6] File Jira Bugs (critical/serious → individual bugs; moderate/minor → comment)
```

---

## Step 0 — Collect Inputs

Run token tracking `start` checkpoint.

Ask questions **one at a time**. Wait for each answer before asking the next.

**Question 1 — Page URL:**
> "Please paste the **full URL of the page** you want to accessibility-test.
> (e.g. `https://app.example.com/dashboard/settings`)"

Store as `TARGET_URL`.
Extract `BASE_URL` = scheme + host (e.g. `https://app.example.com`).
Extract `URL_SLUG` = last 2 meaningful path segments, lowercase, hyphens, strip UUIDs.

**Question 2 — Jira Card:**
> "Do you have a **Jira card ID** to file bugs against? (e.g. `QA-123`)
> Type `skip` to only generate the report."

- If provided: store `JIRA_CARD_ID`, set `FILE_JIRA = true`
- If skipped: set `FILE_JIRA = false`

**Question 3 — Check if login is needed:**

`browser_navigate(url: BASE_URL)` then `browser_wait_for(state: "networkidle")`.

Check the current URL:
- Redirected to `/login`, `/sign-in`, `/auth` → session not active, ask for credentials.
- Dashboard / main nav visible → session already active, skip to Step 2.

If login needed:
> "What is the **email** for login?"
> (after answer) "And the **password**?"

Store: `EMAIL`, `PASSWORD`.

Once all inputs collected:
> "Got it — logging in and starting the accessibility checks..."

---

## Step 1 — Login to the Application

**Skip entirely if Step 0 Q3 confirmed session already active.**

1. `browser_wait_for(state: "networkidle")`
2. `browser_snapshot()` — **one allowed snapshot** to read login form selectors
3. `browser_fill` email field using selector found
4. `browser_fill` password field using selector found
5. `browser_click` login / sign-in button
6. `browser_wait_for(state: "networkidle")`

**If OTP screen appears** (6-digit input / PIN boxes):
7. `browser_click` first OTP input box
8. `browser_type(text: "999999")` — always this value, auto-advances through boxes
9. `browser_click` Verify / Confirm button
10. `browser_wait_for(state: "networkidle")`

Confirm login success: main nav or dashboard visible → proceed.
Still on login page → stop and report: `"Login failed — please verify credentials."`

**Save authenticated session to disk:**
```javascript
browser_evaluate({
  expression: `JSON.stringify({
    localStorage:   Object.fromEntries(Object.entries(localStorage)),
    sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
    cookies:        document.cookie
  })`
})
```
Write result to `.playwright-session.json`.

Run `login` token checkpoint.

---

## Step 2 — Navigate to Target Page + Baseline Screenshot

1. `browser_navigate(url: TARGET_URL)`
2. `browser_wait_for(state: "networkidle")`
3. Take baseline screenshot via Playwright CLI (zero response tokens):

```bash
mkdir -p outputs/screenshots
npx playwright screenshot \
  --browser chromium \
  --full-page \
  --viewport-size "1920,1080" \
  --wait-for-timeout 3000 \
  "TARGET_URL" \
  outputs/screenshots/a11y-baseline-URL_SLUG.png
```

Store as `BASELINE_SCREENSHOT = outputs/screenshots/a11y-baseline-[URL_SLUG].png`.

---

## Step 3 — axe-Core Automated Checks

Load `.claude/skills/accessibility-testing/WCAG_CHECKS.md` now.

### 3a — Inject axe-core

Run the **axe-Core Injection Script** from `WCAG_CHECKS.md` via `browser_evaluate`.

- Returns `"loaded"` or `"already loaded"` → proceed to 3b.
- Returns rejection / CDN error → set `AXE_BLOCKED = true`, add note to report:
  `"axe-core CDN blocked by CSP — automated checks skipped, manual checks only."`,
  skip to Step 4.

### 3b — Run axe-core

Run the **axe-Core Run Script** from `WCAG_CHECKS.md` via `browser_evaluate`.
Parse the returned JSON. Store as `AXE_RESULT`.

Bucket violations by impact:
- `CRITICAL_VIOLATIONS` — impact: `"critical"`
- `SERIOUS_VIOLATIONS` — impact: `"serious"`
- `MODERATE_VIOLATIONS` — impact: `"moderate"`
- `MINOR_VIOLATIONS`   — impact: `"minor"`

Show one-line tally in chat:
> `"axe-core: [N] critical | [N] serious | [N] moderate | [N] minor violations found."`

Run `a11y_checks` token checkpoint.

---

## Step 4 — Manual Checks

Load `.claude/skills/accessibility-testing/WCAG_CHECKS.md`.

Run each script via `browser_evaluate`. Store results for the report.

### Check A — Keyboard Traversal (WCAG 2.1.1)
Run **Check A — Keyboard Traversal Script**.
Record: total focusable count, elements removed from tab order, first 10 elements.
Flag if: focusableCount = 0, or interactive elements like buttons/inputs appear in `removedFromTab`
that should be reachable.

### Check B — Focus Visibility (WCAG 2.4.7)
Run **Check B — Focus Visibility Script**.
Flag if: `outlineNoneCount > 0` (outline suppressed on focused elements) or `totalFocusRules = 0`.
Note if `hasFocusVisible = true` (modern `:focus-visible` present — good practice).

### Check C — Skip Navigation Link (WCAG 2.4.1)
Run **Check C — Skip Navigation Link Script**.
Flag if: `hasSkipLink = false`.

### Check D — Heading Hierarchy (WCAG 1.3.1)
Run **Check D — Heading Hierarchy Script**.
Report all issues from `issues[]` array.
Flag if: `h1Count ≠ 1` or `levelSkips.length > 0`.

### Check E — Image Alt Text (WCAG 1.1.1) — cross-check against axe
Run **Check E — Image Alt Text Script**.
Flag if: `missingAlt > 0`. Note `emptyAlt` (decorative images with empty alt = OK if intentional).
Flag if: `svgMissingLabel > 0` (inline SVGs without accessible name).

---

## Step 5 — Generate + Save Report

Load the **Report Template** from `WCAG_CHECKS.md`.

Build the full report using:
- `AXE_RESULT` — all violation buckets
- Manual check results from Steps A–E
- `BASELINE_SCREENSHOT` path
- `WCAG Criterion Quick Reference` and `Severity Mapping` from `WCAG_CHECKS.md`

Derive filename: `outputs/a11y-report-[URL_SLUG]-[YYYYMMDD].html`

Save the file. Tell user (one line):
> `"Report saved: outputs/a11y-report-[URL_SLUG]-[YYYYMMDD].html"`

Run `end + report + session` token close-out.

---

## Step 6 — Jira Bug Filing

**Skip entirely if `FILE_JIRA = false`.**

> `"[Step 6] Filing accessibility bugs on [JIRA_CARD_ID]..."`

Use `getJiraIssue` to confirm `JIRA_CARD_ID` exists. Extract `PROJECT_KEY`.

### Critical + Serious → individual Jira Bugs

For each violation in `CRITICAL_VIOLATIONS` and `SERIOUS_VIOLATIONS`:

Create a Jira Bug using the **Jira Bug Template** from `WCAG_CHECKS.md`:
- **Issue type:** Bug
- **Summary:** `[A11Y-{IMPACT}] [WCAG {criterion}] — {rule description} on /{URL_SLUG}`
- **Priority:** Critical → P1 Blocker | Serious → P2 High
- **Labels:** `accessibility`, `wcag-2.1`, `a11y-{impact}`
- **Link to:** `JIRA_CARD_ID` ("relates to")

Parallelize bug creation where possible.

### Moderate + Minor → single summary comment

Use the **Jira Comment Template** from `WCAG_CHECKS.md`.
Post via `addCommentToJiraIssue` on `JIRA_CARD_ID`.

### Completion comment on JIRA_CARD_ID

```
♿ Accessibility Testing Complete — WCAG 2.1 AA

Page: [TARGET_URL]
Results: [N] critical | [N] serious | [N] moderate | [N] minor

Bugs filed: [PROJ-xxx], [PROJ-yyy]
Report: outputs/a11y-report-[URL_SLUG]-[YYYYMMDD].html
```

---

## Final Chat Summary

```
Accessibility Testing Complete
  Page          : [TARGET_URL]
  WCAG Level    : 2.1 AA

  Critical      : N violations
  Serious       : N violations
  Moderate      : N violations
  Minor         : N violations

  Keyboard      : OK / N interactive elements unreachable
  Focus styles  : OK / outline:none found on N selectors
  Skip link     : Present / Missing (WCAG 2.4.1)
  Heading order : OK / [issues]
  Image alt     : OK / N missing alt attributes

  Jira bugs     : [keys] / skipped
  Report        : outputs/a11y-report-[URL_SLUG]-[YYYYMMDD].html
```

---

## Error Handling

| Situation | Action |
|-----------|--------|
| Login fails | Stop — `"Login failed, please check credentials."` |
| TARGET_URL not reachable after login | Stop — check URL and auth redirect |
| axe-core CDN blocked (CSP) | Flag in report, continue with manual checks only |
| `axe.run()` throws / times out | Retry scoped to `main` or `#content` only, note partial result |
| `browser_evaluate` returns null | Log "script returned null" for that check, continue |
| Jira card not found | Ask to verify key; offer to save report only |
| Jira bug creation fails | Note failure, continue remaining bugs, report failures at end |
| OTP screen appears unexpectedly | Type `"999999"`, proceed |
| Page requires further navigation after login | Follow redirect, confirm TARGET_URL loads |
