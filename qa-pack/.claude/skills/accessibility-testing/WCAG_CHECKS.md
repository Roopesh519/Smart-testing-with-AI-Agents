# WCAG 2.1 Check Scripts, Templates & Reference

---

## axe-Core Injection Script

Run via `browser_evaluate`. Injects axe-core from CDN. Returns `"loaded"` or `"already loaded"`.

```javascript
(() => new Promise((resolve, reject) => {
  if (window.axe) return resolve('already loaded');
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js';
  s.onload  = () => resolve('loaded');
  s.onerror = () => reject('CDN blocked — CSP may be preventing external scripts');
  document.head.appendChild(s);
}))()
```

---

## axe-Core Run Script

Run via `browser_evaluate` **after** injection succeeds.
Returns a compact JSON string of violations + incomplete count.

```javascript
axe.run(document, {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  resultTypes: ['violations', 'incomplete']
}).then(results => JSON.stringify({
  violations: results.violations.map(v => ({
    id:          v.id,
    impact:      v.impact,
    description: v.description,
    help:        v.help,
    helpUrl:     v.helpUrl,
    wcag:        v.tags.filter(t => t.startsWith('wcag') || t.startsWith('best')),
    nodeCount:   v.nodes.length,
    firstNode:   v.nodes[0]?.html?.slice(0, 300) ?? null,
    allNodes:    v.nodes.slice(0, 5).map(n => n.html?.slice(0, 150))
  })),
  incomplete: results.incomplete.length,
  passes:     results.passes.length
}))
```

---

## Manual Check Scripts

### Check A — Keyboard Traversal (WCAG 2.1.1)

```javascript
(() => {
  const focusable = [...document.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), ' +
    'select:not([disabled]), textarea:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"]), details > summary, [contenteditable]'
  )];
  const negativeTab = [...document.querySelectorAll('[tabindex="-1"]')];
  return {
    focusableCount:   focusable.length,
    removedFromTab:   negativeTab.length,
    firstTen: focusable.slice(0, 10).map(el => ({
      tag:      el.tagName.toLowerCase(),
      text:     (el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 60),
      tabindex: el.tabIndex,
      type:     el.type || null
    }))
  };
})()
```

---

### Check B — Focus Visibility (WCAG 2.4.7)

```javascript
(() => {
  const allRules = [];
  try {
    [...document.styleSheets].forEach(sheet => {
      try {
        [...sheet.cssRules].forEach(rule => allRules.push(rule));
      } catch (e) {}
    });
  } catch (e) {}

  const focusRules = allRules.filter(r => r.selectorText?.includes(':focus'));
  const outlineNoneRules = focusRules.filter(r =>
    r.style?.outline === 'none' || r.style?.outline === '0' ||
    r.style?.outlineWidth === '0px'
  );

  return {
    totalFocusRules:    focusRules.length,
    outlineNoneCount:   outlineNoneRules.length,
    hasFocusVisible:    allRules.some(r => r.selectorText?.includes(':focus-visible')),
    outlineNoneSelectors: outlineNoneRules.slice(0, 5).map(r => r.selectorText),
    sampleFocusRules:   focusRules.slice(0, 5).map(r => ({
      selector: r.selectorText,
      outline:  r.style?.outline,
      boxShadow: r.style?.boxShadow
    }))
  };
})()
```

---

### Check C — Skip Navigation Link (WCAG 2.4.1)

```javascript
(() => {
  const candidates = [...document.querySelectorAll('a')].filter(a =>
    /skip|jump|main|content/i.test(a.textContent + a.getAttribute('href') + (a.className || ''))
  );
  const firstLink = document.querySelector('body > :first-child a, header a:first-of-type');
  return {
    hasSkipLink:   candidates.length > 0,
    skipLinks:     candidates.slice(0, 3).map(a => ({
      text: a.innerText.trim().slice(0, 60),
      href: a.getAttribute('href')
    })),
    firstBodyLink: firstLink ? {
      text: firstLink.innerText.trim().slice(0, 60),
      href: firstLink.getAttribute('href')
    } : null
  };
})()
```

