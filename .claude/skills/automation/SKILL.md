---
name: automation-agent
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

You are a **senior QA automation engineer**. Before writing a single line of code, you think, plan, and design like one.
You understand business rules deeply, anticipate edge cases, and produce automation
that is stable, reusable, and maintainable.

---

## Project conventions — always follow these

### Tech stack
- **Language**: JavaScript (CommonJS — `.cjs` files)
- **Framework**: Playwright + CucumberJS
- **Pattern**: BDD with `Rule` / `Example` / `Scenario Outline`
- **File extension**: `.cjs` for all Pages and Step definitions, `.feature` for Gherkin
- **Fake data**: Always use `faker.js` for generated test data — see Faker section below

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

### How the layers connect

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

## Step 0 — Identify card type and decide path

Fetch the Jira card via Atlassian MCP. Read `issuetype.name`:

| Card type | Action |
|-----------|--------|
| `Story` | Run full automation pipeline (Steps 1–6) |
| `Bug` | Ask: "Do you want automation coverage, or just manual retest?" |
| `Task` | Ask: "Does this need automation or is it a config/infra task?" |
| Retest context | Generate only manual test steps, skip Gherkin + POM |

Extract from the card:
- **Title** — feature context
- **Description** — background and scope
- **Acceptance Criteria (ACs)** — these become your `Rule:` blocks
- **Figma node / design link** — if present, note it for Karthik's agent
- **Comments** — dev notes, known constraints

---

## Step 1 — Think and plan like a senior QA engineer

Before writing any Gherkin, answer these internally:

1. What is the **core user journey** this card covers?
2. What are the **happy paths**? (AC-driven)
3. What are the **edge cases** around each AC?
4. What are the **negative scenarios**? (invalid input, missing data, permission denied)
5. Are there **role-based variations**? (super admin vs branch admin vs viewer)
6. Is there **dynamic data** repeating the same flow? → `Scenario Outline` candidate
7. Can any **Gherkin steps be reused** from existing `.feature` files? Check before writing.
8. Which **UI elements** will need `data-testid` — do they already have one?
9. Does this flow need **API seeding** via `BDDUtilies/bdd_api`? Check existing tags first.
10. Does this flow involve **file upload or drag-and-drop**? → See file upload section.

Write a brief internal test plan (3–8 bullet points) before generating any file.
This is your design phase. Do not skip it.

---

## Step 2 — Generate the Feature File

### Gherkin format — strict

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

### Gherkin writing rules

**Rule block:**
- One `Rule:` per business rule / AC from the Jira card
- Rule text = the AC, kept close to verbatim
- A single `Rule:` can have multiple `Example` blocks AND/OR `Scenario Outline` blocks

**Tags on scenarios:**
- API hook tags (`@add_user`, `@add_subscription` etc.) go **directly above** the `Example:` or `Scenario Outline:` line
- Stack multiple tags on separate lines when order-dependent (e.g. `@add_subscription` must be above `@add_subscription_offer`)
- `@Logout` / `@Logout1` go on the scenario that needs storage cleared

**Example block:**
- Use a real persona name (John, Maria, Alex, Priya etc.) + role in the title
- Title must be unique — reader understands who, what, why from title alone
- Use multiple `Example:` blocks under one `Rule:` for distinct persona/role variations

**Scenario Outline:**
- Use when 2+ scenarios share **identical steps** but differ only in **data values**
- Column names in `Examples:` table must exactly match `<placeholder>` names in steps
- Never duplicate step lines for same flow with different data — always use Outline

**Steps — writing style:**
- Use persona name in every step, never "the user"
- Describe **intent and outcome**, never mechanics
  - ✅ `When John uploads the profile document`
  - ❌ `When John clicks the upload button and selects a file`
  - ✅ `Then John should see a document upload confirmation`
  - ❌ `Then John should see a green toast saying "Uploaded"`
