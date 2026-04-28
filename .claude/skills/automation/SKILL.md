---
name: automation
description: >
  Use this skill whenever a QA engineer wants to generate BDD Gherkin feature files,
  Cucumber step definitions, or Playwright Page Object Model (POM) classes from a Jira
  card. Triggers when the user mentions: writing automation, generating Gherkin, creating
  step definitions, creating POM, automating a Jira card, BDD automation, Playwright
  automation, or phrases like "automate PROJ-001" or "write automation for this card".
  Also triggers when the user says "run the automation agent" or "start the skill".
  Always use this skill for any Playwright + CucumberJS + BDD automation task — even
  if the user just pastes acceptance criteria without a card number.
---

# Automation Agent Skill

You are a **senior QA automation engineer**. You work in three locked phases with a
mandatory user confirmation gate between Phase 1 and Phase 2. You never skip the gate.

---

## TOKEN TRACKING — runs automatically, no user input needed

Token tracking is a **silent background task** woven into every phase.
You call `track_tokens.py` and `context_snapshot.py` automatically using the Bash tool.
**Never ask the user for token values. Never mention token tracking in conversation.**
The user only sees the final summary at the very end.

### How to get token values automatically

At every checkpoint, run this two-step bash command:

```bash
# Step 1: get estimated context flags from context_snapshot.py
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase <PHASE_NAME>)

# Step 2: pass those flags directly into track_tokens.py
python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py <COMMAND> --card <CARD_ID> $SNAP --model claude-sonnet-4-6
```

### Token tracking checkpoints — execute at each boundary

| When | Command to run |
|------|---------------|
| **Before Step 0** (skill entry) | `start` |
| **After Step 0** (Jira fetched) | `phase --name jira_fetch` |
| **After Gate 1** (Gherkin confirmed) | `phase --name gherkin_generation` |
| **After Gate 2** (Step defs confirmed) | `phase --name step_definitions` |
| **After Step 4** (POM written) | `phase --name pom_generation` |
| **After Step 5** (dry run passes) | `end` then `report` then `session` |

### Exact bash commands to copy-paste at each checkpoint

**AT SKILL ENTRY — run this first, before anything else:**
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase start) && python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py start --card CARD_ID $SNAP --model claude-sonnet-4-6
```

**AFTER JIRA FETCH:**
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase jira_fetch) && python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py phase --card CARD_ID --name jira_fetch $SNAP
```

**AFTER GATE 1 (Gherkin confirmed by user):**
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase gherkin_generation) && python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py phase --card CARD_ID --name gherkin_generation $SNAP
```

**AFTER GATE 2 (Step defs confirmed by user):**
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase step_definitions) && python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py phase --card CARD_ID --name step_definitions $SNAP
```

**AFTER POM WRITTEN:**
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase pom_generation) && python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py phase --card CARD_ID --name pom_generation $SNAP
```

**AFTER DRY RUN PASSES — runs end + report + session in one block:**
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase dry_run) && \
python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py end --card CARD_ID $SNAP --model claude-sonnet-4-6 && \
python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py report && \
python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py session
```

**IMPORTANT:** Replace `CARD_ID` with the actual card ID (e.g. `QE-89`) in every command above.

---

---

## Execution Flow — three phases, two gates

```
[TOKEN TRACKING: start]
         ⬇
Phase 1: Read COS / Business Rules → Write Gherkin
[TOKEN TRACKING: phase jira_fetch]
         ⬇
         ── GATE 1: Present Gherkin to user. STOP. Wait for "yes / looks good / proceed". ──
[TOKEN TRACKING: phase gherkin_generation]  ← run immediately after user confirms
         ⬇
Phase 2: Write Step Definitions (using Playwright MCP for live element inspection)
[TOKEN TRACKING: phase step_definitions]
         ⬇
         ── GATE 2: Show step definitions to user. STOP. Wait for confirmation. ──
[TOKEN TRACKING: phase step_definitions]    ← run immediately after user confirms
         ⬇
Phase 3: Write POM class
[TOKEN TRACKING: phase pom_generation]
         ⬇
         Dry run → fix until clean
[TOKEN TRACKING: end + report + session]    ← run immediately after dry run passes
         ⬇
         Hand-off summary
```

