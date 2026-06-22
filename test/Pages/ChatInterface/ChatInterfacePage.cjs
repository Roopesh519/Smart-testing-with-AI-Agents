'use strict';

const { expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'https://d22siumwh59jot.cloudfront.net';
const CORE_PATH = process.env.CORE_PATH || '/core/69f34194ecf3eee621132f64';

class ChatInterfacePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;

    // ── Locators — confirmed via Playwright MCP on live DOM ──────────────────
    // No data-testid attributes exist; using role/title/CSS per Locator Priority Rules

    // Input area
    // Priority 3: placeholder text (floating label pattern not present here — textarea has real placeholder)
    this.queryInput = page.locator('textarea');

    // Send button has title="Send" — Priority 4: attribute selector
    this.sendButton = page.locator('button[title="Send"]');

    // Voice button — Priority 4: attribute selector
    this.voiceButton = page.locator('button[title="Voice input"]');

    // Character counter — text pattern "N / 5000" appears below input after typing
    // Priority 3: getByText with regex
    this.characterCounter = page.getByText(/\d+ \/ 5000/);

    // Typing indicator — "... Reading epics" / "... Loading PRD" text during response
    // Priority 3: getByText with broad regex covering observed indicator states
    this.typingIndicator = page.getByText(/Reading|Loading|Searching/i);

    // Session items in sidebar use title attribute (confirmed in DOM)
    // Priority 4: attribute CSS selector (dynamic — set per test via getByTitle)
    this.sidebarSessionList = page.locator('[title]:not([title="Send"]):not([title="Voice input"]):not([title="New chat"]):not([title="Collapse"]):not([title="Workspace"])').filter({ hasText: /\w+/ });

    // "New chat" button in sidebar header
    this.newChatButton = page.locator('button').filter({ hasText: 'New chat' }).first();

    // Attachment / file upload — confirmed absent; locator used only for negative assertion
    this.fileInput = page.locator('input[type="file"]');
    this.attachmentButton = page.locator('button[title*="ttach"], button[aria-label*="ttach"]');

    // Response area — chat messages rendered in main content div after first query
    // Detected via heading "How can I help you today?" disappearing + new text content
    this.responseContent = page.locator('div.flex-1.relative');

    // Scope-redirect message text (observed: "I'm here to answer questions about this workspace")
    this.outOfScopeMessage = page.getByText(/I'm here to answer questions about this workspace/i);

    // Empty query validation message — expected but currently absent (Bug AA-700)
    this.emptyQueryError = page.getByText(/please enter|cannot be empty|type something|query is required/i);
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async navigateToCore() {
    await this.page.goto(`${BASE_URL}${CORE_PATH}`);
    // Per Locator Pattern Rule 4 — don't assume URL after navigation; wait for UI landmark
    await this.page.waitForFunction(
      () => document.querySelector('textarea') !== null || document.querySelector('input[type="text"]') !== null,
      { timeout: 30000 }
    );
  }

  // ── Verification helpers ────────────────────────────────────────────────────

  async verifyLoggedIn() {
    // Confirm not on login page — per Locator Pattern Rule 4
    await this.page.waitForFunction(
      () => !window.location.href.includes('/login'),
      { timeout: 15000 }
    );
  }

  async verifyOnChatPage() {
    await expect(this.queryInput).toBeVisible({ timeout: 10000 });
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async submitQuery(queryText) {
    await expect(this.queryInput).toBeVisible({ timeout: 10000 });
    await this.queryInput.click();
    await this.queryInput.fill(queryText);
    await this.queryInput.press('Enter');
  }

  async submitMultiLineQuery(line1, line2) {
    await expect(this.queryInput).toBeVisible({ timeout: 10000 });
    await this.queryInput.click();
    await this.queryInput.fill(line1);
    // Shift+Enter inserts newline in the React textarea
    await this.queryInput.press('Shift+Enter');
    await this.queryInput.type(line2);
    await this.queryInput.press('Enter');
  }

  async typeInQueryInput(text) {
    await expect(this.queryInput).toBeVisible({ timeout: 10000 });
    await this.queryInput.click();
    await this.queryInput.fill(text);
  }

  async typeTextOfLength(length) {
    await expect(this.queryInput).toBeVisible({ timeout: 10000 });
    await this.queryInput.click();
    // Use keyboard.type to simulate realistic input that React state intercepts
    const chunk = 'A'.repeat(length);
    await this.page.keyboard.type(chunk);
  }

  async submitEmptyQuery() {
    await expect(this.queryInput).toBeVisible({ timeout: 10000 });
    await this.queryInput.click();
    await this.queryInput.press('Enter');
  }

  // ── Assertions ──────────────────────────────────────────────────────────────

  async verifyResponseReceived() {
    // Wait for send button to become enabled again (stream complete)
    // and confirm new text content appeared beyond the placeholder
    await expect(this.sendButton).not.toHaveAttribute('disabled', { timeout: 60000 });
    const bodyText = await this.page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(500);
  }

  async verifyTextOnlyResponse() {
    // Confirm no image or file-link elements exist inside the chat response area
    const images = await this.responseContent.locator('img:not([alt=""])').count();
    const fileLinks = await this.responseContent.locator('a[href$=".pdf"], a[href$=".docx"], a[href$=".zip"]').count();
    expect(images).toBe(0);
    expect(fileLinks).toBe(0);
  }

  async verifyTypingIndicatorVisible() {
    // Typing indicator appears briefly — check within 5 s of query submission
    await expect(this.typingIndicator).toBeVisible({ timeout: 5000 });
  }

  async verifyOutOfScopeMessage() {
    await expect(this.sendButton).not.toHaveAttribute('disabled', { timeout: 30000 });
    await expect(this.outOfScopeMessage).toBeVisible({ timeout: 10000 });
  }

  async verifyContextualResponse() {
    // Follow-up response should reference prior context — check for E01 or E02 epic codes
    await expect(this.sendButton).not.toHaveAttribute('disabled', { timeout: 60000 });
    const bodyText = await this.page.locator('body').innerText();
    const hasEpicContext = /E01|E02|Identity|Product Catalog/i.test(bodyText);
    expect(hasEpicContext).toBe(true);
  }

  async verifyCharacterCounterVisible() {
    // Counter appears as "N / 5000" below the input after text is typed
    await expect(this.characterCounter).toBeVisible({ timeout: 5000 });
  }

  async verifyInputLimitEnforced(maxLength) {
    const currentLength = (await this.queryInput.inputValue()).length;
    expect(currentLength).toBeLessThanOrEqual(maxLength);
  }

  async verifyNoAttachmentOption() {
    const fileInputCount = await this.fileInput.count();
    const attachBtnCount = await this.attachmentButton.count();
    expect(fileInputCount).toBe(0);
    expect(attachBtnCount).toBe(0);
  }

  async verifySessionNamedInSidebar() {
    // After first query, sidebar should show a named session (not "New chat" / "Unable to generate title")
    await expect(this.sendButton).not.toHaveAttribute('disabled', { timeout: 60000 });
    // Poll sidebar for a session title that looks like a real name (>10 chars, not generic)
    await this.page.waitForFunction(() => {
      const items = [...document.querySelectorAll('button[title]')];
      return items.some(b => {
        const title = b.getAttribute('title') || '';
        return title.length > 10 &&
          !title.includes('New chat') &&
          !title.includes('Unable to generate') &&
          !title.includes('Send') &&
          !title.includes('Voice') &&
          !title.includes('Collapse') &&
          !title.includes('Workspace');
      });
    }, { timeout: 30000 });
  }

  async verifyEmptyQueryValidationMessage() {
    // Per Bug AA-700 — currently this message does NOT appear (silent block)
    // Test is expected to FAIL until the bug is fixed
    await expect(this.emptyQueryError).toBeVisible({ timeout: 5000 });
  }
}

module.exports = ChatInterfacePage;