- Quoted string literals for exact UI text: `"Weryfikacja zakończona pomyślnie."`
- Multilingual strings go inside quotes exactly as they appear in the UI

**Reuse:**
- Before writing any step, scan existing `.feature` files for identical/near-identical steps
- Reuse step text **exactly** — one word difference = new step definition required
- `Background:` for Given steps shared across 2+ scenarios in the same file

---

## Step 3 — Generate Step Definitions

### File convention
```
test/step-definations/<Module>/<feature>.steps.cjs
```

### Format

```javascript
const { Given, When, Then, Before, After, BeforeAll, AfterAll } = require('@cucumber/cucumber');
const { faker } = require('@faker-js/faker');
const LoginPage = require('../../Pages/Auth/admin-login.cjs');

// API imports — only import what this feature needs
const { createUserViaApi }   = require('../../BDDUtilies/bdd_api/addUserApi.cjs');
const { authHeaders }        = require('../../BDDUtilies/bdd_api/authHeaders.cjs');

let loginPage;

// ── Unconditional Before — restore globals into this ─────────────────────────
Before(async function () {
  if (global.lastCreatedUserName) {
    this.lastCreatedUserName = global.lastCreatedUserName;
  }
});

// ── Tagged Before hooks (API seeding) ────────────────────────────────────────
// Only add these if the user says to use API calls in automation.
// Check existing tags in Driver.cjs first — do not duplicate.

Before({ tags: '@add_user' }, async function () {
  await waitForToken();
  const result = await createUserViaApi();
  this.createdUser      = result.data.user;
  this.createdUserEmail = result.payload.email;
  this.username         = result.payload.email;
  this.createdUserData  = result.createdUserData;
  this.viewAdminData    = result.viewAdminData;
  this.lastCreatedUserName       = result.payload.name;
  global.lastCreatedUserName     = result.payload.name;
});

// ── Steps ────────────────────────────────────────────────────────────────────

Given('{word} is on the login page', async function (persona) {
  loginPage = new LoginPage(this.page);
  await loginPage.navigate();
});

When('{word} enters valid login credentials {string} and {string}', async function (persona, email, password) {
  await loginPage.enterCredentials(email, password);
});

When('{word} uploads the profile document', async function (persona) {
  const path = require('path');
  // Use support/ fixture only when user explicitly says to use file from support/
  const filePath = path.resolve(__dirname, '../../support/profile-image-technician.jpeg');
  await loginPage.uploadDocument(filePath);
});

Then('{word} should see the message {string}', async function (persona, expectedText) {
  await loginPage.verifyMessage(expectedText);
});

Then('{word} should be able to view the details of the added user', async function (persona) {
  if (!this.viewAdminData) {
    throw new Error('viewAdminData not found. Make sure @add_user hook runs before this step.');
  }
  await loginPage.verifyAllAdminData(this.viewAdminData);
});
```

### Step definition rules

- **CommonJS only** — `require()` / `module.exports`, never `import`/`export`
- Use `{word}` for persona capture (John, Maria etc.) when persona varies
- Use `{string}` for quoted data values from Gherkin
- No business logic in step files — all logic lives in the POM
- No direct `this.page.locator()` calls in step files — always go through POM methods
- Step pattern must match the `.feature` file **exactly**, character for character
- Browser/page context comes from `this.page` via `Driver.cjs`
- Always guard `this.viewXxxData` / `this.createdXxxData` with a null check + descriptive error

---

## Step 4 — Generate Page Object Model (POM)

### File convention
```
test/Pages/<Module>/<page-name>.cjs
```

### POM class format — strict