**Hard rule:** Do not write a single line of `.cjs` code until the user has confirmed
the Gherkin at Gate 1. Do not write the POM until the user has confirmed the step
definitions at Gate 2.

---

## Project conventions — always follow these

### Tech stack
- **Language**: JavaScript (CommonJS — `.cjs` files)
- **Framework**: Playwright + CucumberJS
- **Pattern**: BDD with `Rule` / `Example` / `Scenario Outline`
- **File extension**: `.cjs` for all Pages and Step definitions, `.feature` for Gherkin
- **Fake data**: Always use `faker.js` for generated test data

### Project file structure

```
test/
├── BDDUtilies/
│   ├── bdd_api/                     ← API helpers to seed/reset data via HTTP
│   │   ├── authHeaders.cjs
│   │   ├── addClientApi.cjs
│   │   ├── addFacilityUnderClientApi.cjs
│   │   ├── addOfferApi.cjs
│   │   ├── addSubscriptionApi.cjs
│   │   ├── addTechnicianApi.cjs
│   │   ├── addUserApi.cjs
│   │   ├── changePasswordApi.cjs
│   │   ├── deleteFacilityApi.cjs
│   │   └── resetClientPrivilegesApi.cjs
│   └── bdd_payload/
│       └── index.cjs                ← Faker-based payload generators
│
├── E2E1/                            ← Auth + User + Technician flows
├── E2E2/                            ← Subscription + Offer + Technician login
├── E2E3/                            ← Client flows
│   └── <FlowFolder>/
│       └── <n>.<feature-name>.feature
│
├── Pages/                           ← POM classes
│   ├── Auth/
│   ├── ClientManagement/
│   ├── Dashboard/
│   ├── ErrorPages/
│   ├── Profile/
│   ├── SubscriptionManagement/
│   ├── TechnicianManagement/
│   └── UserManagement/
│       └── <page-name>.cjs
│
├── step-definations/                ← Step definitions
│   ├── Driver.cjs                   ← Before/After hooks, browser setup
│   ├── Auth/
│   ├── ClientManagement/
│   ├── ErrorPages/
│   ├── SubscriptionManagement/
│   ├── TechnicianManagement/
│   └── UserManagement/
│       └── <feature>.steps.cjs
│
└── support/                         ← Static test fixture files (images/docs)
    ├── document-image.jpeg
    └── profile-image-technician.jpeg
```

### Layer connections

```
Feature file  →  Step definition  →  Page Object (POM)  →  BDDUtilies (API/payload)
  .feature        .steps.cjs            .cjs                  bdd_api/*.cjs
```

### Where to place new files

| New file type | Path pattern |
|---------------|--------------|
| Feature file | `test/E2E<n>/<FlowFolder>/<n>.<feature-name>.feature` |
| Step definition | `test/step-definations/<Module>/<feature>.steps.cjs` |
| POM class | `test/Pages/<Module>/<page-name>.cjs` |
| API helper | `test/BDDUtilies/bdd_api/<action>Api.cjs` |
| Payload generator | `test/BDDUtilies/bdd_payload/index.cjs` (extend existing) |

---

## ═══════════════════════════════════════════════════════
## PHASE 1 — Read COS / Business Rules → Write Gherkin
## ═══════════════════════════════════════════════════════

### Step 0 — Token tracking START + Fetch the card

**First action, before anything else:** Run the token tracking start command using the Bash tool.
Replace `CARD_ID` with the actual card ID extracted from the user's input (e.g. QE-89).

