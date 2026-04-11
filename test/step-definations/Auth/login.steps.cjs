const { Given, When, Then } = require('@cucumber/cucumber');
const LoginPage = require('../../Pages/Auth/login.cjs');

let loginPage;

// ── Steps ─────────────────────────────────────────────────────────────────────

Given('{word} is on the login page', async function (persona) {
  loginPage = new LoginPage(this.page);
  await loginPage.navigate();
});

// Happy path + OTP scenarios — step has "valid" in it
When('{word} enters valid login credentials {string} and {string}', async function (persona, email, password) {
  await loginPage.enterCredentials(email, password);
});

// Invalid credentials Scenario Outline — step does NOT have "valid"
When('{word} enters login credentials {string} and {string}', async function (persona, email, password) {
  await loginPage.enterCredentials(email, password);
});

When('{word} submits the login form', async function (persona) {
  await loginPage.submitLogin();
});

// Empty form — no fill, just click submit
When('{word} submits the login form without filling in any fields', async function (persona) {
  await loginPage.submitLogin();
});

When('{word} enters the OTP {string}', async function (persona, otp) {
  await loginPage.enterOtp(otp);
});

When('{word} submits the OTP', async function (persona) {
  await loginPage.submitOtp();
});

Then('{word} should be redirected to the dashboard page', async function (persona) {
  await loginPage.verifyDashboardPage();
});

Then('{word} should see the invalid credentials error message', async function (persona) {
  await loginPage.verifyInvalidCredentialsError();
});

Then('{word} should see mandatory field validation messages', async function (persona) {
  await loginPage.verifyMandatoryFieldErrors();
});

Then('{word} should see the OTP entry screen', async function (persona) {
  await loginPage.verifyOtpScreen();
});

Then('{word} should see the invalid OTP error message', async function (persona) {
  await loginPage.verifyInvalidOtpError();
});

Then('{word} should see the Resend OTP button is disabled', async function (persona) {
  await loginPage.verifyResendOtpDisabled();
});