```javascript
const { expect } = require('@playwright/test');
const { faker }  = require('@faker-js/faker');

class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // ── Locators (constructor ONLY — never inside methods) ───────────────
    // Priority: data-testid → getByRole → getByLabel/getByText → id → CSS → XPath
    this.emailInput          = page.getByTestId('login-email');
    this.passwordInput       = page.getByTestId('login-password');
    this.submitButton        = page.getByTestId('login-submit');
    this.otpInput            = page.getByTestId('login-otp');
    this.successMessage      = page.getByTestId('login-success-message');
    this.errorMessage        = page.getByTestId('login-error-message');

    // File upload locators (only when feature has upload)
    this.documentUploadInput = page.getByTestId('upload-document-input');
    this.profileImageInput   = page.getByTestId('upload-profile-input');
    this.dropZone            = page.getByTestId('upload-dropzone');
    this.uploadSuccessLabel  = page.getByTestId('upload-success-label');
  }

  // ── Navigation ───────────────────────────────────────────────────────

  async navigate() {
    await this.page.goto('/login');
  }

  // ── Actions ──────────────────────────────────────────────────────────

  async enterCredentials(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submitLogin() {
    await this.submitButton.click();
  }

  async enterOtp(otp) {
    await this.otpInput.fill(otp);
  }

  // ── Faker usage inside POM ────────────────────────────────────────────
  // Use faker to generate test data for form fills, not for locators.
  // Always generate inside the method, not in constructor.

  async fillRegistrationForm() {
    await this.page.getByTestId('reg-name').fill(faker.string.alphanumeric(15));
    await this.page.getByTestId('reg-email').fill(
      `test+${faker.string.alphanumeric(8)}@yourdomain.com`
    );
    await this.page.getByTestId('reg-phone').fill('999999999');
    await this.page.getByTestId('reg-address').fill(faker.location.streetAddress());
    await this.page.getByTestId('reg-city').fill(faker.location.city());
    await this.page.getByTestId('reg-zip').fill(faker.location.zipCode('##-###'));
  }

  // ── File upload methods ───────────────────────────────────────────────

  /**
   * Upload via hidden or visible <input type="file">.
   * Playwright's setInputFiles bypasses CSS visibility — always works.
   * Use when user explicitly says to use file from test/support/.
   */
  async uploadDocument(filePath) {
    await this.documentUploadInput.setInputFiles(filePath);
  }

  /**
   * Upload via styled button that opens OS file chooser.
   * Use when a custom button (not a raw <input>) triggers the file picker.
   */
  async uploadViaButton(triggerLocator, filePath) {
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent('filechooser'),
      triggerLocator.click(),
    ]);
    await fileChooser.setFiles(filePath);
  }

  /**
   * Drag-and-drop file upload — Playwright tiny buffer trick.
   * Default method for drag-and-drop unless user explicitly says to use support/ file.
   * Reads file into a Node buffer → injects as real DataTransfer in browser →
   * dispatches dragenter → dragover → drop on the drop zone element.
   *
   * @param {string} filePath  - absolute path to file
   * @param {string} fileName  - filename shown in DataTransfer
   * @param {string} mimeType  - MIME type (default: 'application/octet-stream')
   */
  async dragAndDropFile(filePath, fileName, mimeType = 'application/octet-stream') {
    const fs     = require('fs');
    const buffer = fs.readFileSync(filePath);

    await this.dropZone.dispatchEvent('dragenter');

    await this.page.evaluate(
      ({ fileBuffer, name, type }) => {
        const dt   = new DataTransfer();
        const file = new File([new Uint8Array(fileBuffer)], name, { type });
        dt.items.add(file);
        window.__dragTransfer = dt;
      },
      { fileBuffer: Array.from(buffer), name: fileName, type: mimeType }
    );

    await this.dropZone.dispatchEvent('dragover', {
      dataTransfer: await this.page.evaluateHandle(() => window.__dragTransfer),
    });

    await this.dropZone.dispatchEvent('drop', {
      dataTransfer: await this.page.evaluateHandle(() => window.__dragTransfer),
    });
  }

  // ── Assertions ───────────────────────────────────────────────────────

  async verifyMessage(expectedText) {
    await expect(this.successMessage).toContainText(expectedText);
  }

  async verifyErrorMessage(expectedText) {
    await this.page.getByText(expectedText, { exact: false })
      .waitFor({ state: 'visible', timeout: 60000 });
  }

  async verifyAllAdminData(apiData) {
    expect(
      await this.page.getByTestId('Adres e-mail').textContent()
    ).toBe(apiData.email);
    // repeat for each field using getByTestId
  }

  async verifyFileUploadSuccess(expectedFileName) {
    await expect(this.uploadSuccessLabel).toContainText(expectedFileName);
  }
}

module.exports = LoginPage;
```

