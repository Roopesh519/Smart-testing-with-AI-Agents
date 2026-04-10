/* eslint-disable no-unused-vars */

class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Rethrows originalError — healer is disabled by default.
   */
  async heal(name = null, args = [], originalError = null) {
    if (originalError) throw originalError;
    throw new Error(`heal() called for '${name}' but healer is disabled.`);
  }

  /**
   * Wait for domcontentloaded — CI-safe, no networkidle.
   */
  async waitForPageReady(timeout = 30000) {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  getCurrentUrl() {
    return this.page.url();
  }

  async getTitle() {
    return await this.page.title();
  }

  async waitForUrl(pattern, timeout = 10000) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
    await this.page.waitForURL(regex, { timeout });
  }

  /**
   * Polling-based text check for toast/banner messages.
   */
  async verifyTextOnPage(text, timeout = 50000, polling = 10) {
    await this.page.waitForFunction(
      (t) =>
        [...document.querySelectorAll('*')].some(
          (el) => el.textContent?.toLowerCase().includes(t.toLowerCase())
        ),
      text,
      { timeout, polling }
    );
  }
}

module.exports = { BasePage };
