const { Given, When, Then } = require('@cucumber/cucumber');
const LoginPage = require('../../Pages/Auth/login.cjs');

// QA-env bypass OTP — always accepted by the test backend
const BYPASS_OTP = '999999';

let loginPage;

// ── Steps ─────────────────────────────────────────────────────────────────────

Given('{word} is on the login page', async function (persona) {
  loginPage = new LoginPage(this.page);
  await loginPage.navigate();
});

When('{word} enters email {string} and password {string}', async function (persona, email, password) {
  await loginPage.enterCredentials(email, password);
});

When('{word} submits the login form', async function (persona) {
  await loginPage.submitLogin();
});

When('{word} submits the login form without entering any credentials', async function (persona) {
  await loginPage.submitLogin();
});

When('{word} enters the valid OTP', async function (persona) {
  await loginPage.enterOtp(BYPASS_OTP);
});

When('{word} enters OTP {string}', async function (persona, otp) {
  await loginPage.enterOtp(otp);
});

When('{word} submits the OTP', async function (persona) {
  await loginPage.submitOtp();
});

When('{word} clicks the Resend OTP link', async function (persona) {
  await loginPage.clickResendOtp();
});

Then('{word} should be redirected to the dashboard page', async function (persona) {
  await loginPage.verifyDashboardPage();
});

Then('{word} should see the invalid credentials error message', async function (persona) {
  await loginPage.verifyInvalidCredentialsError();
});

Then('{word} should see the mandatory field validation errors', async function (persona) {
  await loginPage.verifyMandatoryFieldErrors();
});

Then('{word} should see the invalid OTP error message', async function (persona) {
  await loginPage.verifyInvalidOtpError();
});