### POM rules

**No BasePage inheritance right now** — plain class, no `extend`, no `super()`.

**Locators — constructor ONLY:**
- All locators defined in `constructor`, never inside methods
- One property per UI element, named semantically (`submitButton` not `btn1`)
- Changing a locator = change once in constructor → reflects everywhere

**Locator priority (strictly enforced):**

| Priority | Method | Use when |
|----------|--------|----------|
| 1 ✅ | `page.getByTestId('...')` | Always prefer — add to DOM if missing |
| 2 ✅ | `page.getByRole('button', { name: '...' })` | When testid not feasible |
| 3 ⚠️ | `page.getByLabel('...')` / `page.getByText('...')` | Form labels, readable text |
| 4 ⚠️ | `page.locator('#id')` | Only if testid/role unavailable |
| 5 ❌ | `page.locator('.class')` | Avoid — breaks on UI refactor |
| 6 ❌ | `page.locator('//xpath')` | Last resort only — comment why |

**If `data-testid` is missing from the DOM:**
1. Use Playwright MCP to inspect the live element
2. Identify the correct element (button, input, div)
3. Write the `data-testid` attribute into the source codebase
4. Confirm it appears in DOM before writing the locator
5. Never write a fallback locator and move on — fix the source first

**Methods:**
- All actions are `async`
- Methods are single-purpose (one action per method)
- Assertions are separate methods prefixed `verify`
- No hardcoded `waitForTimeout` — use `expect(...).toBeVisible()` / `toBeEnabled()`
- For toast/snackbar messages: use `getByText(msg).waitFor({ state: 'visible', timeout: 60000 })`
- Never duplicate action logic across POM classes

**Assertion types to use:**

| Assertion | Use for |
|-----------|---------|
| `expect(actual).toBe(expected)` | Exact match — IDs, emails, formatted dates, role labels |
| `expect(actual).toContain(expected)` | Partial match — names, phone (country code varies) |
| `expect(locator).toBeVisible()` | Element exists — success toasts, buttons, sections |
| `expect(locator).toBeEnabled()` | Button is clickable |
| `getByText(msg).waitFor({ state: 'visible' })` | Toast / snackbar success messages |

---

## Faker.js — usage reference

Always use `faker.js` for generated test data. Import at top of file:
```javascript
const { faker } = require('@faker-js/faker');
```

**Common patterns used in this project:**

```javascript
// Names / strings
faker.string.alphanumeric(15)          // random name, 15 chars
faker.string.alphanumeric(50)          // longer field like planName
faker.string.alphanumeric(100)         // description fields

// Emails — use project-specific prefix pattern (adapt to your project)
`test+${faker.string.alphanumeric(8)}@yourdomain.com`

// Phone
'999999999'                            // fixed test phone (project convention)
'+48999999998'                         // with country code

// Address
faker.location.streetAddress()
faker.location.city()
faker.location.state()
faker.location.zipCode('##-###')       // Polish zip format
faker.location.country()

// Numbers
faker.number.int({ min: 1, max: 100 })
faker.number.float({ min: 1, max: 100, fractionDigits: 2 })

// Dates (as strings for API payloads)
faker.date.future().toISOString().split('T')[0]   // 'YYYY-MM-DD'
```

**Full faker.js API reference:** https://fakerjs.dev/api/

