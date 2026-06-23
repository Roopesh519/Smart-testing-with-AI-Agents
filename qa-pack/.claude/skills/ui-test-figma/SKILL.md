---
name: ui-test-figma
description: >
  Compares a live web application page against a Figma design to detect UI inconsistencies.
  Uses Playwright CLI for zero-token screenshots and targeted browser_evaluate for CSS — never
  browser_snapshot. Figma MCP preferred; browser fallback automatic. OTP always 999999.
  Can be called standalone or from manual-testing (Step 1 of Manual branch).
  Trigger: "compare with application", "ui test", "check design", "test this page against figma",
  "run ui check", or a Figma link with a comparison request.
compatibility: >
  Playwright CLI (npx playwright) must be available — already installed in this project.
  Playwright MCP is used only for interactive login. All screenshots use CLI.
  Figma MCP is optional — browser fallback fires automatically on any error.
user-invocable: true
---

# UI Test Figma Skill

Compares a live app page against a Figma design. Uses **Playwright CLI** for all screenshots
(zero response tokens) and targeted `browser_evaluate` for CSS — never `browser_snapshot`.

## Token Budget Rules

| Operation | USE | NEVER USE |
|-----------|-----|-----------|
| Screenshots | `npx playwright screenshot --full-page URL file.png` | `browser_screenshot()` (returns base64) |
| DOM reading | `browser_evaluate` with targeted selectors | `browser_snapshot()` (returns full tree) |
| Login flow | Playwright MCP `browser_fill` / `browser_click` | — |
| Session save | `browser_evaluate` → write `.playwright-session.json` | — |

## Token Tracking

Silent background task — follow the **Token Tracking** pattern in `SKILLS_CONTEXT.md`.
Never show tracking output to user. Checkpoints: `start` → `login` → `comparison` → `end + report + session`.
Use `CARD_ID` if called from pipeline, else `"ui-test"`.

---

## Step 0 — Pre-flight: Collect Inputs One by One

Ask questions **one at a time**. Wait for the answer to each before asking the next.

**Question 1 — Figma URL:**
> Please share the **Figma design link** for the page you want to compare.
> It should look like: `https://www.figma.com/design/<FILE_KEY>/...?node-id=<NODE_ID>`
> Tip: In Figma, right-click the frame → **Copy link** to get a link that includes the `node-id`.

Validate it has a recognisable Figma domain and a `node-id` param. If missing:
> "Please right-click the frame in Figma → **Copy link** — that version includes the `node-id`."

**Question 2 — App URL:**
> Got it! Now paste the **full URL of the exact page** you want to test.

Store as `TARGET_URL`. Extract base origin as `BASE_URL`.

**Question 3 — Check if already logged in:**

First, check for a saved session file:
```bash
ls .playwright-session.json 2>/dev/null && echo "SESSION_EXISTS" || echo "NO_SESSION"
```

**If `.playwright-session.json` exists:**
- Set `SESSION_FILE = .playwright-session.json`
- Skip login entirely — proceed directly to Step 1b
- If a screenshot taken with `--storage-state` redirects to the login page, the session has expired: delete the file and fall through to the login flow below

**If no session file:**
Navigate to `BASE_URL` via `browser_navigate` and take a `browser_snapshot`.
- **Dashboard/home page** → session active, skip to Step 1b.
- **Login form** → ask for email, then password.

Once inputs collected: `"Got everything. Logging in and starting the comparison now..."`

**Parse the Figma URL:**
- `FILE_KEY` — alphanumeric segment after `/design/` or `/file/`
- `NODE_ID` — value of `node-id` query param (normalize `-` to `:`, e.g. `123-456` → `123:456`)

---

## Critical Rules

- Never ask the user to take a screenshot manually — Playwright handles all captures.
- If Figma MCP fails for any reason, **immediately** open Figma in a new browser tab (Method B). No pause, no asking user.
- Always wait for `networkidle` before any screenshot.

---

## Step 1 — Login to the Application

**Skip if session check in Step 0 Q3 confirmed already logged in.**

Use `browser_snapshot` to read field selectors, then:
1. `browser_wait_for(state: "networkidle")`
2. `browser_snapshot()` — read actual input selectors
3. `browser_fill` email, password
4. `browser_click` Login button
5. `browser_wait_for(state: "networkidle")`
6. `browser_snapshot()` — check for OTP screen

