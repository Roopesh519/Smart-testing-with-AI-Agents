---
name: ui-testing
description: >
  Compares a live web application page against a Figma design to detect UI inconsistencies.
  User provides a Figma design link (with node ID). The skill captures BOTH the app page and
  the Figma design using Browser MCP, then produces a structured mismatch report.
  Figma MCP is tried first; if rate-limited or unavailable, automatically falls back to
  navigating the Figma URL in the browser and screenshotting it — no user intervention needed.
  Trigger when the user says "compare with application", "ui test", "check design",
  "test this page against application", "run ui check", or provides a Figma link and asks to compare with the application.
compatibility: >
  Requires Browser MCP (@browsermcp/mcp) connected and the Chrome extension active.
  Figma MCP is optional — used when available, skipped silently when rate-limited.
  User must already be logged into the application in their browser before running.
---

# UI Testing Skill

Automates visual and structural comparison between a Figma design node and the live application page.

---

## Step 0 — Pre-flight: Collect Inputs Before Starting

**Before doing anything else**, greet the user and collect the required inputs interactively.

Display this message to the user:

---

> **UI Testing — Pre-flight Checklist**
>
> Before we start the comparison, let's make sure everything is ready.
>
> **1. Figma Design Link**
> Please share the Figma design link for the page you want to compare.
> It should look like:
> `https://www.figma.com/design/<FILE_KEY>/...?node-id=<NODE_ID>`
>
> > Tip: In Figma, right-click the frame → **Copy link** to get a link that includes the `node-id`.
>
> **2. Browser Setup — Please confirm the following before proceeding:**
> - [ ] The **BrowserMCP Chrome extension** is active in your browser
> - [ ] You have **navigated to the exact app page** you want to compare in your browser tab
> - [ ] You are **logged into the application** (the page should be fully loaded, not a login screen)
> - [ ] You are **logged into Figma** in the same browser
>   *(Required as a fallback — if the Figma MCP hits its rate limit, the browser will automatically navigate to your Figma link to capture the design. If you're not logged in, it will show a login screen instead of the canvas.)*
>
> Once you've confirmed the above and shared the Figma link, I'll start the comparison automatically.

---

Wait for the user to provide:
1. The Figma URL — required to proceed
2. Confirmation (explicit or implied) that they are on the correct app page

Once both are received, proceed to Step 1 without further prompts.

If the user provides the Figma URL but does not explicitly confirm the browser setup, display a brief reminder:

> "Got the Figma link! Just confirm you're on the correct app page in your browser and I'll begin."

Then proceed as soon as they confirm.

---

## Critical Rule — Never Ask the User to Provide Screenshots

If Figma MCP fails for any reason (rate limit, auth error, timeout), **do NOT ask the user to
share a screenshot manually**. Instead, immediately execute the Browser Fallback in Step 1B below.
The Browser MCP can navigate to Figma in the browser and capture it automatically.

---

## Input

The user provides a Figma URL in one of these formats:
- `https://www.figma.com/design/<FILE_KEY>/...?node-id=<NODE_ID>`
- `https://www.figma.com/file/<FILE_KEY>/...?node-id=<NODE_ID>`

Parse from the URL:
- `FILE_KEY` — alphanumeric segment after `/design/` or `/file/`
- `NODE_ID` — value of `node-id` query param (normalize `-` to `:`)

If no Figma URL is provided, ask: "Please share the Figma design link (with node-id) for the page you want to compare."

---

## Workflow

Execute all steps in order. Do not pause between steps unless a blocking error occurs.

---

### Step 1 — Capture App Page (do this FIRST, before touching Figma)

**Why first:** Browser MCP can only see one tab at a time. Capture the app before navigating away.

Use Browser MCP:
1. Call `browser_screenshot` — capture the live app page as it currently appears
2. Call `browser_snapshot` — get the full accessibility/DOM snapshot to read text and structure
3. Note the current URL from the snapshot

Store both the screenshot and the DOM snapshot. Do not navigate away yet.

If this fails, stop and tell the user:
> "Browser MCP is not responding. Make sure the Chrome extension is active and the browsermcp.io server is running."

---

### Step 2 — Fetch Figma Design

Try Method A first. If it fails for any reason, immediately use Method B — no pausing, no asking the user.

#### Method A — Figma MCP (preferred)

Call `get_design_context` with:
- `fileKey`: extracted FILE_KEY
- `nodeId`: extracted NODE_ID

If successful, extract:
- All text layers (labels, headings, buttons, placeholders)
- Layout structure (nav, tables, cards, forms)
- Tag each text as `STATIC`, `DYNAMIC`, or `PATTERN` (rules in Step 3)

**If Figma MCP returns any error** (rate limit, auth, timeout, empty response) → immediately go to Method B.

#### Method B — Browser Screenshot Fallback (automatic, no user input needed)

Execute these steps in sequence:

1. **Navigate to Figma URL**
   ```
   browser_navigate(url: <the Figma URL the user provided>)
   ```

2. **Wait for the canvas to load**
   ```
   browser_wait(time: 15)
   ```
   Figma's canvas takes time to render — 15 seconds is the minimum safe wait.

3. **Take screenshot of Figma canvas**
   ```
   browser_screenshot()
   ```
   — this captures the Figma design as rendered in the browser

   **If `browser_screenshot` times out on first attempt:**
   - Call `browser_wait(time: 10)` to wait further
   - Retry `browser_screenshot()` once more
   - If it fails again, tell the user: "Figma canvas is taking too long to load. Please check that the Figma design is open and fully visible in your browser, then type 'retry'."

4. **Navigate back to the app page**
   ```
   browser_navigate(url: <the app URL captured in Step 1>)
   ```
   Then `browser_wait(time: 5)` to let it reload.

5. **Take a fresh app screenshot** (to confirm page reloaded correctly)
   ```
   browser_screenshot()
   ```

Now you have two screenshots: **Figma design** and **live app**. Proceed to Step 3.

Note in the report which method was used: `[Source: Figma MCP]` or `[Source: Browser Screenshot]`.

---

### Step 3 — Intelligent Comparison

#### When Method A (Figma MCP) was used — structured comparison:

**Tag classification rules:**

| Tag | Rule |
|---|---|
| `STATIC` | Button labels, nav items, column headers, section titles, form labels — never changes per user |
| `DYNAMIC` | Currency amounts, dates, user names/emails, IDs, counts, status badges |
| `PATTERN` | Greeting text like "Welcome, [Name]" — verify prefix only |

Heuristics:
- Contains `$`, `€`, `AFA`, `₹`, `%` → `DYNAMIC`
- Matches date pattern → `DYNAMIC`
- All-caps short string (`ACTIVE`, `PENDING`, `PAID`) → `DYNAMIC`
- Long alphanumeric (>8 chars, mixed) → `DYNAMIC`
- Contains `@` → `DYNAMIC`
- Short label ending `:` or followed by input field → `STATIC`

Compare each tagged element against the DOM snapshot from Step 1:
- `STATIC` → exact or case-insensitive match required
- `DYNAMIC` → verify field exists and is non-empty (do not compare value)
- `PATTERN` → verify static prefix exists

#### When Method B (Browser Screenshots) was used — visual comparison:

Compare the two screenshots side by side using visual analysis. Check for:

1. **Page title / heading text** — exact match
2. **Navigation structure** — sidebar items present in both
3. **Breadcrumb trail** — matches
4. **Table column headers** — all headers present in both, same names
5. **Button labels** — Filter, Export, and any other action buttons
6. **Search bar placeholder text** — matches
7. **Radio button labels** — All / Total Payables / Total Receivables
8. **Section labels** — Opening Balance, Closing Balance, No. of Transactions, Sum of Total
9. **Date display format** — note if design shows range vs app shows single date
10. **Status badges / chips** — present and color-coded consistently
11. **Footer row content** — count and total fields present
12. **Pagination** — present in design vs app (may differ based on data count)

For dynamic fields (amounts, names, IDs, dates): **verify presence only, not value**.

---

### Step 4 — Generate Report

```
╔══════════════════════════════════════════════════════════╗
║           UI COMPARISON REPORT                          ║
║  Page    : [app URL path]                               ║
║  Figma   : node-id [NODE_ID]                            ║
║  Method  : [Figma MCP | Browser Screenshot]             ║
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
  Live App : "text in app"
  Severity : High / Medium / Low

[F2] MISSING ELEMENT
  Element  : [what is missing]
  Figma    : Present
  Live App : Not found
  Severity : High

[F3] EMPTY DYNAMIC FIELD
  Element  : [field name]
  Expected : Non-empty value
  Live App : Empty or absent
  Severity : Medium

[F4] LAYOUT MISSING
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

[W2] NOT IN DESIGN
  Element  : [element found in app but absent in design]
  Note     : Verify if intentional

────────────────────────────────────────────────────────────
PASSED
────────────────────────────────────────────────────────────
  ✅ [element] — matches
  ✅ [dynamic field] — value present (not compared)

────────────────────────────────────────────────────────────
NOTES
────────────────────────────────────────────────────────────
- Dynamic fields verified for presence only, not value.
- Source: [Figma MCP / Browser Screenshot fallback]
```

---

### Step 5 — Jira Bug Logging (optional, after report)

Once the report is shown, immediately ask:

> "Would you like me to log the failures as comments on a Jira card?
> If yes, please paste the **Jira card link** (e.g. `https://7edge.atlassian.net/browse/PROJ-123`) and the **assignee name** to assign the bugs to."

**Wait for the user's response before proceeding.**

---

#### Parse the Jira Card Link

Extract the issue key from the URL:
- `https://7edge.atlassian.net/browse/PROJ-123` → issue key is `PROJ-123`

Use `getJiraIssue` with that key to confirm the card exists. If it doesn't exist or the link is malformed, tell the user:
> "I couldn't find that Jira card. Please double-check the link and try again."

---

#### Assignee Resolution

Use `lookupJiraAccountId` with the name the user provides.

**If exactly one match is found:** use it directly — do not ask for confirmation.

**If two or more matches are found:** display them clearly and ask the user to pick:

> "I found multiple users matching '[name]'. Which one should I assign to?
>
> 1. Full Name — username — email@example.com
> 2. Full Name — username — email@example.com
>
> Reply with the number."

Wait for the user's selection, then use that account ID.

**If no match is found:** ask the user:

> "I couldn't find a Jira user matching '[name]'. Please check the name or provide their email address."

---

#### Post Comment with Mention

Use `addCommentToJiraIssue` on the provided card with a single structured comment. Tag the user using Jira's mention format `[~accountId:ACCOUNT_ID]` at the top.

Format the comment body exactly as below, filling in real values for each failure:

```
Hi [~accountId:ACCOUNT_ID],

Please review the UI bugs listed below, identified during automated Figma-vs-Live comparison.

------------------------------------------------------------
🔍 UI BUG REPORT
Page Tested  : [app page URL]
Figma Node   : [NODE_ID]
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
  Element  : [element name, e.g. "Submit button label"]
  Expected : "[text from Figma design]"
  Actual   : "[text found in live app]"
  Location : [page section or component path]

[F2] 🔴 HIGH — MISSING ELEMENT
  Element  : [element name, e.g. "Export button"]
  Expected : Present (as per Figma)
  Actual   : Not found in live app
  Location : [page section]

[F3] 🟠 MEDIUM — EMPTY DYNAMIC FIELD
  Element  : [field name, e.g. "Opening Balance"]
  Expected : Non-empty value
  Actual   : Field is empty or absent
  Location : [page section]

[F4] 🟡 LOW — LAYOUT / STRUCTURAL ISSUE
  Element  : [element name]
  Expected : Present (as per Figma)
  Actual   : Not detected in DOM
  Location : [page section]

... (repeat one block per failure, ordered High → Medium → Low)

------------------------------------------------------------
ℹ️ NOTES
  • Dynamic fields (amounts, dates, IDs) verified for presence only — values not compared.
  • Warnings (casing, extra elements) excluded from this report.
  • To include warnings, reply "include warnings" and I'll re-post.
------------------------------------------------------------
```

Do NOT assign the card. Only mention the person in the comment.

After posting the comment, display:

```
────────────────────────────────────────────────────────────
JIRA UPDATED
────────────────────────────────────────────────────────────
  ✅ Comment posted with [N] failure(s)
  ✅ Tagged : Full Name
  Card : https://7edge.atlassian.net/browse/PROJ-123
────────────────────────────────────────────────────────────
```

**Warnings (`[W1]`, `[W2]`) are not included in the comment** — they are review items only. Include them only if the user explicitly asks.

---

## Severity Guide

| Severity | Meaning |
|---|---|
| **High** | User-facing text wrong or structural element missing |
| **Medium** | Field empty or minor structural gap |
| **Low** | Casing, punctuation, minor label difference |

---

## Error Handling

| Situation | Action |
|---|---|
| Figma MCP rate limited | **Do not stop. Do not ask user.** Immediately use Method B (browser screenshot fallback). |
| Figma MCP auth error | Same — use Method B automatically. |
| Figma URL has no node-id | Ask user: "Please copy the link from Figma by right-clicking the frame → Copy link, which includes node-id." |
| Browser MCP cannot screenshot app | Stop. Tell user the extension may not be active on this tab. |
| Figma page doesn't load in browser | Tell user to check if they are logged into Figma in Chrome, then re-run. |
| App page redirected to login | Stop. Tell user to log in to the app first. |

---

## Notes

- **Never ask the user for a manual screenshot** — always use Browser MCP to capture both sides.
- Capture the app page FIRST (Step 1) before navigating anywhere.
- Always note in the report whether Figma MCP or browser screenshot was the source.
- Failures are logged as Jira bugs in Step 5. Warnings are review items only — not logged unless user requests.
