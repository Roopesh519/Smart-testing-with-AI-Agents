'use strict';

const { Given, When, Then } = require('@cucumber/cucumber');
const ChatInterfacePage = require('../../Pages/ChatInterface/ChatInterfacePage.cjs');

let chatPage;

// ── Setup ─────────────────────────────────────────────────────────────────────

Given('{word} is logged into the Pherix workspace', async function (persona) {
  chatPage = new ChatInterfacePage(this.page);
  await chatPage.navigateToCore();
  await chatPage.verifyLoggedIn();
});

Given('{word} is on the Core chat page', async function (persona) {
  if (!chatPage) {
    chatPage = new ChatInterfacePage(this.page);
    await chatPage.navigateToCore();
  }
  await chatPage.verifyOnChatPage();
});

// ── Query Submission ──────────────────────────────────────────────────────────

When('{word} submits the query {string}', async function (persona, query) {
  await chatPage.submitQuery(query);
});

When('{word} submits the follow-up query {string}', async function (persona, query) {
  await chatPage.submitQuery(query);
});

When('{word} submits a multi-line query with two separate lines', async function (persona) {
  await chatPage.submitMultiLineQuery(
    'List the top epics for this workspace',
    'Also identify which ones are critical priority'
  );
});

When('{word} types text into the query input', async function (persona) {
  await chatPage.typeInQueryInput('Hello');
});

When('{word} attempts to enter a query longer than 5000 characters', async function (persona) {
  await chatPage.typeTextOfLength(5001);
});

When('{word} attempts to submit an empty query', async function (persona) {
  await chatPage.submitEmptyQuery();
});

// ── Response Assertions ───────────────────────────────────────────────────────

Then('{word} should receive a relevant text response', async function (persona) {
  await chatPage.verifyResponseReceived();
});

Then('the response should contain only text content', async function () {
  await chatPage.verifyTextOnlyResponse();
});

Then('{word} should see a typing indicator while the response is being generated', async function (persona) {
  await chatPage.verifyTypingIndicatorVisible();
});

Then('{word} should receive a response that addresses both lines of the query', async function (persona) {
  await chatPage.verifyResponseReceived();
});

Then('{word} should see an out-of-scope message redirecting to workspace topics', async function (persona) {
  await chatPage.verifyOutOfScopeMessage();
});

Then('{word} should receive a response that references the critical epics from the prior turn', async function (persona) {
  await chatPage.verifyContextualResponse();
});

// ── Character Limit Assertions ────────────────────────────────────────────────

Then('{word} should see a character counter showing remaining limit out of 5000', async function (persona) {
  await chatPage.verifyCharacterCounterVisible();
});

Then('the input should not accept more than 5000 characters', async function () {
  await chatPage.verifyInputLimitEnforced(5000);
});

// ── Attachment Assertion ──────────────────────────────────────────────────────

Then('{word} should not see any file attachment or upload button', async function (persona) {
  await chatPage.verifyNoAttachmentOption();
});

// ── Session Naming Assertion ──────────────────────────────────────────────────

Then('a new named session should appear in the chat history sidebar', async function () {
  await chatPage.verifySessionNamedInSidebar();
});

// ── Empty Query Assertion ─────────────────────────────────────────────────────

Then('{word} should see a validation message indicating the query cannot be empty', async function (persona) {
  await chatPage.verifyEmptyQueryValidationMessage();
});
