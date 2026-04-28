---
name: ui-testing
description: >
  Compares a live web application page against a Figma design to detect UI inconsistencies.
  Uses Playwright MCP for full-page screenshots, DOM snapshots, and computed CSS extraction.
  Collects Figma URL, app URL, username and password one by one, then logs in automatically
  (OTP is always 999999). Figma MCP is tried first; falls back to browser tab if unavailable.
  Trigger when the user says "compare with application", "ui test", "check design",
  "test this page against figma", "run ui check", or provides a Figma link and asks to compare.
compatibility: >
  Requires Playwright MCP registered via .mcp.json (already set up).
  Figma MCP is optional — used when available, skipped silently when rate-limited.
  Login is handled automatically — OTP is always 999999.
---

# UI Testing Skill — Playwright MCP

Automates visual and structural comparison between a Figma design node and a live application page
using Playwright MCP for full-page capture, DOM access, CSS extraction, and automatic login.

---

## Step 0 — Pre-flight: Collect Inputs One by One

Ask questions **one at a time**. Do NOT show all questions upfront. Wait for the answer to each before asking the next.

---

**Question 1 — Figma URL:**

> Please share the **Figma design link** for the page you want to compare.
>
> It should look like:
> `https://www.figma.com/design/<FILE_KEY>/...?node-id=<NODE_ID>`
>
> Tip: In Figma, right-click the frame → **Copy link** to get a link that includes the `node-id`.

Wait for the user to paste the Figma URL. Validate it has a recognisable Figma domain and a `node-id` param.
If `node-id` is missing:
> "Please right-click the frame in Figma → **Copy link** — that version includes the `node-id` needed for comparison."

---

**Question 2 — App URL:**

> Got it! Now paste the **full URL of the exact page** you want to test (e.g. `https://distributor.qa.zood-pay.net/user-management/distributor-management/distributors/6f90a58d/DST2974`).

Wait for the user to paste the full page URL. Do not proceed until received.

Store the full URL as `TARGET_URL`.
Extract the base origin (scheme + host, e.g. `https://distributor.qa.zood-pay.net`) as `BASE_URL`.

---

**Question 3 — Check if already logged in:**

Navigate to `BASE_URL` using `browser_navigate` and take a `browser_snapshot`.

- **If the snapshot shows a dashboard/home page (not a login form)** → session is active, skip to Step 1b immediately. Do NOT ask for credentials.
- **If the snapshot shows a login form** → ask for credentials:

> It looks like you're not logged in yet. What is your **username or email**?

Wait for answer, then:

> And your **password**?

Wait for answer. Then proceed to Step 1 (login flow).

---

Once inputs are collected, reply:

> "Got everything. Logging in and starting the comparison now..."

Then immediately proceed to Step 1 — no more questions.

---

---

## Critical Rules

- **Never ask the user to take a screenshot manually** — Playwright handles all captures.
- **Never navigate away from a tab without saving its URL** — always restore after Figma capture.
- If Figma MCP fails for any reason, **immediately** open Figma in a new browser tab (Method B). Do not pause or ask the user.
- Always wait for `networkidle` before taking any screenshot — pages with API-driven data must finish loading first.

---

## Input Parsing

Parse the Figma URL:
- `FILE_KEY` — alphanumeric segment after `/design/` or `/file/`
- `NODE_ID` — value of `node-id` query param (normalize `-` to `:`, e.g. `123-456` → `123:456`)

If no Figma URL is provided, ask:
> "Please share the Figma design link (with node-id) for the page you want to compare."

---

## Workflow

Execute all steps in order. Do not pause between steps unless a blocking error occurs.

---

### Step 1 — Login to the Application

**Skip this step entirely if the session check in Step 0 Q3 confirmed the user is already logged in.**

The app login form has:
- A "Login By" dropdown (leave as "Email Address")
- An email input field
- A password input field
- A "Login" button
- After submit: a 6-digit OTP screen (OTP is always `999999` in QA)

Use `browser_snapshot` to read the actual field selectors, then fill them:

```
1. browser_wait_for(state: "networkidle")
2. browser_snapshot()                           ← read actual input selectors from DOM
3. browser_fill(selector: <email input>, value: <username>)
4. browser_fill(selector: <password input>, value: <password>)
5. browser_click(selector: <Login button>)
6. browser_wait_for(state: "networkidle")
7. browser_snapshot()                           ← check what appeared
```

**If OTP screen appears** (look for a 6-box PIN / OTP input in the snapshot):

```
8. browser_click(selector: <first OTP box>)
9. browser_type(text: "999999")                 ← types digit by digit, auto-advances
10. browser_click(selector: <Verify / Submit button>)
11. browser_wait_for(state: "networkidle")
12. browser_snapshot()                          ← confirm past OTP
```