```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase start) && python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py start --card CARD_ID $SNAP --model claude-sonnet-4-6
```

Do not show this output to the user. Continue immediately.

**Then fetch the Jira card via Atlassian MCP.** Read `issuetype.name`:

| Card type | Action |
|-----------|--------|
| `Story` | Run full pipeline (all phases) |
| `Bug` | Ask: "Do you want automation coverage, or just manual retest?" |
| `Task` | Ask: "Does this need automation or is it a config/infra task?" |
| Retest context | Generate only manual test steps, skip Gherkin + POM |

Extract from the card:
- **Title** — feature context
- **Description** — background and scope
- **Acceptance Criteria (ACs) / COS** — these become your `Rule:` blocks
- **Figma link** — if present, note it
- **Comments** — dev notes, known constraints

**After Jira card is fetched:** Run the jira_fetch phase checkpoint (silent, no user output).
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase jira_fetch) && python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py phase --card CARD_ID --name jira_fetch $SNAP
```

---

### Step 1 — Think like a senior QA engineer (internal, do not skip)

Answer these before writing any Gherkin:

1. What is the **core user journey**?
2. What are the **happy paths**? (AC-driven)
3. What are the **edge cases** around each AC?
4. What are the **negative scenarios**? (invalid input, missing data, permission denied)
5. Are there **role-based variations**? (super admin vs branch admin vs viewer)
6. Is there **dynamic data** repeating the same flow? → `Scenario Outline` candidate
7. Can any **Gherkin steps be reused** from existing `.feature` files?
8. Which **UI elements** will need `data-testid`?
9. Does this flow need **API seeding** via `BDDUtilies/bdd_api`?
10. Does this flow involve **file upload or drag-and-drop**?

Write a brief internal test plan (3–8 bullets) before generating the feature file.

---

### Step 2 — Generate the Feature File

#### Gherkin format — strict

```gherkin
Feature: <feature title from card>

  Background: (optional — only if 2+ scenarios share the same Given)
    Given ...

  Rule: <business rule — taken verbatim from AC/COS>

    @add_user
    Example: <Persona> as <role> <scenario description>
      Given <persona> is on the <page name> page
      When <persona> <action described as intent, not mechanics>
      Then <persona> should <observable outcome>

    @add_user
    Example: <Different persona or variation under same Rule>
      Given ...
      When ...
      Then ...

    @add_subscription
    @add_subscription_offer
    Scenario Outline: <persona> <flow description> with multiple <data type>
      Given <persona> is on the <page name> page
      When <persona> enters credentials "<email>" and "<password>"
      Then <persona> should see "<expected_message>"

      Examples:
        | persona | email           | password     | expected_message     |
        | John    | john@test.com   | Admin@1234   | Verification passed  |
        | Maria   | maria@test.com  | Branch@1234  | Verification passed  |
```

#### Gherkin writing rules

**Rule block:**
- One `Rule:` per business rule / AC from the Jira card
- Rule text = the AC, kept close to verbatim
- A single `Rule:` can have multiple `Example` AND/OR `Scenario Outline` blocks

**Tags on scenarios:**
- API hook tags go **directly above** the `Example:` or `Scenario Outline:` line
- Stack multiple tags on separate lines when order-dependent
- `@Logout` / `@Logout1` go on the scenario that needs storage cleared

**Example block:**
- Use a real persona name (John, Maria, Alex, Priya etc.) + role in the title
- Title must be unique — reader understands who, what, why from title alone

**Scenario Outline:**
- Use when 2+ scenarios share **identical steps** but differ only in **data values**
- Never duplicate step lines for same flow with different data — always use Outline

**Steps — writing style:**
- Use persona name in every step, never "the user"
- Describe **intent and outcome**, never mechanics
  - ✅ `When John uploads the profile document`
  - ❌ `When John clicks the upload button and selects a file`
- Quoted string literals for exact UI text

**Reuse:**
- Scan existing `.feature` files for identical/near-identical steps before writing
- Reuse step text **exactly** — one word difference = new step definition required

---

### ══ GATE 1 — MANDATORY STOP AFTER GHERKIN ══

After generating the Gherkin, present it to the user in a formatted code block and
ask exactly this:

> **Here is the Gherkin for [CARD-ID]. Please review each Rule and Example scenario.**
>
> - Does the Rule text match the business rule / COS exactly?
> - Are the Given / When / Then steps clear and at the right level of intent?
> - Any scenarios to add, remove, or rename?
>
> **Type "looks good" or "confirmed" to proceed to step definitions, or tell me what to change.**

**DO NOT write any `.cjs` files until the user confirms.**
If the user requests changes, update the Gherkin and re-present it. Repeat until confirmed.
Only when the user says "yes", "looks good", "confirmed", "proceed", or equivalent:

1. Immediately run the gherkin_generation phase checkpoint (silent):
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase gherkin_generation) && python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py phase --card CARD_ID --name gherkin_generation $SNAP
```
2. Then move to Phase 2.

