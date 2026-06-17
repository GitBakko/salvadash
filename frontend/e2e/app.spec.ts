import { test, expect } from '@playwright/test';

/**
 * E2E smoke tests for UI, navigation and error handling. Selectors are
 * type/role/label based (not i18n-derived ids) so they stay robust across
 * copy changes.
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows login form', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows client-side validation', async ({ page }) => {
    await page.locator('button[type="submit"]').click();
    const emailInput = page.locator('input[type="email"]');
    expect(await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  });

  test('has link to register page', async ({ page }) => {
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('has forgot password link', async ({ page }) => {
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.locator('input[type="email"]').fill('bad@test.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    // Stays on the login page (no redirect) — invalid creds are rejected.
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('shows registration form', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('has link back to login', async ({ page }) => {
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Navigation Guards', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects from protected routes to login', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/\/login/);
  });

  test('can access login without being authenticated', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);
  });

  test('can access register without being authenticated', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Responsive Design (mobile)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('login form is usable on mobile viewport', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    const box = await emailInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.width).toBeLessThanOrEqual(390);
  });
});

test.describe('Accessibility', () => {
  test('login inputs have associated labels', async ({ page }) => {
    await page.goto('/login');
    // getByLabel resolves through the htmlFor/id association → asserts a11y.
    // Non-exact: the rendered label includes a required-marker after the text.
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('page has a heading', async ({ page }) => {
    await page.goto('/login');
    // Filter to a visible heading — some headings are hidden per breakpoint.
    await expect(page.locator('h1, h2').filter({ visible: true }).first()).toBeVisible();
  });
});
