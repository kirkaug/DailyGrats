import { test, expect } from '@playwright/test';
import { seedCapacitorStorage } from './helpers';

test.describe('Settings Page (Notifications, Theme, Data Management & Persistence)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('switches themes (Light, Dark, Auto) and persists selection across reloads', async ({
    page,
  }) => {
    await page.locator('button.settings-btn[aria-label="Settings"]').click();
    await expect(page).toHaveURL(/\/settings$/);

    const darkBtn = page.locator('.theme-selector .theme-btn', { hasText: 'Dark' });
    const lightBtn = page.locator('.theme-selector .theme-btn', { hasText: 'Light' });

    await darkBtn.click();
    await expect(darkBtn).toHaveClass(/selected/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Reload page and confirm persistence
    await page.reload();
    await expect(darkBtn).toHaveClass(/selected/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await lightBtn.click();
    await expect(lightBtn).toHaveClass(/selected/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('enables daily reminders, updates reminder time and days when notification permission is granted', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['notifications']);
    await page.goto('/settings');

    const reminderSection = page.locator('.settings-section', { hasText: 'Daily Reminders' });
    const reminderToggle = reminderSection.locator('label.toggle-switch');
    const reminderCheckbox = reminderToggle.locator('input[type="checkbox"]');

    await expect(reminderCheckbox).not.toBeChecked();
    await reminderToggle.click();
    await expect(reminderCheckbox).toBeChecked();

    const timeInput = page.locator('input.time-input[type="time"]');
    await expect(timeInput).toBeVisible();
    await expect(timeInput).toHaveValue('20:00');

    await timeInput.fill('08:30');
    await timeInput.dispatchEvent('change');

    // Toggle Sunday off and verify it updates
    const sunBtn = page.locator('.days-selector .day-btn', { hasText: 'Sun' });
    await expect(sunBtn).toHaveClass(/selected/);
    await sunBtn.click();
    await expect(sunBtn).not.toHaveClass(/selected/);

    // Reload and verify reminder time and day selection persisted in CapacitorStorage
    await page.reload();
    await expect(reminderCheckbox).toBeChecked();
    await expect(page.locator('input.time-input[type="time"]')).toHaveValue('08:30');
    await expect(page.locator('.days-selector .day-btn', { hasText: 'Sun' })).not.toHaveClass(
      /selected/
    );
  });

  test('exports, imports, and clears journal entries via Data Management', async ({ page }) => {
    const now = new Date().toISOString();
    await seedCapacitorStorage(page, {
      entries: [
        {
          id: 'export-entry-1',
          date: now,
          content: 'Entry ready for backup export',
        },
      ],
    });
    await page.goto('/settings');

    // 1. Export entries
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button.export-btn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^dailygrats-entries-\d{4}-\d{2}-\d{2}\.json$/);
    await expect(page.locator('.data-status-message')).toContainText(
      'Exported 1 entry successfully.'
    );

    // 2. Clear all entries
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button.danger-btn', { hasText: 'Clear All' }).click();
    await expect(page.locator('.data-status-message')).toContainText('Cleared 1 entry.');

    // 3. Import entries from JSON backup
    const backupPayload = JSON.stringify({
      version: 1,
      exportedAt: now,
      entries: [
        {
          id: 'imported-1',
          date: now,
          content: 'Restored gratitude entry from backup',
        },
        {
          id: 'imported-2',
          date: now,
          content: 'Second restored entry',
        },
      ],
    });

    const fileInput = page.locator('input[type="file"][accept=".json,application/json"]');
    await fileInput.setInputFiles({
      name: 'backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(backupPayload, 'utf-8'),
    });

    await expect(page.locator('.data-status-message')).toContainText(
      'Import complete: 2 added, 0 updated.'
    );

    // Navigate back to entry list and verify imported entries appear
    await page.locator('.settings-header button.back-btn').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.entry-card')).toHaveCount(2);
  });
});