The OTP is always `999999` — fill it automatically, never ask the user.

**Session is now saved** to `/home/user/.playwright-zoodpay-profile` — future runs will skip login entirely.

**Confirm login success:**
- Snapshot shows dashboard / main nav → proceed to Step 1b.
- Still on login page or error shown → stop:
  > "Login failed. Please check your username and password and try again."

---

### Step 1b — Navigate to the Target Page and Capture

After login succeeds, navigate directly to `TARGET_URL` (the full URL the user provided in Step 0 Q2):

```
1. browser_navigate(url: TARGET_URL)
2. browser_wait_for(state: "networkidle")      ← wait for all API calls to finish
3. browser_take_screenshot()                   ← full-page screenshot
4. browser_snapshot()                          ← full DOM + accessibility tree
```

Save `TARGET_URL` as `APP_URL`.

Store:
- `APP_SCREENSHOT` — the full-page image
- `APP_DOM` — the accessibility/DOM snapshot

**Extract computed CSS for key elements** using `browser_evaluate`:

```js
browser_evaluate({
  expression: `
    const results = {};
    const selectors = {
      primaryButton:  'button[type="submit"], .btn-primary, [class*="primary"]',
      heading:        'h1, h2, [class*="heading"], [class*="title"]',
      navItem:        'nav a, [class*="nav-item"], [class*="sidebar-item"]',
      tableHeader:    'th, [class*="table-header"], [class*="col-header"]',
      badge:          '[class*="badge"], [class*="chip"], [class*="tag"]',
      inputField:     'input[type="text"], input[type="email"]'
    };
    for (const [name, selector] of Object.entries(selectors)) {
      const el = document.querySelector(selector);
      if (el) {
        const s = window.getComputedStyle(el);
        results[name] = {
          fontSize:        s.fontSize,
          fontWeight:      s.fontWeight,
          color:           s.color,
          backgroundColor: s.backgroundColor,
          padding:         s.padding,
          borderRadius:    s.borderRadius,
          border:          s.border
        };
      }
    }
    return results;
  `
})
```

Store the result as `APP_CSS`.

---

### Step 2 — Fetch Figma Design

Try Method A first. On any error, immediately use Method B.

#### Method A — Figma MCP (preferred)

```
get_design_context(fileKey: FILE_KEY, nodeId: NODE_ID)
```

On success, extract:
- All text layers: labels, headings, buttons, placeholders, column headers
- Layout structure: nav, sidebars, tables, cards, forms, footers
- Design tokens if available: colors, spacing, font sizes

Tag each text element: `STATIC`, `DYNAMIC`, or `PATTERN` (rules in Step 3).

Mark source as `[Source: Figma MCP]`. Proceed to Step 3.

**If Figma MCP returns any error** (rate limit, auth, timeout, empty) → immediately go to Method B.

#### Method B — Playwright Browser Fallback (automatic, no user input)

Open Figma in a **new tab** so the app tab is preserved:

```
1. browser_tab_new()
2. browser_navigate(url: <Figma URL from user>)
3. browser_wait_for(state: "networkidle")
4. browser_wait(time: 15)                      ← Figma canvas needs time to render
5. browser_screenshot()                        ← capture Figma design as rendered
```

If the screenshot shows a login screen instead of the canvas:
> "You're not logged into Figma in this browser session. Please log into figma.com and retry."

If screenshot times out:
```
6. browser_wait(time: 10)
7. browser_screenshot()                        ← retry once
```

After capturing, switch back to the app tab:
```
8. browser_tab_select(index: 0)               ← return to original app tab
```

Mark source as `[Source: Browser Screenshot]`. Proceed to Step 4.

---

### Step 3 — Intelligent Comparison

#### Tag Classification Rules (for Method A — Figma MCP data)

| Tag | Rule |
|---|---|
| `STATIC` | Button labels, nav items, column headers, section titles, form labels — never changes per user |
| `DYNAMIC` | Currency amounts, dates, user names/emails, IDs, counts, status badges |
| `PATTERN` | Greeting text like "Welcome, [Name]" — verify prefix only |

Heuristics:
- Contains `$`, `€`, `₹`, `%` → `DYNAMIC`
- Matches date pattern (dd/mm/yyyy, Jan 01 2024, etc.) → `DYNAMIC`
- All-caps short string (`ACTIVE`, `PENDING`, `PAID`) → `DYNAMIC`
- Long alphanumeric (>8 chars, mixed case) → `DYNAMIC`
- Contains `@` → `DYNAMIC`
- Short label ending `:` or preceding an input → `STATIC`

