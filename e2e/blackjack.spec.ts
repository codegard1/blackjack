import { Page, expect, test } from '@playwright/test';

async function dealPlayableHand(page: Page) {
  await page.getByRole('button', { name: 'Deal' }).click();
  const stay = page.getByRole('button', { name: 'Stay' });
  const next = page.getByRole('button', { name: 'Next hand' });
  for (let i = 0; i < 5; i++) {
    await expect(stay.or(next)).toBeVisible({ timeout: 10_000 });
    if (await stay.isVisible() && await stay.isEnabled()) return;
    await expect(next).toBeEnabled({ timeout: 15_000 });
    await next.click();
  }
  await expect(stay).toBeEnabled({ timeout: 10_000 });
}

test.describe('Blackjack end-to-end', () => {
  test('starts a game, plays a hand to the end, and starts the next hand', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game' }).click();
    await dealPlayableHand(page);

    await page.getByRole('button', { name: 'Stay' }).click();
    const nextHand = page.getByRole('button', { name: 'Next hand' });
    await expect(nextHand).toBeEnabled({ timeout: 15_000 });

    await nextHand.click();
    await expect(page.getByRole('button', { name: 'Stay' }).or(nextHand)).toBeVisible({ timeout: 10_000 });
  });

  test('completes a full round with four computer players without stalling', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Players' }).click();
    const dialog = page.getByRole('dialog', { name: 'Players' });
    for (const bot of ['Ogion', 'Shevek', 'Haber', 'Genly Ai']) {
      const checkbox = dialog.getByRole('checkbox', { name: new RegExp(bot) });
      if (!(await checkbox.isChecked())) {
        await checkbox.check();
      }
    }
    await dialog.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: 'Start game' }).click();
    await dealPlayableHand(page);
    await page.getByRole('button', { name: 'Stay' }).click();

    await expect(page.getByRole('button', { name: 'Next hand' })).toBeEnabled({ timeout: 30_000 });
  });

  test('reloads mid-hand and resumes the round', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game' }).click();
    await dealPlayableHand(page);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Stay' })).toBeEnabled({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Stay' }).click();
    await expect(page.getByRole('button', { name: 'Next hand' })).toBeEnabled({ timeout: 15_000 });
  });

  test('completes a round quickly with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByRole('button', { name: 'Start game' }).click();
    await dealPlayableHand(page);
    await page.getByRole('button', { name: 'Stay' }).click();

    await expect(page.getByRole('button', { name: 'Next hand' })).toBeEnabled({ timeout: 5_000 });
  });

  test('loads and plays offline after the first visit', async ({ context, page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    // Reload once so the active service worker controls the client
    await page.reload();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    await context.setOffline(true);
    await page.reload();

    await page.getByRole('button', { name: 'Start game' }).click();
    await dealPlayableHand(page);
    await page.getByRole('button', { name: 'Stay' }).click();
    await expect(page.getByRole('button', { name: 'Next hand' })).toBeEnabled({ timeout: 15_000 });
    await context.setOffline(false);
  });
});