---

### Check D — Heading Hierarchy (WCAG 1.3.1)

```javascript
(() => {
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  const levels   = headings.map(h => parseInt(h.tagName[1]));
  const skips    = [];
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      skips.push({ from: levels[i - 1], to: levels[i], text: headings[i].innerText.trim().slice(0, 60) });
    }
  }
  return {
    total:     headings.length,
    h1Count:   levels.filter(l => l === 1).length,
    hierarchy: headings.slice(0, 15).map((h, i) => ({
      level: levels[i],
      text:  h.innerText.trim().slice(0, 80)
    })),
    levelSkips: skips,
    issues: [
      ...(levels.filter(l => l === 1).length === 0  ? ['Missing h1']      : []),
      ...(levels.filter(l => l === 1).length > 1    ? ['Multiple h1s']    : []),
      ...(skips.length > 0                           ? ['Heading level skips detected'] : [])
    ]
  };
})()
```

---

### Check E — Image Alt Text (WCAG 1.1.1) — cross-check

```javascript
(() => {
  const imgs = [...document.querySelectorAll('img')];
  const svgs = [...document.querySelectorAll('svg')];
  return {
    imgTotal:         imgs.length,
    missingAlt:       imgs.filter(i => !i.hasAttribute('alt')).length,
    emptyAlt:         imgs.filter(i => i.getAttribute('alt') === '').length,
    genericAlt:       imgs.filter(i => /^(image|photo|picture|icon|logo|banner)$/i.test(i.getAttribute('alt') || '')).length,
    svgTotal:         svgs.length,
    svgMissingLabel:  svgs.filter(s => !s.getAttribute('aria-label') && !s.querySelector('title')).length,
    samples: imgs.filter(i => !i.hasAttribute('alt') || !i.getAttribute('alt')).slice(0, 5)
      .map(i => ({ src: i.src.split('/').pop(), alt: i.getAttribute('alt') }))
  };
})()
```

---

## Severity Mapping

| axe-core impact | Jira Priority | WCAG Level | Action |
|-----------------|---------------|------------|--------|
| `critical`      | P1 — Blocker  | A          | Create separate Jira Bug |
| `serious`       | P2 — High     | AA         | Create separate Jira Bug |
| `moderate`      | P3 — Medium   | AA         | Group into summary comment |
| `minor`         | P4 — Low      | AA         | Group into summary comment |

---

## WCAG 2.1 Criterion Quick Reference

| Rule ID (axe) | WCAG Criterion | Level | Description |
|---------------|----------------|-------|-------------|
| `image-alt` | 1.1.1 | A | Images must have alt text |
| `color-contrast` | 1.4.3 | AA | 4.5:1 normal text / 3:1 large text |
| `label` | 1.3.1 / 3.3.2 | A | Inputs must have associated labels |
| `heading-order` | 1.3.1 | A | Headings must not skip levels |
| `html-has-lang` | 3.1.1 | A | `<html>` must have lang attribute |
| `link-name` | 2.4.4 | A | Links must have discernible text |
| `button-name` | 4.1.2 | A | Buttons must have accessible names |
| `aria-*` | 4.1.2 | A | ARIA attributes must be valid |
| `keyboard` | 2.1.1 | A | All functionality via keyboard |
| `focus-visible` | 2.4.7 | AA | Focus indicator must be visible |
| `bypass` | 2.4.1 | A | Skip link / bypass mechanism |
| `duplicate-id` | 4.1.1 | A | IDs must be unique |
| `form-field-multiple-labels` | 1.3.1 | A | One label per form field |

---

## Report Template

Use this structure when writing `outputs/a11y-report-[URL_SLUG]-[YYYYMMDD].html`.