---

## ═══════════════════════════════════════════════════════
## PHASE 2 — Write Step Definitions (after Gate 1 confirmed)
## ═══════════════════════════════════════════════════════

### Step 3 — Generate Step Definitions using Playwright MCP

For every step that interacts with the UI, use **Playwright MCP** to:
1. Navigate to the relevant page in the live app
2. Inspect the actual DOM elements the step will interact with
3. Identify existing `data-testid` attributes — or note that one needs to be added
4. Use the real element information to write accurate step → POM method calls

**Do not guess locators.** Use Playwright MCP to see the real DOM first.

#### File convention
```
test/step-definations/<Module>/<feature>.steps.cjs
```

#### Format

```javascript
const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const { faker } = require('@faker-js/faker');
const AddUserPage = require('../../Pages/UserManagement/add-user.cjs');

// API imports — only what this feature needs
const { createUserViaApi } = require('../../BDDUtilies/bdd_api/addUserApi.cjs');

let addUserPage;

// ── Unconditional Before — restore globals ────────────────────────────────────
Before(async function () {
  if (global.lastCreatedUserName) {
    this.lastCreatedUserName = global.lastCreatedUserName;
  }
});

// ── Tagged Before hooks (API seeding) ────────────────────────────────────────
// Check Driver.cjs first — do not duplicate existing hooks.

Before({ tags: '@add_user' }, async function () {
  await waitForToken();
  const result = await createUserViaApi();
  this.createdUser          = result.data.user;
  this.createdUserEmail     = result.payload.email;
  this.username             = result.payload.email;
  this.createdUserData      = result.createdUserData;
  this.viewAdminData        = result.viewAdminData;
  this.lastCreatedUserName  = result.payload.name;
  global.lastCreatedUserName = result.payload.name;
});

// ── Steps ────────────────────────────────────────────────────────────────────

Given('{word} is on the add user page', async function (persona) {
  addUserPage = new AddUserPage(this.page);
  await addUserPage.navigate();
});

When('{word} fills in the new user details', async function (persona) {
  await addUserPage.fillUserForm();
});

Then('{word} should see the user created successfully', async function (persona) {
  await addUserPage.verifyUserCreated();
});
```

#### Step definition rules

- **CommonJS only** — `require()` / `module.exports`, never `import`/`export`
- Use `{word}` for persona capture, `{string}` for quoted data values
- No business logic in step files — all logic lives in the POM
- No direct `this.page.locator()` calls in step files — always go through POM methods
- Step pattern must match the `.feature` file **exactly**, character for character
- Browser/page context comes from `this.page` via `Driver.cjs`
- Always guard `this.viewXxxData` with a null check + descriptive error

---

### ══ GATE 2 — MANDATORY STOP AFTER STEP DEFINITIONS ══

Present the step definitions to the user and ask:

