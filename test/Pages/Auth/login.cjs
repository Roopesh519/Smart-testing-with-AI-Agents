const { expect } = require('@playwright/test');

class LoginPage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // ── Locators — confirmed via Playwright MCP on https://qa.loopay.com.pl/login ──
    //
    // Login form
    // Floating-label inputs expose data-testid matching the Polish label text
    this.emailInput    = page.getByTestId('Adres e-mail');
    this.passwordInput = page.getByTestId('Hasło');
    // Submit button data-testid has a leading space — use getByRole instead
    this.submitButton  = page.getByRole('button', { name: 'Zaloguj się' });

    // OTP screen — 6-box PIN component; data-testid="otp-input-1" through "otp-input-6"
    // Click first box to focus, then page.keyboard.type() auto-advances digit by digit
    this.otpInput  = page.getByTestId('otp-input-1');
    this.otpSubmit = page.getByTestId('Zweryfikuj');

    // Resend OTP — immediately enabled in QA env (no countdown)
    this.resendOtpButton = page.getByRole('button', { name: 'Wyślij kod ponownie' });

    // Error messages — inline paragraphs (confirmed from live DOM)
    // Invalid credentials: "Błędny e-mail lub hasło."
    this.credentialsErrorText = page.getByText(/błędny e-mail lub hasło/i);
    // Invalid / expired OTP: "Kod wygasł"
    this.otpErrorText         = page.getByText('Kod wygasł');
    // Mandatory field validation: "To pole jest wymagane" (appears under each empty field)
    this.mandatoryError       = page.getByText('To pole jest wymagane');
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
    // Wait for OTP screen, click first box, then type digit-by-digit.
    // The 6-box PIN component auto-advances focus on each keystroke.
    await this.otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.otpInput.click();
    await this.page.keyboard.type(otp);
  }

  async submitOtp() {
    await this.otpSubmit.click();
  }

  async clickResendOtp() {
    await this.resendOtpButton.waitFor({ state: 'visible', timeout: 10000 });
    await this.resendOtpButton.click();
  }

  // ── Assertions ────────────────────────────────────────────────────────────

  async verifyDashboardPage() {
    // After successful login the app redirects to /Panel-główny
    await this.page.waitForFunction(
      () => !window.location.href.includes('/login'),
      { timeout: 30000 }
    );
  }

  async verifyInvalidCredentialsError() {
    // Inline paragraph "Błędny e-mail lub hasło." — not a role="alert"
    await this.credentialsErrorText.waitFor({ state: 'visible', timeout: 10000 });
  }

  async verifyInvalidOtpError() {
    // Inline paragraph "Kod wygasł" shown below OTP boxes after wrong submission
    await this.otpErrorText.waitFor({ state: 'visible', timeout: 10000 });
  }

  async verifyMandatoryFieldErrors() {
    // "To pole jest wymagane" appears below both empty fields
    await expect(this.mandatoryError.first()).toBeVisible({ timeout: 10000 });
  }
}

module.exports = LoginPage;
