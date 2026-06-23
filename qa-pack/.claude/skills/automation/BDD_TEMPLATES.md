# BDD Templates & Reference

> Load this file at the start of Phase 1 (Gherkin generation) and Phase 3 (POM).
> Contains Gherkin format examples, step definition templates, POM class template,
> Faker.js patterns, file upload guide, and BDD API hook reference.

---

## Gherkin Format Example

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

---

## Step Definition Template

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

---

## POM Class Template

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

---

## Faker.js Patterns

```javascript
const { faker } = require('@faker-js/faker');

faker.string.alphanumeric(15)                             // random name
`test+${faker.string.alphanumeric(8)}@yourdomain.com`     // email
'999999999'                                               // fixed test phone
faker.location.streetAddress()
faker.location.city()
faker.location.zipCode('##-###')
faker.number.int({ min: 1, max: 100 })
faker.date.future().toISOString().split('T')[0]           // 'YYYY-MM-DD'
```

Generate inside the method — never in the constructor or at module scope.

---

## File Upload — Decision Guide

| Situation | Method |
|-----------|--------|
| Visible or hidden `<input type="file">` | `setInputFiles()` directly on locator |
| Styled button that opens OS file picker | `uploadViaButton()` — `waitForEvent('filechooser')` |
| Drag-and-drop zone, no visible input | `dragAndDropFile()` — tiny buffer trick (default) |

Use `test/support/` fixture files only when the user explicitly says so.

---

## BDD API Hooks — Existing Tags

Check Driver.cjs before creating new hooks — do not duplicate.

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

**Stacking order matters** — `@add_subscription` must always be above `@add_subscription_offer`.

---

## Quick Reference

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