**Comparison rules by tag:**
- `STATIC` → exact or case-insensitive match against `APP_DOM` required
- `DYNAMIC` → verify field exists and is non-empty; do not compare value
- `PATTERN` → verify static prefix matches

**CSS comparison** (always run if `APP_CSS` was captured):

| Property | What to check |
|---|---|
| Font size | Figma token vs `APP_CSS[element].fontSize` |
| Font weight | Bold/regular from Figma vs computed `fontWeight` |
| Button color | Figma fill color vs `backgroundColor` |
| Border radius | Figma corner radius vs `borderRadius` |
| Padding | Figma padding values vs computed `padding` |

Flag mismatches where the Figma design token and computed style clearly differ (e.g., Figma shows `#3B82F6` but app renders `#6366F1`).

#### Visual Comparison (Method B — Screenshots)

Compare `APP_SCREENSHOT` against the Figma screenshot visually. Check:

1. Page title / heading text — exact match
2. Navigation structure — all sidebar/nav items present
3. Breadcrumb trail — matches
4. Table column headers — all present with same names
5. Button labels — primary actions, filter, export
6. Search bar placeholder text — matches
7. Form field labels — exact match
8. Section labels — all section headings present
9. Status badges / chips — present and labeled correctly
10. Footer row — totals, counts present
11. Pagination — present or absent consistently
12. Spacing / alignment — obvious layout gaps or misalignments
13. Color scheme — primary brand color consistent

For dynamic fields (amounts, names, IDs, dates): **verify presence only, not value**.

---

### Step 4 — Generate Report

```
╔══════════════════════════════════════════════════════════╗
║           UI COMPARISON REPORT                          ║
║  App URL : [APP_URL]                                    ║
║  Figma   : node-id [NODE_ID]                            ║
║  Method  : [Figma MCP | Browser Screenshot]             ║
║  Capture : Full-page via Playwright MCP                 ║
║  Tested  : [timestamp]                                  ║
╚══════════════════════════════════════════════════════════╝

SUMMARY
───────
  Total checks  : XX
  ✅ Passed      : XX
  ❌ Failed      : XX
  ⚠️  Warnings   : XX

────────────────────────────────────────────────────────────
FAILURES  (action required)
────────────────────────────────────────────────────────────

[F1] TEXT MISMATCH
  Element  : [element name]
  Figma    : "text in design"
  Live App : "text found in DOM"
  Severity : High

[F2] MISSING ELEMENT
  Element  : [element name]
  Figma    : Present
  Live App : Not found in DOM
  Severity : High

[F3] CSS MISMATCH
  Element  : [element, e.g. "Primary Button"]
  Property : [e.g. background-color]
  Figma    : [design value, e.g. #3B82F6]
  Live App : [computed value, e.g. rgb(99, 102, 241)]
  Severity : Medium

[F4] EMPTY DYNAMIC FIELD
  Element  : [field name]
  Expected : Non-empty value
  Live App : Empty or absent
  Severity : Medium

[F5] LAYOUT / STRUCTURAL MISSING
  Element  : [structural element]
  Figma    : Present
  Live App : Not detected
  Severity : High

────────────────────────────────────────────────────────────
WARNINGS  (review recommended)
────────────────────────────────────────────────────────────

[W1] CASE MISMATCH
  Element  : [element]
  Figma    : "Title Case"
  Live App : "lowercase"

[W2] EXTRA ELEMENT IN APP
  Element  : [element found in app but absent in design]
  Note     : Verify if intentional addition

[W3] CSS MINOR DIFFERENCE
  Element  : [element]
  Property : [e.g. font-size]
  Figma    : 14px
  Live App : 13px
  Note     : Within acceptable range — review if intentional

────────────────────────────────────────────────────────────
CSS SNAPSHOT (extracted via Playwright)
────────────────────────────────────────────────────────────
  Primary Button   : font=[fontSize], color=[color], bg=[backgroundColor], radius=[borderRadius]
  Heading          : font=[fontSize], weight=[fontWeight], color=[color]
  Nav Item         : font=[fontSize], color=[color]
  Table Header     : font=[fontSize], weight=[fontWeight]
  Badge/Chip       : bg=[backgroundColor], radius=[borderRadius]

────────────────────────────────────────────────────────────
PASSED
────────────────────────────────────────────────────────────
  ✅ [element] — matches
  ✅ [dynamic field] — value present (not compared)

────────────────────────────────────────────────────────────
NOTES
────────────────────────────────────────────────────────────
- Captured via: Playwright MCP (full-page, networkidle wait)
- CSS extracted via: window.getComputedStyle()
- Dynamic fields verified for presence only, not value.
- Source: [Figma MCP / Browser Screenshot fallback]
```

---

### Step 5 — Jira Bug Logging (optional)