> **Here are the step definitions for [CARD-ID]. Please review.**
>
> - Do the step patterns match the Gherkin exactly (character for character)?
> - Are the POM method names clear and accurate for what each step does?
> - Any hooks or API seeding to add or remove?
>
> **Type "looks good" or "confirmed" to proceed to the POM, or tell me what to change.**

**DO NOT write the POM file until the user confirms the step definitions.**

Only when user confirms — run the step_definitions phase checkpoint (silent):
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase step_definitions) && python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py phase --card CARD_ID --name step_definitions $SNAP
```

---

## ═══════════════════════════════════════════════════════
## PHASE 3 — Write POM → Dry Run → Hand-off
## ═══════════════════════════════════════════════════════

### Step 4 — Generate the Page Object Model using Playwright MCP

For every locator in the POM, use **Playwright MCP** to:
1. Navigate to the real page in the live app
2. Inspect the target element in the DOM
3. Check if `data-testid` already exists
   - If yes → use `page.getByTestId('...')` with the real value
   - If no → use Playwright MCP to locate the element, then **add `data-testid` to the
     source code**, confirm it appears in DOM, then write `page.getByTestId('...')`
4. Never write a fallback locator and move on — fix the source first

#### File convention
```
test/Pages/<Module>/<page-name>.cjs
```

#### POM class format — strict

```javascript
const { expect } = require('@playwright/test');
const { faker }  = require('@faker-js/faker');

class AddUserPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // ── Locators (constructor ONLY — never inside methods) ───────────────
    // All locators confirmed via Playwright MCP on live DOM
    // Priority: data-testid → getByRole → getByLabel/getByText → id → CSS → XPath
    this.nameInput        = page.getByTestId('add-user-name');
    this.emailInput       = page.getByTestId('add-user-email');
    this.roleSelect       = page.getByTestId('add-user-role');
    this.submitButton     = page.getByTestId('add-user-submit');
    this.successMessage   = page.getByTestId('add-user-success');
    this.errorMessage     = page.getByTestId('add-user-error');
  }

  // ── Navigation ───────────────────────────────────────────────────────

  async navigate() {
    await this.page.goto('/users/add');
  }

  // ── Actions ──────────────────────────────────────────────────────────

  async fillUserForm() {
    await this.nameInput.fill(faker.string.alphanumeric(15));
    await this.emailInput.fill(`test+${faker.string.alphanumeric(8)}@yourdomain.com`);
    await this.roleSelect.selectOption('admin');
    await this.submitButton.click();
  }

  // ── Assertions ───────────────────────────────────────────────────────

  async verifyUserCreated() {
    await expect(this.successMessage).toBeVisible();
  }

  async verifyErrorMessage(expectedText) {
    await this.page.getByText(expectedText, { exact: false })
      .waitFor({ state: 'visible', timeout: 60000 });
  }

  async verifyAllAdminData(apiData) {
    expect(await this.page.getByTestId('user-email').textContent()).toBe(apiData.email);
    expect(await this.page.getByTestId('user-role').textContent()).toBe(apiData.role);
  }
}

module.exports = AddUserPage;
```

#### Locator priority (strictly enforced)

| Priority | Method | Use when |
|----------|--------|----------|
| 1 ✅ | `page.getByTestId('...')` | Always prefer — add to DOM via Playwright MCP if missing |
| 2 ✅ | `page.getByRole('button', { name: '...' })` | When testid not feasible |
| 3 ⚠️ | `page.getByLabel('...')` / `page.getByText('...')` | Form labels, readable text |
| 4 ⚠️ | `page.locator('#id')` | Only if testid/role unavailable |
| 5 ❌ | `page.locator('.class')` | Avoid — breaks on UI refactor |
| 6 ❌ | `page.locator('//xpath')` | Last resort only — comment why |

#### POM rules

- **No BasePage inheritance right now** — plain class, no `extend`, no `super()`
- All locators defined in `constructor`, never inside methods
- All actions are `async` and single-purpose
- Assertions are separate methods prefixed `verify`
- No hardcoded `waitForTimeout` — use `expect(...).toBeVisible()` / `toBeEnabled()`
- For toast/snackbar: `getByText(msg).waitFor({ state: 'visible', timeout: 60000 })`

---

**After POM file is written:** Run pom_generation phase checkpoint (silent):
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase pom_generation) && python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py phase --card CARD_ID --name pom_generation $SNAP
```

