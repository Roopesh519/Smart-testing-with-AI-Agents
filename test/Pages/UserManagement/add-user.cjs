const { expect } = require('@playwright/test');
const { faker } = require('@faker-js/faker');

class AddUserPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // ── Locators — constructor ONLY ──────────────────────────────────────
    this.nameInput          = page.getByTestId('add-user-name');
    this.emailInput         = page.getByTestId('add-user-email');
    this.roleSelect         = page.getByTestId('add-user-role');
    this.countryCodeSelect  = page.getByTestId('add-user-country-code');
    this.phoneInput         = page.getByTestId('add-user-phone');
    this.submitButton       = page.getByTestId('add-user-submit');
    this.successMessage     = page.getByTestId('add-user-success-message');
    this.errorMessage       = page.getByTestId('add-user-error-message');

    // User listing locators
    this.searchInput        = page.getByTestId('user-list-search');
    this.userEmailCell      = page.getByTestId('user-email-cell');
    this.userNameCell       = page.getByTestId('user-name-cell');
    this.userRoleCell       = page.getByTestId('user-role-cell');
    this.userPhoneCell      = page.getByTestId('user-phone-cell');
  }

  // ── Navigation ───────────────────────────────────────────────────────

  async navigateToAddUser() {
    await this.page.goto('/users/add');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async navigateToUserListing() {
    await this.page.goto('/users');
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ── Actions ──────────────────────────────────────────────────────────

  async fillUserForm(userData) {
    await this.nameInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.nameInput.fill(userData.name);
    await this.emailInput.fill(userData.email);
    await this.roleSelect.selectOption(userData.role);
    await this.phoneInput.fill(userData.phoneNumber);
  }

  async fillFormWithEmail(email) {
    await this.nameInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.nameInput.fill(faker.string.alphanumeric(15));
    await this.emailInput.fill(email);
    await this.roleSelect.selectOption('ADMIN');
    await this.phoneInput.fill('999999999');
  }

  async submitForm() {
    await this.submitButton.waitFor({ state: 'visible', timeout: 30000 });
    await this.submitButton.click();
  }

  async searchUser(name) {
    await this.searchInput.waitFor({ state: 'visible', timeout: 30000 });
    await this.searchInput.clear();
    await this.searchInput.fill(name);
    await this.page.waitForTimeout(500);
    await this.page.waitForLoadState('domcontentloaded');
  }

  // ── Assertions ───────────────────────────────────────────────────────

  async verifyMessage(expectedText) {
    await this.page.getByText(expectedText, { exact: false })
      .waitFor({ state: 'visible', timeout: 60000 });
  }

  async verifyAllAdminData(apiData) {
    expect(await this.userEmailCell.textContent()).toBe(apiData.email);
    expect(await this.userNameCell.textContent()).toContain(apiData.name);
    expect(await this.userRoleCell.textContent()).toBe(apiData.role);
    expect(await this.userPhoneCell.textContent()).toContain(apiData.phoneNumber);
  }
}

module.exports = AddUserPage;