Generate inside the method or payload builder — never in the constructor or at module scope (would be static across runs).

---

## File upload — decision guide

| Situation | Method |
|-----------|--------|
| Visible or hidden `<input type="file">` | `setInputFiles()` directly on locator |
| Styled button that opens OS file picker | `uploadViaButton()` — `waitForEvent('filechooser')` |
| Drag-and-drop zone, no visible input | `dragAndDropFile()` — tiny buffer trick (default) |

**When to use `test/support/` files:**
- Only when the user **explicitly says** to use the file from `support/`
- Otherwise, generate a temp file in-memory or use the tiny buffer directly

**Available support fixtures:**
```javascript
const path = require('path');
// Use ONLY when explicitly told to use support/ file
const docFile     = path.resolve(__dirname, '../../support/document-image.jpeg');
const profileFile = path.resolve(__dirname, '../../support/profile-image-technician.jpeg');
```

---

## BDD API Hooks — full reference

Use this when the user says "use API call in automation" or a Before/After hook is needed.

### Auth — how token is read

```javascript
// authHeaders.cjs reads Cognito idToken from browser localStorage
async function authHeaders() {
  const token = await global.page.evaluate(() => {
    const key = Object.keys(window.localStorage).find(k => k.includes('idToken'));
    return key ? window.localStorage.getItem(key) : null;
  });
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}
```
Always call `waitForToken()` before any API helper. Every hook does this internally.

### Driver.cjs hooks — already in place, do not duplicate

| Hook | When | What it does |
|------|------|--------------|
| `BeforeAll` | Once | Launches Chromium, creates context/page, navigates to BASE_URL, starts tracing |
| `Before` | Every scenario | Sets viewport (1920×1080 default, 744×1133 for E2E2/TechnicianManagement) |
| `Before { tags: '@Logout' }` | Tagged scenario | Clears cookies + localStorage + sessionStorage |
| `After { tags: '@Logout1' }` | Tagged scenario | Clears localStorage, sessionStorage, cookies |
| `AfterAll` | Once | Saves coverage, prints healing summary, stops tracing, closes browser |

### All existing Before/After tags — check these before creating new hooks

| Tag | Type | API | Requires |
|-----|------|-----|---------|
| `@Logout` | Before | — clears storage | — |
| `@Logout1` | After | — clears storage | — |
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

### Data stored by each hook (use in step definitions via `this.*`)

**`@add_subscription`**
```
this.createdSubscription, this.createdSubscriptionPlanName,
this.subscriptionId, this.createdSubscriptionData,
this.lastCreatedSubscriptionName, global.lastCreatedSubscriptionName
```

**`@add_subscription_offer`** (requires `@add_subscription` above it)
```
this.createdOffer, this.createdOfferId, this.createdOfferPayload,
this.createdOfferData, this.lastCreatedOfferName, global.lastCreatedOfferName
```

**`@add_client_paid`**
```
this.createdClient, this.clientId, this.createdClientName,
this.createdClientEmail, this.username, this.createdClientPayload,
this.createdFacilityPayload
```

**`@add_user`**
```
this.createdUser, this.createdUserEmail, this.username,
this.createdUserData, this.viewAdminData,
this.lastCreatedUserName, global.lastCreatedUserName
```

**`@add_technician`**
```
this.createdTechnician, this.technicianId, this.createdTechnicianPayload,
this.createdTechnicianData, global.lastCreatedTechnicianData,
global.lastCreatedTechnicianName
```

### Global state persistence (cross-scenario)

Some globals are restored into `this` in an unconditional `Before` so the next scenario (without a hook tag) can still access the created entity:

```javascript
Before(async function () {
  if (global.lastCreatedUserName)         this.lastCreatedUserName = global.lastCreatedUserName;
  if (global.lastCreatedSubscriptionName) this.lastCreatedSubscriptionName = global.lastCreatedSubscriptionName;
  if (global.lastCreatedOfferName)        this.lastCreatedOfferName = global.lastCreatedOfferName;
  if (global.lastCreatedTechnicianName)   this.lastCreatedTechnicianName = global.lastCreatedTechnicianName;
});
```

