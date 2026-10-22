import { test, expect } from '@playwright/test';
import { seedCapacitorStorage } from './helpers';

test.describe('Responsive Mobile Viewport & Visual Layout Checks', () => {
  test('renders cleanly without horizontal overflow across mobile and desktop viewports', async ({
    page,
  }) => {
    const now = new Date().toISOString();
    await page.goto('/');
    await seedCapacitorStorage(page, {
      entries: [
        {
          id: 'visual-1',
          date: now,
          content:
            'Testing responsive layout and card wrapping across mobile and desktop screen sizes.',
          aiReflection: 'A thoughtful reflection on layout consistency.',
        },
      ],
    });
    await page.reload();

    // Check no horizontal scroll overflow on current project viewport (Desktop Chrome or Pixel 7)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Check FAB button is positioned within viewport bounds
    const fab = page.locator('button.fab[aria-label="New Gratitude Entry"]');
    await expect(fab).toBeVisible();
    const fabBox = await fab.boundingBox();
    const viewport = page.viewportSize();
    expect(fabBox).not.toBeNull();
    if (fabBox && viewport) {
      expect(fabBox.x + fabBox.width).toBeLessThanOrEqual(viewport.width);
      expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(viewport.height);
    }
  });

  test('applies dark and light theme CSS surface and gradient colors accurately', async ({
    page,
  }) => {
    await page.goto('/settings');

    const section = page.locator('.settings-section').first();

    await page.locator('.theme-selector .theme-btn', { hasText: 'Light' }).click();
    const lightSurfaceBg = await section.evaluate(el => getComputedStyle(el).backgroundColor);

    await page.locator('.theme-selector .theme-btn', { hasText: 'Dark' }).click();
    const darkSurfaceBg = await section.evaluate(el => getComputedStyle(el).backgroundColor);

    expect(lightSurfaceBg).not.toEqual(darkSurfaceBg);
  });
});
