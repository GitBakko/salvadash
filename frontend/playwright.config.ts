import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        defaultBrowserType: 'chromium',
      },
    },
  ],
  webServer: {
    // Brings up the full dev stack (backend :3000 + frontend :5173). The specs
    // need the API to respond (e.g. /auth/me → 401, invalid-login → 401), so the
    // frontend alone is not enough. `cwd: '..'` runs the ROOT `dev` script
    // (`pnpm --parallel -r run dev` = backend + frontend); running it from this
    // package dir would start vite only. CI provisions Postgres + env.
    command: 'pnpm dev',
    cwd: '..',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
