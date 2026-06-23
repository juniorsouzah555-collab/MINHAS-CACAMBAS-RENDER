import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL || '';
const PASSWORD = process.env.TEST_PASSWORD || '';

test.describe('Login Screen', () => {
  test('should load login page with correct elements', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Relâmpago Caçambas');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
    await page.screenshot({ path: 'screenshots/login-page.png', fullPage: true });
  });

  test('should show error when submitting with only email filled', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.evaluate(() => {
      document.querySelector('input[type="password"]')?.removeAttribute('required');
    });
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText('Por favor, preencha todos os campos.')).toBeVisible({ timeout: 5000 });
  });

  test('should show error when submitting with only password filled', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="password"]', 'somepass');
    await page.evaluate(() => {
      document.querySelector('input[type="email"]')?.removeAttribute('required');
    });
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText('Por favor, preencha todos os campos.')).toBeVisible({ timeout: 5000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'TEST_EMAIL and TEST_PASSWORD not set');

    await page.goto('/');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();

    await page.waitForURL('**/');
    await expect(page.getByText('Acesso Autorizado')).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'screenshots/login-success.png', fullPage: true });
  });
});

test.describe('Fleet View — Vehicle Delete Button', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'TEST_EMAIL and TEST_PASSWORD not set');
    await page.goto('/');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL('**/');
    await expect(page.getByText('Acesso Autorizado')).toBeVisible({ timeout: 15000 });
  });

  test('should show delete button in vehicle register tab', async ({ page }) => {
    await page.locator('#tab-register').click();
    await page.waitForTimeout(2000);

    const tableDeleteButtons = page
      .locator('table button')
      .filter({ has: page.locator('svg.lucide-trash-2') });
    const count = await tableDeleteButtons.count();
    console.log(`Found ${count} delete button(s) in vehicle register tab`);

    if (count > 0) {
      await tableDeleteButtons.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: 'screenshots/fleet-delete-button.png', fullPage: true });
    }

    expect(count).toBeGreaterThan(0);
  });

  test('should confirm dialog when clicking delete', async ({ page }) => {
    await page.locator('#tab-register').click();
    await page.waitForTimeout(2000);

    const tableDeleteButtons = page
      .locator('table button')
      .filter({ has: page.locator('svg.lucide-trash-2') });
    const count = await tableDeleteButtons.count();
    if (count === 0) test.fixme(true, 'No delete buttons found in register tab');

    const dialogPromise = new Promise<string>((resolve) => {
      page.on('dialog', async (dialog) => {
        resolve(dialog.message());
        await dialog.dismiss();
      });
    });

    await tableDeleteButtons.first().click();
    const message = await dialogPromise;
    expect(message).toMatch(/excluir|deletar|remover/i);
  });
});

test.describe('Mobile Viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('should render login on mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Relâmpago Caçambas');
    await page.screenshot({ path: 'screenshots/login-mobile.png', fullPage: true });
  });

  test('should login and see fleet delete button on mobile', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'TEST_EMAIL and TEST_PASSWORD not set');

    await page.goto('/');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL('**/');
    await expect(page.getByText('Acesso Autorizado')).toBeVisible({ timeout: 15000 });

    await page.locator('#tab-register').click();
    await page.waitForTimeout(2000);

    const tableDeleteButtons = page
      .locator('table button')
      .filter({ has: page.locator('svg.lucide-trash-2') });
    const count = await tableDeleteButtons.count();
    console.log(`Mobile: Found ${count} delete button(s) in register tab`);

    if (count > 0) {
      await tableDeleteButtons.first().scrollIntoViewIfNeeded();
    }
    await page.screenshot({ path: 'screenshots/fleet-mobile.png', fullPage: true });

    expect(count).toBeGreaterThan(0);
  });
});
