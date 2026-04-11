/* eslint-disable no-unused-vars */

const { chromium } = require('playwright');
const {
  After,
  AfterAll,
  Before,
  BeforeAll,
  AfterStep,
  setDefaultTimeout,
} = require('@cucumber/cucumber');
const { createCoverageMap } = require('istanbul-lib-coverage');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config({ debug: false });

let faker;
global.healerEnabled = false;

setDefaultTimeout(180000);

// ── Coverage data directory ───────────────────────────────────────────────────
const coverageDataDir = path.join(__dirname, 'coverageData');
if (!fs.existsSync(coverageDataDir)) {
  fs.mkdirSync(coverageDataDir, { recursive: true });
}

// ── BeforeAll: launch browser, navigate to app ───────────────────────────────
BeforeAll(async function () {
  if (!faker) {
    const fakerModule = await import('@faker-js/faker');
    faker = fakerModule.faker;
  }

  const headless = false;
  const width = 1920;
  const height = 1080;

  global.defaultViewport = { width, height };

  const chromeArgs = [
    `--window-size=${width},${height}`,
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
  ];

  global.browser = await chromium.launch({
    headless,
    timeout: 60000,
    slowMo: 800,
    args: chromeArgs,
  });

  global.context = await global.browser.newContext({
    timezoneId: 'UTC',
    viewport: { width, height },
    screen: { width, height },
    colorScheme: 'light',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  global.page = await global.context.newPage();
  global.page.setDefaultTimeout(30000);
  global.page.setDefaultNavigationTimeout(60000);

  await global.page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const maxRetries = 30;
  let serverReady = false;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await global.page.goto(baseUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });
      if (response && response.status() < 500) {
        serverReady = true;
        break;
      }
    } catch {
      if (i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  if (!serverReady) {
    throw new Error(`Server at ${baseUrl} not available after ${maxRetries} attempts.`);
  }

  await global.page.waitForLoadState('domcontentloaded');
  await global.context.tracing.start({ screenshots: true, snapshots: true });
  global.current_process_name = uuidv4();

  try {
    await new Promise((r) => setTimeout(r, 2000));
    const check = await global.page.evaluate(() => ({
      exists: typeof window.__coverage__ !== 'undefined',
      keys: window.__coverage__ ? Object.keys(window.__coverage__).length : 0,
    }));
    if (!check.exists) {
      global.coverageMap = null;
    } else if (check.keys === 0) {
      global.coverageMap = createCoverageMap({});
    } else {
      global.__coverage__ = await global.page.evaluate(() => window.__coverage__);
      global.coverageMap = createCoverageMap(global.__coverage__);
    }
  } catch {
    global.coverageMap = null;
  }
});

// ── Before: set viewport per scenario ────────────────────────────────────────
Before(async function (scenario) {
  const uri = scenario.pickle?.uri || '';
  if (uri.includes('E2E2/TechnicianManagement')) {
    await global.page.setViewportSize({ width: 744, height: 1133 });
  } else if (global.defaultViewport) {
    await global.page.setViewportSize(global.defaultViewport);
  }
  this.page = global.page;
});

// ── Before @Logout: clear all browser storage ─────────────────────────────────
Before({ tags: '@Logout' }, async function () {
  await global.page.context().clearCookies();
  await global.page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  for (const p of global.page.context().pages()) {
    try {
      await p.evaluate(() => {
        window.localStorage.clear();
        window.sessionStorage.clear();
      });
    } catch { /* page already closed */ }
  }
  console.log('✅ Storage cleared');
});

// ── After @Logout1: clear storage after scenario ──────────────────────────────
After({ tags: '@Logout1' }, async function () {
  try {
    await global.page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await global.page.context().clearCookies();
    console.log('✅ Storage cleared');
  } catch { /* page already closed */ }
});

// ── After: screenshot on failure ──────────────────────────────────────────────
After(async function (scenario) {
  const failedDir = path.join(__dirname, 'failed_scenarios');
  if (!fs.existsSync(failedDir)) fs.mkdirSync(failedDir);

  if (scenario.result.status === 'FAILED') {
    const world = this;
    const uid = uuidv4();
    try {
      const shot = await global.page.screenshot();
      world.attach(shot, 'image/png');
      fs.writeFileSync(
        path.join(failedDir, `${uid}_${scenario.pickle.name.replaceAll('/', '_')}.png`),
        shot
      );
    } catch { /* screenshot failed */ }
  }
});

// ── AfterStep: merge Istanbul coverage ────────────────────────────────────────
AfterStep(async function () {
  if (!global.coverageMap) return;
  try {
    const data = await global.page.evaluate(() => window.__coverage__);
    if (data && Object.keys(data).length > 0) {
      global.coverageMap.merge(createCoverageMap(data));
    }
  } catch { /* coverage not available */ }
});

// ── AfterAll: save coverage + traces, close browser ──────────────────────────
AfterAll(async function () {
  try {
    await new Promise((r) => setTimeout(r, 2000));
    const info = await global.page.evaluate(() => ({
      exists: !!window.__coverage__,
      count: window.__coverage__ ? Object.keys(window.__coverage__).length : 0,
    }));
    if (info.exists && info.count > 0) {
      const data = await global.page.evaluate(() => window.__coverage__);
      if (global.coverageMap) {
        global.coverageMap.merge(createCoverageMap(data));
      } else {
        global.coverageMap = createCoverageMap(data);
      }
      const json = global.coverageMap.toJSON();
      if (Object.keys(json).length > 0) {
        const file = path.join(
          coverageDataDir,
          `coverage_${global.current_process_name}.json`
        );
        fs.writeFileSync(file, JSON.stringify(json, null, 2));
        console.log(`✅ Coverage saved: ${file}`);
      }
    }
  } catch { /* coverage not critical */ }

  try {
    const traceDir = path.join(__dirname, 'traceDir');
    if (!fs.existsSync(traceDir)) fs.mkdirSync(traceDir, { recursive: true });
    await global.context.tracing.stop({
      path: path.join(traceDir, `trace_${global.current_process_name}.zip`),
    });
  } catch { /* silently fail */ }

  try {
    await global.context?.close();
    await global.browser?.close();
  } catch {
    try { await global.browser?.close({ force: true }); } catch { /* ignore */ }
  }
});