Write a complete, self-contained HTML file. Replace all `[placeholders]` with real data.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Report — [URL_SLUG] — [YYYYMMDD]</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a2e; background: #f4f6fb; padding: 2rem; }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 1.8rem; color: #1a1a2e; margin-bottom: 0.25rem; }
    h2 { font-size: 1.2rem; color: #2d3a6e; margin: 2rem 0 0.75rem; border-bottom: 2px solid #e0e4f0; padding-bottom: 0.4rem; }
    h3 { font-size: 1rem; margin: 1.25rem 0 0.5rem; color: #1a1a2e; }
    .meta { font-size: 0.85rem; color: #555; margin-bottom: 1.5rem; }
    .meta span { margin-right: 1.5rem; }
    .badge { display: inline-block; padding: 0.2rem 0.65rem; border-radius: 4px; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .badge-critical  { background: #fde8e8; color: #c0392b; }
    .badge-serious   { background: #fef3e2; color: #d35400; }
    .badge-moderate  { background: #fffbe6; color: #b8860b; }
    .badge-minor     { background: #e8f5e9; color: #2e7d32; }
    .badge-pass      { background: #e8f5e9; color: #2e7d32; }
    .badge-fail      { background: #fde8e8; color: #c0392b; }
    .badge-review    { background: #fffbe6; color: #b8860b; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1rem 0 1.5rem; }
    .summary-card { background: #fff; border-radius: 8px; padding: 1rem; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
    .summary-card .count { font-size: 2rem; font-weight: 700; }
    .summary-card .label { font-size: 0.78rem; color: #777; text-transform: uppercase; }
    .summary-card.critical .count { color: #c0392b; }
    .summary-card.serious  .count { color: #d35400; }
    .summary-card.moderate .count { color: #b8860b; }
    .summary-card.minor    .count { color: #2e7d32; }
    .status-bar { display: flex; align-items: center; gap: 0.75rem; font-weight: 600; font-size: 1rem; margin-bottom: 1.5rem; }
    .card { background: #fff; border-radius: 8px; padding: 1.25rem 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-left: 4px solid #ccc; }
    .card.critical { border-color: #c0392b; }
    .card.serious  { border-color: #d35400; }
    .card.moderate { border-color: #b8860b; }
    .card.minor    { border-color: #2e7d32; }
    .card-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
    .card-title { font-weight: 600; font-size: 0.95rem; }
    .card dl { display: grid; grid-template-columns: 140px 1fr; gap: 0.3rem 1rem; font-size: 0.875rem; }
    .card dt { font-weight: 600; color: #555; }
    .card dd { color: #1a1a2e; }
    pre { background: #1e1e2e; color: #cdd6f4; padding: 0.85rem 1rem; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; margin: 0.5rem 0; white-space: pre-wrap; word-break: break-all; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; margin: 0.75rem 0; }
    th { background: #eef0f8; text-align: left; padding: 0.55rem 0.75rem; font-weight: 600; color: #333; }
    td { padding: 0.55rem 0.75rem; border-bottom: 1px solid #e8eaf0; vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    .check-pass { color: #2e7d32; font-weight: 600; }
    .check-fail { color: #c0392b; font-weight: 600; }
    .check-warn { color: #b8860b; font-weight: 600; }
    .rec-list { list-style: none; counter-reset: rec; }
    .rec-list li { counter-increment: rec; display: flex; gap: 0.75rem; padding: 0.6rem 0; border-bottom: 1px solid #e8eaf0; font-size: 0.875rem; }
    .rec-list li::before { content: counter(rec); background: #2d3a6e; color: #fff; min-width: 1.5rem; height: 1.5rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; flex-shrink: 0; }
    .rec-list li:last-child { border-bottom: none; }
    .raw-summary { background: #fff; border-radius: 8px; padding: 1rem 1.5rem; font-size: 0.875rem; box-shadow: 0 1px 4px rgba(0,0,0,.08); display: flex; gap: 2rem; flex-wrap: wrap; }
    .raw-summary span { color: #555; }
    .raw-summary strong { color: #1a1a2e; }
    a { color: #2d3a6e; }
    .screenshot { margin: 1rem 0; }
    .screenshot img { max-width: 100%; border-radius: 6px; border: 1px solid #dde; }
    footer { margin-top: 2rem; font-size: 0.78rem; color: #aaa; text-align: center; }
  </style>
</head>
<body>
<div class="container">

  <h1>Accessibility Test Report — WCAG 2.1 AA</h1>
  <div class="meta">
    <span><strong>Page:</strong> <a href="[TARGET_URL]">[TARGET_URL]</a></span>
    <span><strong>Tested:</strong> [YYYYMMDD HH:mm]</span>
    <span><strong>Tester:</strong> Claude (accessibility-testing skill)</span>
    <span><strong>WCAG Level:</strong> 2.1 AA</span>
  </div>

  <!-- ── Executive Summary ── -->
  <h2>Executive Summary</h2>
  <div class="summary-grid">
    <div class="summary-card critical"><div class="count">[CRITICAL_COUNT]</div><div class="label">Critical</div></div>
    <div class="summary-card serious"> <div class="count">[SERIOUS_COUNT]</div> <div class="label">Serious</div></div>
    <div class="summary-card moderate"><div class="count">[MODERATE_COUNT]</div><div class="label">Moderate</div></div>
    <div class="summary-card minor">   <div class="count">[MINOR_COUNT]</div>   <div class="label">Minor</div></div>
  </div>

  <!-- Overall status: replace badge class with badge-pass / badge-fail / badge-review -->
  <div class="status-bar">
    Overall Status: <span class="badge badge-[pass|fail|review]">[PASS / FAIL / NEEDS REVIEW]</span>
  </div>

  <!-- ── Screenshot ── -->
  <h2>Baseline Screenshot</h2>
  <div class="screenshot">
    <img src="[BASELINE_SCREENSHOT]" alt="Baseline screenshot of [TARGET_URL]">
  </div>

  <!-- ── Automated Violations ── -->
  <h2>Automated Violations (axe-core)</h2>

  <!-- Repeat the .card block below for each violation.
       Set class to: card critical | card serious | card moderate | card minor -->

  <!-- EXAMPLE — Critical violation card -->
  <h3><span class="badge badge-critical">Critical</span></h3>
  <!-- [FOR EACH critical violation:] -->
  <div class="card critical">
    <div class="card-header">
      <span class="badge badge-critical">Critical</span>
      <span class="card-title">[rule-id] — [description]</span>
    </div>
    <dl>
      <dt>WCAG</dt>      <dd>[criterion] — Level [A/AA]</dd>
      <dt>Affected</dt>  <dd>[N] element(s)</dd>
      <dt>Fix</dt>       <dd>[help text from axe]</dd>
      <dt>Reference</dt> <dd><a href="[helpUrl]">[helpUrl]</a></dd>
    </dl>
    <p style="font-size:.8rem;margin-top:.6rem;font-weight:600;color:#555;">Example element:</p>
    <pre>[firstNode HTML — escaped]</pre>
  </div>
  <!-- [END FOR EACH] -->

  <h3><span class="badge badge-serious">Serious</span></h3>
  <!-- [FOR EACH serious violation — same card structure with class "card serious"] -->

  <h3><span class="badge badge-moderate">Moderate</span></h3>
  <!-- Moderate + Minor can be a table instead of cards -->
  <table>
    <thead><tr><th>Rule</th><th>Description</th><th>Elements</th><th>WCAG</th></tr></thead>
    <tbody>
      <!-- <tr><td>[id]</td><td>[description]</td><td>[N]</td><td>[criterion]</td></tr> -->
    </tbody>
  </table>

  <h3><span class="badge badge-minor">Minor</span></h3>
  <table>
    <thead><tr><th>Rule</th><th>Description</th><th>Elements</th><th>WCAG</th></tr></thead>
    <tbody>
      <!-- <tr><td>[id]</td><td>[description]</td><td>[N]</td><td>[criterion]</td></tr> -->
    </tbody>
  </table>

  <!-- ── Manual Checks ── -->
  <h2>Manual Checks</h2>
  <table>
    <thead><tr><th>Check</th><th>Criterion</th><th>Status</th><th>Detail</th></tr></thead>
    <tbody>
      <tr>
        <td>Keyboard traversal</td><td>2.1.1</td>
        <td class="check-[pass|fail]">[&#10003; Pass / &#10007; Fail]</td>
        <td>[N] focusable elements[, issues if any]</td>
      </tr>
      <tr>
        <td>Focus visibility</td><td>2.4.7</td>
        <td class="check-[pass|fail]">[&#10003; Pass / &#10007; Fail]</td>
        <td>[outline:none on N selectors] or [OK]</td>
      </tr>
      <tr>
        <td>Skip link</td><td>2.4.1</td>
        <td class="check-[pass|fail]">[&#10003; Pass / &#10007; Fail]</td>
        <td>[Present: "Skip to main"] or [Missing]</td>
      </tr>
      <tr>
        <td>Heading hierarchy</td><td>1.3.1</td>
        <td class="check-[pass|fail]">[&#10003; Pass / &#10007; Fail]</td>
        <td>[OK] or [issues list]</td>
      </tr>
      <tr>
        <td>Image alt text</td><td>1.1.1</td>
        <td class="check-[pass|fail|warn]">[&#10003; Pass / &#10007; Fail / &#9888; Review]</td>
        <td>[N] total, [N] missing, [N] empty</td>
      </tr>
    </tbody>
  </table>

  <!-- ── Recommendations ── -->
  <h2>Recommendations</h2>
  <ol class="rec-list">
    <li><strong>[Priority tag]</strong> [Fix description]</li>
    <!-- add one <li> per recommendation -->
  </ol>

  <!-- ── axe-core Raw Summary ── -->
  <h2>axe-core Raw Summary</h2>
  <div class="raw-summary">
    <span><strong>Violations:</strong> [N]</span>
    <span><strong>Incomplete:</strong> [N]</span>
    <span><strong>Passes:</strong> [N]</span>
    <span><strong>Engine:</strong> axe-core 4.9.1</span>
    <span><strong>Tags:</strong> wcag2a, wcag2aa</span>
  </div>

  <footer>Generated by Claude accessibility-testing skill &middot; WCAG 2.1 AA &middot; [YYYYMMDD]</footer>

</div>
</body>
</html>
```

---

## Jira Comment Template (Moderate + Minor Summary)

Use with `addCommentToJiraIssue`:

```
♿ Accessibility Test — Moderate & Minor Findings
Page: [TARGET_URL]
WCAG Level: 2.1 AA | Date: [YYYYMMDD]

*Moderate Violations* (fix recommended)
|| Rule || Description || Elements Affected || WCAG ||
| [id] | [description] | N | [criterion] |

*Minor Violations* (low priority)
|| Rule || Description || Elements Affected || WCAG ||
| [id] | [description] | N | [criterion] |

Full report: outputs/a11y-report-[URL_SLUG]-[YYYYMMDD].html
```

---

## Jira Bug Template (Critical / Serious)

Use with `createJiraIssue` for each critical/serious violation:

**Summary:** `[A11Y-CRITICAL] [WCAG 1.1.1] — Images missing alt text on /settings`

**Description:**
```
*Accessibility Violation*
Rule:      [axe rule ID]
WCAG:      [criterion] — Level [A/AA]
Impact:    Critical / Serious
Page:      [TARGET_URL]

*Steps to Reproduce*
1. Navigate to [TARGET_URL]
2. Inspect [N] element(s) matching: [firstNode HTML snippet]

*Expected*
[Expected accessible behaviour per WCAG]

*Actual*
[What axe-core / manual check found]

*Affected Elements* ([N] total)
{code}[allNodes list]{code}

*Reference*
[axe helpUrl]
```

**Issue Type:** Bug
**Labels:** accessibility, wcag-2.1, [a11y-critical / a11y-serious]