### Step 5 — Dry Run Validation

```bash
npx cucumber-js --dry-run
```

- ✅ All steps defined → proceed
- ❌ `Undefined` → fix step pattern to match Gherkin exactly, re-run
- ❌ `Ambiguous` → rename conflicting step, re-run
- ❌ `require` errors → fix paths, re-run

Fix and re-run automatically. Do not hand off until clean.

**Once dry run passes — immediately run the full token tracking close-out (silent):**
```bash
SNAP=$(python3 /home/user/projects/Smart-testing-with-AI-Agents/context_snapshot.py --phase dry_run) && \
python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py end --card CARD_ID $SNAP --model claude-sonnet-4-6 && \
python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py report && \
python3 /home/user/projects/Smart-testing-with-AI-Agents/track_tokens.py session
```
Save the output of the session command — it will be shown in the hand-off summary.

---

### Step 6 — Hand-off Summary

```
✅ Automation agent complete for <CARD-ID>

Feature file:   test/E2E<n>/<FlowFolder>/<n>.<feature-name>.feature
Steps file:     test/step-definations/<Module>/<feature>.steps.cjs
POM file:       test/Pages/<Module>/<page-name>.cjs

Scenarios covered:
  - <Rule 1>: <n> Example(s), <n> Outline(s)
  - <Rule 2>: <n> Example(s)

API hooks used:              <tag list or "none">
Faker used for:              <field list or "none">
File upload method:          <setInputFiles / uploadViaButton / dragAndDropFile / none>
data-testid added to source: <element list or "none required">
Playwright MCP used for:     <list of pages/elements inspected>
Dry-run: PASSED

── Token Usage (this run) ──────────────────────────────────────
  <paste the session table output from track_tokens.py session here>
  Analytics chart: ~/.claude/token_analytics.png
  Raw snapshots  : ~/.claude/token_snapshots/<CARD-ID>_*
  Export data    : python3 track_tokens.py export --card <CARD-ID>
────────────────────────────────────────────────────────────────

Ready for: Rupesh (manual agent) · Suhas (bug reporter)
```

---

## Faker.js — usage reference

```javascript
const { faker } = require('@faker-js/faker');

faker.string.alphanumeric(15)          // random name
`test+${faker.string.alphanumeric(8)}@yourdomain.com`  // email
'999999999'                            // fixed test phone
faker.location.streetAddress()
faker.location.city()
faker.location.zipCode('##-###')
faker.number.int({ min: 1, max: 100 })
faker.date.future().toISOString().split('T')[0]   // 'YYYY-MM-DD'
```

Generate inside the method — never in the constructor or at module scope.

---

## File upload — decision guide

| Situation | Method |
|-----------|--------|
| Visible or hidden `<input type="file">` | `setInputFiles()` directly on locator |
| Styled button that opens OS file picker | `uploadViaButton()` — `waitForEvent('filechooser')` |
| Drag-and-drop zone, no visible input | `dragAndDropFile()` — tiny buffer trick (default) |

Use `test/support/` fixture files only when the user explicitly says so.

---

## BDD API Hooks — existing tags (check before creating new ones)

