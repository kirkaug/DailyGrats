import { test, expect } from '@playwright/test';
import { seedCapacitorStorage } from './helpers';

test.describe('Gratitude Entries (Create, Edit, Delete, Filter)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('displays empty state when no entries exist', async ({ page }) => {
    await expect(page.locator('header.app-header h1')).toHaveText('DailyGrats');
    await expect(page.locator('.empty-state h2')).toHaveText('Start Your Gratitude Journey');
    await expect(page.locator('.filter-bar')).toHaveCount(0);
    await expect(page.locator('button.fab[aria-label="New Gratitude Entry"]')).toBeVisible();
  });

  test('creates a new gratitude entry and displays it in the list', async ({ page }) => {
    await page.locator('button.fab[aria-label="New Gratitude Entry"]').click();
    await expect(page).toHaveURL(/\/entry\/new$/);
    await expect(page.locator('.detail-header h2')).toHaveText('New Entry');

    const saveBtn = page.locator('button.save-btn');
    await expect(saveBtn).toBeDisabled();

    const textarea = page.locator('textarea#content');
    await textarea.fill('Grateful for sunny morning walks and fresh coffee.');
    await expect(saveBtn).toBeEnabled();

    await saveBtn.click();
    await expect(page).toHaveURL(/\/$/);

    const card = page.locator('.entry-card');
    await expect(card).toHaveCount(1);
    await expect(card.locator('.entry-date')).toHaveText('Today');
    await expect(card.locator('.entry-content p')).toContainText(
      'Grateful for sunny morning walks and fresh coffee.'
    );
  });

  test('edits an existing gratitude entry and persists changes', async ({ page }) => {
    const now = new Date().toISOString();
    await seedCapacitorStorage(page, {
      entries: [
        {
          id: 'entry-edit-1',
          date: now,
          content: 'Initial gratitude thought',
        },
      ],
    });
    await page.reload();

    const card = page.locator('.entry-card').first();
    await expect(card).toContainText('Initial gratitude thought');
    await card.click();

    await expect(page).toHaveURL(/\/entry\/entry-edit-1$/);
    await expect(page.locator('.detail-header h2')).toHaveText('Edit Entry');

    const textarea = page.locator('textarea#content');
    await expect(textarea).toHaveValue('Initial gratitude thought');

    await textarea.fill('Updated gratitude thought with deeper reflection.');
    await page.locator('button.save-btn').click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.entry-card').first()).toContainText(
      'Updated gratitude thought with deeper reflection.'
    );
  });

  test('deletes an existing entry after confirmation dialog', async ({ page }) => {
    const now = new Date().toISOString();
    await seedCapacitorStorage(page, {
      entries: [
        {
          id: 'entry-delete-1',
          date: now,
          content: 'Entry to be deleted',
        },
      ],
    });
    await page.reload();

    await page.locator('.entry-card').first().click();
    await expect(page).toHaveURL(/\/entry\/entry-delete-1$/);

    // Dismiss dialog first -> stays on page
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('button.delete-btn').click();
    await expect(page).toHaveURL(/\/entry\/entry-delete-1$/);

    // Accept dialog -> deletes and navigates back to list
    page.once('dialog', dialog => dialog.accept());
    await page.locator('button.delete-btn').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.entry-card')).toHaveCount(0);
    await expect(page.locator('.empty-state h2')).toHaveText('Start Your Gratitude Journey');
  });

  test('filters entries by Weekly and Yearly time increments', async ({ page }) => {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    await seedCapacitorStorage(page, {
      entries: [
        {
          id: 'today-1',
          date: today.toISOString(),
          content: 'Grateful today',
        },
        {
          id: 'week-1',
          date: oneWeekAgo.toISOString(),
          content: 'Grateful exactly one week ago',
        },
        {
          id: 'year-1',
          date: oneYearAgo.toISOString(),
          content: 'Grateful exactly one year ago',
        },
      ],
    });
    await page.reload();

    await expect(page.locator('.entry-card')).toHaveCount(3);

    const weeklyBtn = page.locator('.filter-bar .filter-btn', { hasText: 'Weekly' });
    await expect(weeklyBtn).toBeVisible();
    await weeklyBtn.click();

    await expect(page.locator('.entry-card')).toHaveCount(1);
    await expect(page.locator('.entry-card .entry-content')).toContainText(
      'Grateful exactly one week ago'
    );
    await expect(page.locator('.entry-card .entry-increment-badge')).toHaveText('1 week ago');

    const yearlyBtn = page.locator('.filter-bar .filter-btn', { hasText: 'Yearly' });
    await expect(yearlyBtn).toBeVisible();
    await yearlyBtn.click();

    await expect(page.locator('.entry-card')).toHaveCount(1);
    await expect(page.locator('.entry-card .entry-content')).toContainText(
      'Grateful exactly one year ago'
    );
    await expect(page.locator('.entry-card .entry-increment-badge')).toHaveText('1 year ago');
  });
});