After showing the report, ask:

> "Would you like me to log the failures as comments on a Jira card?
> If yes, share the **Jira card link** (e.g. `https://7edge.atlassian.net/browse/PROJ-123`) and the **assignee name**."

Wait for response before proceeding.

#### Parse Jira Card

Extract issue key from URL (e.g. `PROJ-123`).
Use `getJiraIssue` to confirm card exists. If not found:
> "Couldn't find that Jira card. Please double-check the link."

#### Assignee Resolution

Use `lookupJiraAccountId` with the name provided.

- One match → use it directly, no confirmation needed.
- Multiple matches → list them and ask user to pick by number.
- No match → ask for correct name or email.

#### Post Comment

Use `addCommentToJiraIssue` with this format:

```
Hi [~accountId:ACCOUNT_ID],

Please review the UI bugs below, found during automated Figma-vs-Live comparison using Playwright MCP.

------------------------------------------------------------
🔍 UI BUG REPORT
Page Tested  : [APP_URL]
Figma Node   : [NODE_ID]
Capture Mode : Full-page — Playwright MCP (networkidle)
Tested On    : [timestamp]
Source       : [Figma MCP / Browser Screenshot fallback]
------------------------------------------------------------

📋 SUMMARY
  Total Failures : [N]
  🔴 High        : [count]
  🟠 Medium      : [count]
  🟡 Low         : [count]

------------------------------------------------------------
🐛 FAILURES (Action Required)
------------------------------------------------------------

[F1] 🔴 HIGH — TEXT MISMATCH
  Element  : [element name]
  Expected : "[Figma text]"
  Actual   : "[app text]"
  Location : [page section]

[F2] 🔴 HIGH — MISSING ELEMENT
  Element  : [element name]
  Expected : Present (per Figma)
  Actual   : Not found
  Location : [page section]

[F3] 🟠 MEDIUM — CSS MISMATCH
  Element  : [element]
  Property : [CSS property]
  Expected : [Figma value]
  Actual   : [computed value]
  Location : [page section]

[F4] 🟠 MEDIUM — EMPTY DYNAMIC FIELD
  Element  : [field name]
  Expected : Non-empty value
  Actual   : Empty or absent
  Location : [page section]

... (repeat per failure, ordered High → Medium → Low)

------------------------------------------------------------
ℹ️ NOTES
  • Dynamic fields (amounts, dates, IDs) verified for presence only.
  • CSS values extracted via Playwright getComputedStyle().
  • Warnings excluded — reply "include warnings" to add them.
------------------------------------------------------------
```

Do NOT assign the card. Only tag the assignee in the comment.

After posting:

```
────────────────────────────────────────────────────────────
JIRA UPDATED
────────────────────────────────────────────────────────────
  ✅ Comment posted — [N] failure(s) logged
  ✅ Tagged : [Full Name]
  Card : [Jira URL]
────────────────────────────────────────────────────────────
```

---

## Playwright MCP Tool Reference

| Task | Tool |
|---|---|
| Navigate to URL | `browser_navigate(url: "...")` |
| Wait for page to fully load | `browser_wait_for(state: "networkidle")` |
| Full-page screenshot | `browser_screenshot()` |
| DOM + accessibility tree | `browser_snapshot()` |
| Extract computed CSS | `browser_evaluate(expression: "...")` |
| Open new tab | `browser_tab_new()` |
| Switch to tab by index | `browser_tab_select(index: N)` |
| List open tabs | `browser_tab_list()` |
| Fill input field | `browser_fill(selector: "...", value: "...")` |
| Click element | `browser_click(selector: "...")` |
| Wait for element | `browser_wait_for(selector: "...", state: "visible")` |

---

## Error Handling

| Situation | Action |
|---|---|
| Figma MCP rate limited / auth error | Immediately use Method B (new browser tab). No pause, no asking user. |
| Figma URL has no node-id | Ask user: "Right-click the frame in Figma → Copy link to get a link with node-id." |
| App page redirects to login | Run Step 1 (login) first, then retry navigation. |
| `browser_navigate` fails | Stop. Tell user: "Playwright MCP could not reach the URL. Check that the MCP server is running and the URL is correct." |
| `browser_evaluate` returns null | Skip CSS comparison for that element; note it in the report as "CSS not extracted". |
| Figma canvas doesn't load in 25s | Ask user: "Figma canvas is slow to load. Please confirm the design is accessible, then type 'retry'." |

---

## Severity Guide

| Severity | Meaning |
|---|---|
| **High** | User-facing text wrong, structural element missing, broken layout |
| **Medium** | CSS property mismatch, dynamic field empty, minor structural gap |
| **Low** | Casing difference, punctuation, minor label variation |
