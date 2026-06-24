import { test, expect } from '@playwright/test';

const EMAIL = 'juniorsouzah555@gmail.com';
const PASSWORD = 'admin123';

test.describe('Boletos - Lello Download', () => {
  test('login, navigate to boletos, and test Lello download', async ({ page }) => {
    test.setTimeout(120000);

    page.on('console', msg => {
      if (msg.type() === 'error') console.log('[BROWSER ERROR]', msg.text());
    });

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('api/gmail?action=fetch')) {
        const body = await response.text();
        console.log(`[GMAIL FETCH] status=${response.status()}, body length=${body.length}`);
        const data = JSON.parse(body);
        const lelloEmails = data.emails?.filter((e: any) => e.from?.includes('LELLO'));
        if (lelloEmails?.length) {
          console.log(`Lello emails: ${lelloEmails.length}`);
          console.log(`  fromEmail present: ${!!lelloEmails[0].fromEmail}`);
          lelloEmails.forEach((e: any, i: number) => {
            console.log(`  [${i}] boletoLink: ${e.boletoLink?.substring(0, 150)}`);
            console.log(`  [${i}] hasProvider: ${e.hasProvider}, from: ${e.from}, fromEmail: ${e.fromEmail || '(not set)'}`);
          });
        }
      } else if (url.includes('api/gmail') && !url.includes('.css') && !url.includes('.js')) {
        console.log(`[API ${response.status()}] ${url.substring(0, 180)}`);
      }
    });

    await page.goto('/');

    // Login
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();

    // Wait for login to complete (sidebar appears)
    await page.waitForSelector('#sidebar-container', { timeout: 15000 });

    // Navigate to Boletos tab
    await page.click('#nav-item-boletos');

    // Wait for BoletoView to load
    await page.waitForTimeout(2000);

    // Wait for the fetch to complete (checking if boletos are loaded)
    await page.waitForSelector('text=Baixar boleto', { timeout: 30000 });

    // Take screenshot of boletos page
    await page.screenshot({ path: 'screenshots/boletos-tab.png', fullPage: true });

    // Find Lello emails by looking at the "from" text
    const lelloEmails = page.locator('text=LELLO CONDOMINIOS LTDA').first();
    const hasLello = await lelloEmails.isVisible().catch(() => false);
    console.log(`Lello email found: ${hasLello}`);

    // Find all "Baixar boleto" buttons
    const downloadButtons = page.getByRole('button', { name: 'Baixar boleto' });
    const count = await downloadButtons.count();
    console.log(`"Baixar boleto" buttons found: ${count}`);

    if (count > 0) {
      // Click the first one
      const [response] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('downloadProviderPdf'), { timeout: 30000 }),
        downloadButtons.first().click(),
      ]);

      console.log(`Download response status: ${response.status()}`);
      try {
        const body = await response.text();
        console.log(`Download response body (first 200): ${body.substring(0, 200)}`);
      } catch {
        console.log('Could not read response body');
      }

      await page.screenshot({ path: 'screenshots/after-download.png', fullPage: true });
    }

    // Check if there's an error message visible
    const errorMsg = page.locator('text=Não foi possível obter o PDF').or(page.locator('text=Provider not found'));
    const hasError = await errorMsg.isVisible().catch(() => false);
    console.log(`Error message visible: ${hasError}`);
  });
});
