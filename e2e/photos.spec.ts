import { test, expect } from '@playwright/test';
import { SAMPLE_PNG_BUFFER, SAMPLE_PNG_DATA_URL, seedCapacitorStorage } from './helpers';

test.describe('Photo Attachment Flows & Capacitor Camera Web Fallbacks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('toggles photo options and attaches a photo from gallery via file chooser', async ({
    page,
  }) => {
    await page.goto('/entry/new');

    const addPhotoBtn = page.locator('button.add-photo-btn');
    await expect(addPhotoBtn).toContainText('Add Photo');

    await addPhotoBtn.click();
    const photoOptions = page.locator('.photo-options');
    await expect(photoOptions).toBeVisible();
    await expect(photoOptions.locator('button', { hasText: 'Take Photo' })).toBeVisible();
    await expect(photoOptions.locator('button', { hasText: 'Choose from Gallery' })).toBeVisible();

    // Capacitor Camera web implementation opens a native file chooser when selecting from Photos
    const fileChooserPromise = page.waitForEvent('filechooser');
    await photoOptions.locator('button', { hasText: 'Choose from Gallery' }).click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'gratitude-photo.png',
      mimeType: 'image/png',
      buffer: SAMPLE_PNG_BUFFER,
    });

    // Verify photo preview appears and button label updates to "Change Photo"
    const previewImg = page.locator('.photo-preview img[alt="Entry photo"]');
    await expect(previewImg).toBeVisible();
    await expect(previewImg).toHaveAttribute('src', /^data:image\//);
    await expect(addPhotoBtn).toContainText('Change Photo');

    // Save entry with photo and verify photo indicator badge appears on the entry card
    await page.locator('textarea#content').fill('Entry with a cherished photo attachment.');
    await page.locator('button.save-btn').click();

    await expect(page).toHaveURL(/\/$/);
    const card = page.locator('.entry-card').first();
    await expect(card.locator('.entry-has-photo')).toBeVisible();
  });

  test('removes an attached photo from an entry', async ({ page }) => {
    const now = new Date().toISOString();
    await seedCapacitorStorage(page, {
      entries: [
        {
          id: 'entry-with-photo',
          date: now,
          content: 'Entry with existing photo',
          photoUrl: SAMPLE_PNG_DATA_URL,
        },
      ],
    });
    await page.goto('/entry/entry-with-photo');

    await expect(page.locator('.photo-preview img[alt="Entry photo"]')).toBeVisible();
    await expect(page.locator('button.add-photo-btn')).toContainText('Change Photo');

    await page.locator('button.remove-photo-btn').click();

    await expect(page.locator('.photo-preview')).toHaveCount(0);
    await expect(page.locator('button.add-photo-btn')).toContainText('Add Photo');

    await page.locator('button.save-btn').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.entry-card .entry-has-photo')).toHaveCount(0);
  });
});
