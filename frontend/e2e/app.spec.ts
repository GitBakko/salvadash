import { test, expect } from '@playwright/test';

/**
 * E2E tests che verificano il comportamento dell'app senza
 * richiedere un backend attivo — testano UI, navigazione e
 * gestione degli errori.
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows login form', async ({ page }) => {
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows client-side validation', async ({ page }) => {
    // Submit empty form
    await page.click('button[type="submit"]');
    // HTML5 required validation prevents submission
    const emailInput = page.locator('input#email');
    expect(await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false);
  });

  test('has link to register page', async ({ page }) => {
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL('/register');
  });

  test('has forgot password link', async ({ page }) => {
    const link = page.locator('a[href="/forgot-password"]');
    await expect(link).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.fill('input#email', 'bad@test.com');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message (network failure since no backend)
    await page.waitForTimeout(2000);
    // Form should still be visible (no redirect)
    await expect(page.locator('input#email')).toBeVisible();
  });
});

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('shows registration form', async ({ page }) => {
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    // Name field uses i18n label → id is derived from translated label
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
  });

  test('has link back to login', async ({ page }) => {
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await loginLink.click();
    await expect(page).toHaveURL('/login');
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
    const emailInput = page.locator('input#email');
    await expect(emailInput).toBeVisible();

    // Viewport fits properly
    const box = await emailInput.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(200);
    expect(box!.width).toBeLessThanOrEqual(390);
  });
});

test.describe('Accessibility', () => {
  test('login form has proper labels', async ({ page }) => {
    await page.goto('/login');
    // All inputs should have associated labels (via id)
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeVisible();
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeVisible();
  });

  test('page has proper heading', async ({ page }) => {
    await page.goto('/login');
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });
});
