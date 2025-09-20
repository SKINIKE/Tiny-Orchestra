import { expect, test } from '@playwright/test';

test('renders the Tiny Orchestra hero copy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Tiny Orchestra/);
  await expect(page.getByRole('status')).toHaveText(/Set your name/);
});
