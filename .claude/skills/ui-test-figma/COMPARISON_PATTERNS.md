# UI Comparison Patterns

> Load this file before Step 3 (comparison) in the ui-test-figma skill.
> Contains: tag classification rules, CSS extraction JS, report template, Jira comment template,
> MCP tool reference, and error handling table.

---

## Tag Classification Rules (Method A — Figma MCP)

| Tag | Rule |
|---|---|
| `STATIC` | Button labels, nav items, column headers, section titles, form labels — never changes per user |
| `DYNAMIC` | Currency amounts, dates, user names/emails, IDs, counts, status badges |
| `PATTERN` | Greeting text like "Welcome, [Name]" — verify prefix only |

**Heuristics:**
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

---

## CSS Comparison Rules

| Property | What to check |
|---|---|
| Font size | Figma token vs `APP_CSS[element].fontSize` |
| Font weight | Bold/regular from Figma vs computed `fontWeight` |
| Button color | Figma fill color vs `backgroundColor` |
| Border radius | Figma corner radius vs `borderRadius` |
| Padding | Figma padding values vs computed `padding` |

Flag mismatches where the Figma design token and computed style clearly differ (e.g., Figma shows `#3B82F6` but app renders `#6366F1`).

---

## CSS Extraction JS (run via `browser_evaluate`)

```javascript
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

---

## Visual Comparison Checklist (Method B — Screenshots)

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

## Report Template

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

## Jira Comment Template

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

... (repeat per failure, ordered High → Medium → Low)

------------------------------------------------------------
ℹ️ NOTES
  • Dynamic fields (amounts, dates, IDs) verified for presence only.
  • CSS values extracted via Playwright getComputedStyle().
  • Warnings excluded — reply "include warnings" to add them.
------------------------------------------------------------
```

Do NOT assign the card. Only tag the assignee in the comment.

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
