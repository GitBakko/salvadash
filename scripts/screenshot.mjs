import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const EMAIL = process.env.SCREENSHOT_EMAIL || 'user@example.com';
const PASSWORD = process.env.SCREENSHOT_PASSWORD || 'password';
const OUTPUT = 'docs/assets/hero.png';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // Debug: log console messages
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('response', res => {
    if (res.url().includes('/api/')) console.log(`API ${res.status()} ${res.url()}`);
  });

  // Login
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  console.log('Login page loaded, filling form...');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForTimeout(5000);
  console.log('Current URL:', page.url());

  // Take screenshot of whatever state we're in
  await page.screenshot({ path: OUTPUT, type: 'png' });
  console.log(`✅ Screenshot saved to ${OUTPUT}`);

  await browser.close();
})();