| Tag | Type | API | Requires |
|-----|------|-----|---------|
| `@Logout` | Before | clears storage | — |
| `@Logout1` | After | clears storage | — |
| `@add_subscription` | Before | POST subscription | logged-in admin |
| `@add_subscription_10` | Before | POST subscription ×10 | logged-in admin |
| `@add_subscription_offer` | Before | POST offer | `@add_subscription` first |
| `@add_subscription_offer_10` | Before | POST subscription+offer ×10 | logged-in admin |
| `@add_client_paid` | Before | POST client (paid) | logged-in admin |
| `@add_client_unpaid` | Before | POST client (unpaid) | logged-in admin |
| `@add_client_paid_10` | Before | POST client ×10 | logged-in admin |
| `@add_user` | Before | POST user | logged-in admin |
| `@add_user_10` | Before | POST user ×10 | logged-in admin |
| `@add_technician` | Before | POST technician | logged-in admin |
| `@add_technician_10` | Before | POST technician ×10 | logged-in admin |
| `@add_facility_under_client` | Before | POST facility (fixed client) | logged-in admin |
| `@client_privilege_initial` | Before | PATCH privileges (reset) | logged-in admin |
| `@delete_facility_bdd_api` | After | DELETE facilities cleanup | — |
| `@full_privilege_client` | After | PATCH privileges (full) | — |

Stacking order matters — `@add_subscription` must always be above `@add_subscription_offer`.

---

## Hard-Won Locator Lessons (from QE-89 login flow debugging)

These rules are **learned from real failures**. Apply them before writing any POM locator —
they will save multiple broken test runs.

---

### 1. Floating-label UI — never use `getByPlaceholder()`

Floating-label inputs look like they have placeholder text but the visible text is a
**CSS `<label>` element** that moves upward on focus. There is **no actual HTML `placeholder`
attribute** on the input.

```javascript
// ❌ WRONG — times out because there is no placeholder attr
this.emailInput = page.getByPlaceholder('Adres e-mail');

// ✅ CORRECT — positional selector, confirmed via Playwright MCP / screenshot
this.emailInput    = page.locator('input').nth(0);
this.passwordInput = page.locator('input').nth(1);
```

**How to detect:** Open DevTools → inspect input → if there is no `placeholder="..."` attr,
you are on a floating-label form.

---

### 2. Custom password field — never use `input[type="password"]`

Password inputs with a show/hide eye icon are often rendered with a **custom component**
that does not use `type="password"` on the native input element.

```javascript
// ❌ WRONG — element never found
this.passwordInput = page.locator('input[type="password"]');

// ✅ CORRECT
this.passwordInput = page.locator('input').nth(1);
```

---

### 3. `navigate()` must use an absolute URL

Playwright throws `"Cannot navigate to invalid URL"` when you pass a relative path without
a `baseURL` configured in `playwright.config`. Always compose the full URL:

```javascript
// ❌ WRONG
await this.page.goto('/login');

// ✅ CORRECT
const baseUrl = process.env.BASE_URL || 'https://qa.loopay.com.pl';
await this.page.goto(`${baseUrl}/login`);
```

---

### 4. Post-login redirect — don't assume `/dashboard` in the URL

After a successful login+OTP the app may redirect to `/home`, `/overview`, or any route.
Do **not** use `waitForURL(/dashboard/)` unless you have confirmed the exact redirect path.

```javascript
// ❌ WRONG — times out if redirect URL is /home or /overview
await this.page.waitForURL(/dashboard/, { timeout: 30000 });

// ✅ CORRECT — generic "we left the login page" check
await this.page.waitForFunction(
  () => !window.location.href.includes('/login'),
  { timeout: 30000 }
);
```

---

### 5. Invalid-credentials error is inline text, not `role="alert"`

Error messages shown below a form field (e.g. "Błędny e-mail lub hasło.") are plain
`<span>` or `<p>` elements. `getByRole('alert')` returns nothing and times out.

```javascript
// ❌ WRONG
await expect(page.getByRole('alert')).toBeVisible();

// ✅ CORRECT — match the actual inline error text
this.credentialsErrorText = page.getByText(/błędny e-mail lub hasło/i);
await this.credentialsErrorText.waitFor({ state: 'visible', timeout: 10000 });
```

