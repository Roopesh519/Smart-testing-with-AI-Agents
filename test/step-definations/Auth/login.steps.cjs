const { Given, When, Then } = require('@cucumber/cucumber');
const LoginPage = require('../../Pages/Auth/login.cjs');

let loginPage;

// ── Steps ────────────────────────────────────────────────────────────────────

Given('the login page is open', async function () {
  loginPage = new LoginPage(this.page);
  await loginPage.navigate();
});

// ── Assertions — login form elements ─────────────────────────────────────────

Then('Alex should see the email input field', async function () {
  await loginPage.verifyEmailFieldVisible();
});

Then('Alex should see the password input field', async function () {
  await loginPage.verifyPasswordFieldVisible();
});

Then('Alex should see the login submit button', async function () {
  await loginPage.verifySubmitButtonVisible();
});

Then('Alex should see the forgot password link', async function () {
  await loginPage.verifyForgotPasswordLinkVisible();
});

// ── Actions — login form ──────────────────────────────────────────────────────

When('Alex enters valid email and password', async function () {
  await loginPage.fillValidCredentials();
});

When('{word} enters email {string} and password {string}', async function (persona, email, password) {
  await loginPage.fillCredentials(email, password);
});

When('{word} clicks the login button', async function (persona) {
  await loginPage.clickLoginButton();
});

// ── Assertions — OTP screen ───────────────────────────────────────────────────

Then('Alex should see the OTP verification screen', async function () {
  await loginPage.verifyOtpScreenVisible();
});

Then('Alex should see the masked email address on the OTP screen', async function () {
  await loginPage.verifyMaskedEmailVisible();
});

Then('Alex should see 6 individual OTP input boxes', async function () {
  await loginPage.verifySixOtpBoxes();
});

// ── Actions — OTP ─────────────────────────────────────────────────────────────

When('Alex enters a valid OTP', async function () {
  await loginPage.enterOtp('999999');
});

When('Alex enters an invalid OTP {string}', async function (otp) {
  await loginPage.enterOtp(otp);
});

When('{word} clicks the verify button', async function (persona) {
  await loginPage.clickVerifyButton();
});

// ── Assertions — post-login ───────────────────────────────────────────────────

Then('Alex should be redirected to the dashboard', async function () {
  await loginPage.verifyRedirectedToDashboard();
});

Then('Alex should see the dashboard panel', async function () {
  await loginPage.verifyDashboardVisible();
});

// ── Assertions — error states ─────────────────────────────────────────────────

Then('{word} should see the invalid credentials error message', async function (persona) {
  await loginPage.verifyInvalidCredentialsError();
});

Then('Alex should see the required field error for the email field', async function () {
  await loginPage.verifyRequiredEmailError();
});

Then('Alex should see the required field error for the password field', async function () {
  await loginPage.verifyRequiredPasswordError();
});

Then('Alex should see the invalid email format error message', async function () {
  await loginPage.verifyInvalidEmailFormatError();
});

Then('Alex should see the invalid OTP error message', async function () {
  await loginPage.verifyInvalidOtpError();
});

// ── Actions — forgot password ─────────────────────────────────────────────────

When('Alex clicks the forgot password link', async function () {
  await loginPage.clickForgotPasswordLink();
});

// ── Assertions — forgot password page ────────────────────────────────────────

Then('Alex should be on the forgot password page', async function () {
  await loginPage.verifyOnForgotPasswordPage();
});

Then('Alex should see the password reset form', async function () {
  await loginPage.verifyPasswordResetFormVisible();
});

// ── Assertions — resend OTP ───────────────────────────────────────────────────

Then('Alex should see the resend OTP option on the OTP screen', async function () {
  await loginPage.verifyResendOtpVisible();
});