**If OTP screen appears** (6-box PIN):
7. `browser_click` first OTP box
8. `browser_type(text: "999999")` — always this value, auto-advances
9. `browser_click` Verify button
10. `browser_wait_for(state: "networkidle")`
11. `browser_snapshot()` — confirm past OTP

Confirm login: dashboard/main nav → proceed. Still on login page → stop with error.

Run `login` token checkpoint.

---

## Step 1b — Navigate to Target Page and Capture

**1. Save authenticated session to disk:**
```javascript
browser_evaluate({
  expression: `JSON.stringify({
    localStorage: Object.fromEntries(Object.entries(localStorage)),
    sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
    cookies: document.cookie
  })`
})
```
Write result to `.playwright-session.json`.

**2. Take full-page screenshot via Playwright CLI:**
```bash
mkdir -p outputs/screenshots
npx playwright screenshot \
  --storage-state .playwright-session.json \
  --browser chromium \
  --full-page \
  --viewport-size "1920,1080" \
  --wait-for-timeout 3000 \
  "TARGET_URL" \
  outputs/screenshots/app-capture.png
```
If `.playwright-session.json` does not exist, omit the `--storage-state` flag.
Store as `APP_SCREENSHOT = outputs/screenshots/app-capture.png`.

**3. Extract computed CSS via `browser_evaluate`:**

Load `.claude/skills/ui-test-figma/COMPARISON_PATTERNS.md` now — use the
**CSS Extraction JS** block from that file to run `browser_evaluate`.
Store result as `APP_CSS`.

---

## Step 2 — Fetch Figma Design

Try Method A first. On **any** error, immediately use Method B.

#### Method A — Figma MCP (preferred)
```
get_design_context(fileKey: FILE_KEY, nodeId: NODE_ID)
```
On success, extract all text layers, layout structure, design tokens.
Tag each text element: `STATIC`, `DYNAMIC`, or `PATTERN` (rules in COMPARISON_PATTERNS.md).
Mark source as `[Source: Figma MCP]`.

#### Method B — Playwright CLI Fallback (automatic, zero response tokens)
```bash
mkdir -p outputs/screenshots
npx playwright screenshot \
  --browser chromium \
  --full-page \
  --viewport-size "1920,1080" \
  --wait-for-timeout 15000 \
  "<Figma URL from user>" \
  outputs/screenshots/figma-design.png
```
If screenshot shows Figma login page:
> "You're not logged into Figma. Please log into figma.com in your browser, then confirm to retry."

Store `FIGMA_SCREENSHOT = outputs/screenshots/figma-design.png`.
Mark source as `[Source: Playwright CLI Screenshot]`.

---

## Step 3 — Intelligent Comparison

**Load `.claude/skills/ui-test-figma/COMPARISON_PATTERNS.md` now.**

Use the following from that file:
- **Tag Classification Rules** — classify Figma elements as STATIC / DYNAMIC / PATTERN
- **CSS Comparison Rules** — compare design tokens vs computed styles
- **Visual Comparison Checklist** (Method B) — 13-point structured check

Run `comparison` token checkpoint after comparison is complete.

---

## Step 4 — Generate Report

Use the **Report Template** from `COMPARISON_PATTERNS.md`.

### Step 4b — Save Report to outputs/

```bash
ls outputs/ 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

If `outputs/` exists:
1. Derive `URL_SLUG` from `TARGET_URL` (drop UUID segments, last 2 meaningful segments, lowercase)
2. Build filename: `ui-bugs-{URL_SLUG}-{YYYYMMDD-HHmmss}.md`
3. Write full report to `outputs/{filename}`.
4. Tell user: `"Report saved to outputs/{filename}."`

---

## Step 5 — Jira Bug Logging (optional)

Ask:
> "Would you like me to log the failures as comments on a Jira card?
> If yes, share the **Jira card link** and the **assignee name**."

If yes:
1. Extract issue key from URL. Use `getJiraIssue` to confirm card exists.
2. Use `lookupJiraAccountId` for the assignee name.
   - One match → use directly. Multiple → list and ask. None → ask for email.
3. Use `addCommentToJiraIssue` with the **Jira Comment Template** from `COMPARISON_PATTERNS.md`.
   Do NOT assign the card — only tag the assignee in the comment.

After posting:
```
JIRA UPDATED
  ✅ Comment posted — [N] failure(s) logged
  ✅ Tagged : [Full Name]
  Card : [Jira URL]
```

Run `end + report + session` token close-out.
