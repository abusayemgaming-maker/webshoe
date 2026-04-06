import { test, expect } from '@playwright/test';

test('smoke', async ({ page }) => {
  await page.goto('http://localhost:3001');
  await expect(page).toHaveTitle(/.*/);
});
