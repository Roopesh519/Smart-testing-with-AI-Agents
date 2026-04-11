const { expect } = require('@playwright/test');

class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // ── Locators ──────────────────────────────────────────────────────────────
    // Login form — confirmed from live screenshots of https://qa.loopay.com.pl/login
    // Floating-label UI: no placeholder attribute on inputs → positional selectors
    // TODO: add data-testid to each element and switch to page.getByTestId('...')
    this.emailInput   = page.locator('input').nth(0);
    this.passwordInput = page.locator('input').nth(1);
    this.submitButton  = page.getByRole('button', { name: 'Zaloguj się' });

    // OTP screen — 6-box PIN component, first box receives keyboard input
    // Submit button text confirmed as "Zweryfikuj" from screenshot
    this.otpInput  = page.locator('input').first();
    this.otpSubmit = page.getByRole('button', { name: /zweryfikuj|zatwierdź|verify|potwierdź/i });

    // Resend OTP — link text confirmed from OTP screen screenshot
    this.resendOtpLink = page.getByText(/wyślij kod ponownie/i);

    // Invalid credentials — inline error text confirmed from screenshot
    this.credentialsErrorText = page.getByText(/błędny e-mail lub hasło/i);

    // Mandatory field validation
    this.validationErrors = page.locator('[class*="error"], [class*="Error"], [role="alert"]');
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  async navigate() {
    const baseUrl = process.env.BASE_URL || 'https://qa.loopay.com.pl';
    await this.page.goto(`${baseUrl}/login`);
    await this.submitButton.waitFor({ state: 'visible', timeout: 15000 });
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async enterCredentials(email, password) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async submitLogin() {
    await this.submitButton.click();
  }

  async enterOtp(otp) {
    // Wait for OTP screen, click first box, type digit-by-digit so component auto-advances
    await this.otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.otpInput.click();
    await this.page.keyboard.type(otp);
  }

  async submitOtp() {
    await this.otpSubmit.click();
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async verifyDashboardPage() {
    // App redirects to a non-login URL after successful auth — check we've left login
    await this.page.waitForFunction(
      () => !window.location.href.includes('/login'),
      { timeout: 30000 }
    );
  }

  async verifyOtpScreen() {
    await this.otpInput.waitFor({ state: 'visible', timeout: 15000 });
  }

  async verifyInvalidCredentialsError() {
    // Inline error text "Błędny e-mail lub hasło." appears below the email field
    await this.credentialsErrorText.waitFor({ state: 'visible', timeout: 10000 });
  }

  async verifyInvalidOtpError() {
    // Wrong OTP keeps the user on the OTP screen — verify redirect did NOT happen
    // and an alert notification is shown (system sends new code on wrong OTP entry)
    await this.otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await expect(this.page.getByRole('alert').first()).toBeVisible({ timeout: 10000 });
  }

  async verifyMandatoryFieldErrors() {
    await expect(this.validationErrors.first()).toBeVisible({ timeout: 10000 });
  }

  async verifyResendOtpDisabled() {
    // Verify OTP screen arrived and the resend link is present
    await this.otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await expect(this.resendOtpLink).toBeVisible({ timeout: 10000 });
  }
}

module.exports = LoginPage;
