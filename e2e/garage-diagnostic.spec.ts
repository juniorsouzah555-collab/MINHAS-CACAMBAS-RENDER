import { test, expect } from '@playwright/test';

const EMAIL = process.env.TEST_EMAIL || '';
const PASSWORD = process.env.TEST_PASSWORD || '';

test.describe('Garage Price Flow', () => {
  test('check FleetView garage price and set to 7.00', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'no creds');
    await page.goto('/');
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL('**/');
    await expect(page.getByText('Acesso Autorizado')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);

    await page.locator('#tab-refuels').click();
    await page.waitForTimeout(2000);

    const label = page.getByText('Valor do Litro Diesel (R$/L)');
    await label.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const input = label.locator('..').locator('input');
    const val = await input.inputValue();
    console.log('FleetView garage price:', val);

    if (val !== '7,00') {
      await input.click();
      await input.fill('');
      await input.pressSequentially('700', { delay: 30 });
      await page.waitForTimeout(500);
      console.log('Set to:', await input.inputValue());
    }

    await page.screenshot({ path: 'screenshots/garage-price.png', fullPage: true });
  });

  test('check price sync from Supabase after clearing localStorage', async ({ page }) => {
    test.skip(!EMAIL || !PASSWORD, 'no creds');
    // Clear localStorage to simulate a fresh device — Supabase should restore the price
    // from the special GARAGE-CONFIG record in vehicles table
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL('**/');
    await expect(page.getByText('Acesso Autorizado')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);

    await page.locator('#nav-item-driver-portal').click();
    await page.waitForTimeout(3000);

    await page.getByText('Abastecimento').click();
    await page.waitForTimeout(1000);

    await page.getByText('Bomba Garagem').click();
    await page.waitForTimeout(1000);

    const disabled = page.locator('input:disabled');
    const values = await disabled.evaluateAll(el => el.map(e => (e as HTMLInputElement).value));
    console.log('Disabled input values (from Supabase):', values);

    await page.screenshot({ path: 'screenshots/driver-portal-supabase-sync.png', fullPage: true });

    // With price=7 and liters=120 (default), should be 840.00
    expect(values.some(v => v === '840.00')).toBe(true);
  });
});