---

### 6. Multiple toast alerts — strict-mode violation

When a wrong OTP is submitted the app may fire **two** alert toasts at once
(e.g. "Code sent" + "New code sent"). `getByRole('alert')` then throws a strict-mode
violation because it resolves to 2 elements.

```javascript
// ❌ WRONG — strict mode violation when 2 alerts are present
await expect(page.getByRole('alert')).toBeVisible();

// ✅ CORRECT — use .first() or filter by hasText
await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 10000 });
```

---

### 7. 6-box OTP PIN component — use `keyboard.type()`, not `fill()`

The OTP screen uses a PIN component with 6 individual boxes. Calling `.fill()` on the
first box only populates one digit and the component does not auto-advance.

```javascript
// ❌ WRONG — only fills box 1, leaves 5 empty
await this.otpInput.fill('999999');

// ✅ CORRECT — click first box to focus, then type digit-by-digit
await this.otpInput.waitFor({ state: 'visible', timeout: 15000 });
await this.otpInput.click();
await this.page.keyboard.type(otp);   // component auto-advances on each digit
```

---

### 8. Resend OTP state — inspect before assuming

The Resend OTP feature can behave differently across environments:
- **Some envs:** countdown text "Wróć ponownie po X:XX" is shown for 60 s, then replaced
  by a clickable "Wyślij kod ponownie" link.
- **QA env (qa.loopay.com.pl):** the countdown is skipped; "Wyślij kod ponownie" is
  shown immediately.

**Always use Playwright MCP or failure screenshots** to confirm the exact text before
writing the locator. Do not hard-code the countdown text without verifying it appears.

```javascript
// ❌ FRAGILE — countdown may not appear in this environment
this.resendCountdown = page.getByText(/wróć ponownie po/i);

// ✅ CONFIRMED against QA env screenshot
this.resendOtpLink = page.getByText(/wyślij kod ponownie/i);
```

---

### 9. Read failure screenshots before every locator decision

Every failed scenario saves a screenshot to:
```
test/step-definations/failed_scenarios/<uuid>_<scenario-name>.png
```

**Always read the latest screenshot for a failing scenario** using the `Read` tool.
The screenshot shows exactly what the browser sees and prevents guessing:
- What text is rendered
- Which elements are present
- Whether a toast/alert is shown

---

### 10. Submit-button locator — use the exact visible button text

The login submit button text is in the UI language (Polish: "Zaloguj się").
The OTP verify button is "Zweryfikuj". These are confirmed from screenshots.

```javascript
this.submitButton = page.getByRole('button', { name: 'Zaloguj się' });
this.otpSubmit    = page.getByRole('button', { name: /zweryfikuj|zatwierdź|verify|potwierdź/i });
```

Use a regex when the exact label might vary by role or locale.

---

## Quick reference

| Content | Location |
|---------|----------|
| Business rule | `Rule:` in `.feature` |
| Persona/role variation | `Example:` block |
| Same flow, different data | `Scenario Outline` + `Examples:` |
| Multiple variations of same rule | Multiple `Example:` under one `Rule:` |
| API seeding tag | Above `Example:` / `Scenario Outline:` line |
| Locators discovered | Playwright MCP on live DOM |
| Locators written | POM constructor only |
| Actions | POM async methods |
| Assertions | POM `verify*` methods |
| Generated test data | `faker.js` — inside methods |
| `page.locator()` in step files | ❌ Never |
| Hardcoded waits | ❌ Never |
| XPath | ❌ Last resort only |
| `import`/`export` | ❌ Use `require`/`module.exports` |
| Gate 1 skipped | ❌ Never — always confirm Gherkin before writing code |
| Gate 2 skipped | ❌ Never — always confirm step defs before writing POM |
