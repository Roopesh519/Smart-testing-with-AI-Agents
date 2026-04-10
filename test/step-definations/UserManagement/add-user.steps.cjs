const { Given, When, Then, Before } = require('@cucumber/cucumber');
const AddUserPage = require('../../Pages/UserManagement/add-user.cjs');
const { createUserViaApi, waitForToken } = require('../../BDDUtilies/bdd_api/addUserApi.cjs');

let addUserPage;

// ── Restore globals into this (cross-scenario data sharing) ──────────────────
Before(async function () {
  if (global.lastCreatedUserName) {
    this.lastCreatedUserName = global.lastCreatedUserName;
  }
  if (global.lastCreatedUserEmail) {
    this.lastCreatedUserEmail = global.lastCreatedUserEmail;
  }
});

// ── @add_user: seed a user via API before the scenario ───────────────────────
Before({ tags: '@add_user' }, async function () {
  await waitForToken();
  const result = await createUserViaApi();
  this.createdUser      = result.data.user;
  this.createdUserEmail = result.payload.email;
  this.username         = result.payload.email;
  this.createdUserData  = result.createdUserData;
  this.viewAdminData    = result.viewAdminData;
  this.lastCreatedUserName        = result.payload.name;
  this.lastCreatedUserEmail       = result.payload.email;
  global.lastCreatedUserName      = result.payload.name;
  global.lastCreatedUserEmail     = result.payload.email;
});

// ── Steps ─────────────────────────────────────────────────────────────────────

Given('{word} is on the add user page', async function (persona) {
  addUserPage = new AddUserPage(this.page);
  await addUserPage.navigateToAddUser();
});

Given('{word} is on the user listing page', async function (persona) {
  addUserPage = new AddUserPage(this.page);
  await addUserPage.navigateToUserListing();
});

When('{word} fills in all required user details', async function (persona) {
  if (!this.createdUserData) {
    throw new Error('createdUserData not found. Make sure @add_user tag is present.');
  }
  await addUserPage.fillUserForm({
    name: this.lastCreatedUserName,
    email: this.createdUserEmail,
    role: 'ADMIN',
    phoneNumber: '999999999',
  });
});

When('{word} fills in the form with an already registered email', async function (persona) {
  const existingEmail = this.lastCreatedUserEmail || 'existing@yourdomain.com';
  await addUserPage.fillFormWithEmail(existingEmail);
});

When('{word} submits the user form', async function (persona) {
  await addUserPage.submitForm();
});

When('{word} searches for the recently added user', async function (persona) {
  if (!this.lastCreatedUserName) {
    throw new Error('lastCreatedUserName not found. Make sure @add_user ran in a previous scenario.');
  }
  await addUserPage.searchUser(this.lastCreatedUserName);
});

Then('{word} should see the message {string}', async function (persona, expectedText) {
  await addUserPage.verifyMessage(expectedText);
});

Then('{word} should be able to view the details of the added user', async function (persona) {
  if (!this.viewAdminData) {
    throw new Error('viewAdminData not found. Make sure @add_user tag is present.');
  }
  await addUserPage.verifyAllAdminData(this.viewAdminData);
});