### Stacking tags — order matters

```gherkin
@add_subscription
@add_subscription_offer
Example: John views the recently added offer
```
Hooks run top to bottom. `@add_subscription` must always be above `@add_subscription_offer` because the offer hook needs `this.subscriptionId` set by the subscription hook.

### Assertion pattern — how API data flows to UI assertions

```
Before hook → this.createdXxxData → step definition → POM method → expect(UI text).toBe(expected)
```

```javascript
// Step definition
Then('{word} should be able to view the details of the added user', async function (persona) {
  if (!this.viewAdminData) throw new Error('viewAdminData not found. Add @add_user tag.');
  await userViewPage.verifyAllAdminData(this.viewAdminData);
});

// POM method
async verifyAllAdminData(apiData) {
  expect(await this.page.getByTestId('Adres e-mail').textContent()).toBe(apiData.email);
  expect(await this.page.getByTestId('Numer telefonu').textContent()).toBe(apiData.phoneNumber);
  expect(await this.page.getByTestId('Rola').textContent()).toBe(apiData.role);
  expect(await this.page.getByTestId('Data utworzenia').textContent()).toBe(apiData.createdAt);
}
```

### Special formatting rules for assertions

**Phone number — UI renders with country code:**
```javascript
const formatPhone = (code, number) => [code, number].filter(Boolean).join(' ').trim() || '—';
// payload: { countryCode: '+48', phoneNumber: '999999999' }
// expected: '+48 999999999'
```

**NIP — formatted as ###-###-##-##:**
```javascript
const formatNip = (nip) => {
  const d = (nip || '').replace(/\D/g, '');
  return d.length === 10
    ? `${d.slice(0,3)}-${d.slice(3,6)}-${d.slice(6,8)}-${d.slice(8,10)}`
    : nip;
};
```

**Currency — Polish format:**
```javascript
// API: 1000 → UI: '1 000,00 zł'
// Use toContain() for price assertions to avoid locale edge cases
```

---

## Step 5 — Dry Run Validation

```bash
npx cucumber-js --dry-run
```

- ✅ All steps defined → proceed
- ❌ `Undefined` → fix step pattern to match Gherkin exactly, re-run
- ❌ `Ambiguous` → rename conflicting step, re-run
- ❌ `require` errors → fix paths, re-run

Fix and re-run automatically. Do not hand off until clean.

---

## Step 6 — Hand-off Summary

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
Dry-run: PASSED

Ready for: Rupesh (manual agent) · Suhas (bug reporter)
```

---

## Quick reference

| Content | Location |
|---------|----------|
| Business rule | `Rule:` in `.feature` |
| Persona/role variation | `Example:` block |
| Same flow, different data | `Scenario Outline` + `Examples:` |
| Multiple variations of same rule | Multiple `Example:` under one `Rule:` |
| API seeding tag | Above `Example:` / `Scenario Outline:` line |
| Tag order (dependent hooks) | `@add_subscription` above `@add_subscription_offer` |
| Locators | POM constructor only |
| Actions | POM async methods |
| Assertions | POM `verify*` methods |
| Generated test data | `faker.js` — inside methods, not constructor |
| File upload (input) | `setInputFiles()` |
| File upload (styled button) | `uploadViaButton()` |
| Drag-and-drop upload | `dragAndDropFile()` — default choice |
| support/ files | Only when user explicitly says so |
| Cross-scenario data | `global.*` restored in unconditional `Before` |
| `page.locator()` in step files | ❌ Never |
| Hardcoded waits | ❌ Never |
| XPath | ❌ Last resort only |
| `import`/`export` | ❌ Use `require`/`module.exports` |
| BasePage / healer | ❌ Not used right now |