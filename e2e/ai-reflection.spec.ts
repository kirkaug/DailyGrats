import { test, expect } from '@playwright/test';
import { seedCapacitorStorage } from './helpers';

test.describe('AI Reflection Generation States & UI Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('generates an offline AI reflection when no API key is configured', async ({ page }) => {
    await page.goto('/entry/new');

    const generateBtn = page.locator('button.generate-reflection-btn');
    await expect(generateBtn).toBeDisabled();
    await expect(generateBtn).toContainText('Generate Reflection');
    await expect(page.locator('.no-reflection')).toContainText(
      'Get an AI-powered reflection on your gratitude entry.'
    );

    await page.locator('textarea#content').fill('Grateful for a quiet evening reading a good book.');
    await expect(generateBtn).toBeEnabled();

    await generateBtn.click();

    const reflectionContent = page.locator('.reflection-content p');
    await expect(reflectionContent).toBeVisible();
    const text = await reflectionContent.textContent();
    expect(text?.trim().length).toBeGreaterThan(20);
    await expect(generateBtn).toContainText('Regenerate Reflection');

    // Save entry and verify the reflection badge is shown on the entry card
    await page.locator('button.save-btn').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.entry-card .entry-has-reflection')).toBeVisible();
  });

  test('shows loading state and displays online Gemini API reflection when configured', async ({
    page,
  }) => {
    await seedCapacitorStorage(page, {
      settings: {
        aiReflectionEnabled: true,
        aiApiEndpoint:
          'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
        aiApiKey: 'test-gemini-api-key',
      },
    });

    let resolveApiCall!: () => void;
    const apiCallGate = new Promise<void>(resolve => {
      resolveApiCall = resolve;
    });

    await page.route('**/models/gemini-3.5-flash:generateContent*', async route => {
      await apiCallGate;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'What a warm reflection on friendship and connection. Cherishing these bonds brings lasting peace.',
                  },
                ],
              },
            },
          ],
        }),
      });
    });

    await page.goto('/entry/new');
    await page.locator('textarea#content').fill('Had a wonderful catch-up call with an old friend.');

    const generateBtn = page.locator('button.generate-reflection-btn');
    await generateBtn.click();

    // Verify intermediate loading UI state while request is in-flight
    await expect(generateBtn).toBeDisabled();
    await expect(generateBtn).toContainText('Generating...');

    // Release the API response
    resolveApiCall();

    await expect(page.locator('.reflection-content p')).toHaveText(
      'What a warm reflection on friendship and connection. Cherishing these bonds brings lasting peace.'
    );
    await expect(generateBtn).toBeEnabled();
    await expect(generateBtn).toContainText('Regenerate Reflection');
  });

  test('falls back to offline reflection and alerts user when API request fails', async ({
    page,
  }) => {
    await seedCapacitorStorage(page, {
      settings: {
        aiReflectionEnabled: true,
        aiApiEndpoint: 'https://api.example.com/v1/reflections',
        aiApiKey: 'invalid-key',
      },
    });

    await page.route('https://api.example.com/v1/reflections', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/entry/new');
    await page.locator('textarea#content').fill('Grateful for healthy meals and clean water.');

    let alertMessage = '';
    page.once('dialog', async dialog => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.locator('button.generate-reflection-btn').click();

    await expect(page.locator('.reflection-content p')).toBeVisible();
    expect(alertMessage).toContain('Failed to generate AI reflection. Using offline mode.');
  });

  test('hides AI reflection section on Entry Detail when disabled in Settings', async ({
    page,
  }) => {
    await seedCapacitorStorage(page, {
      settings: {
        aiReflectionEnabled: false,
      },
    });

    await page.goto('/entry/new');
    await expect(page.locator('.ai-reflection-section')).toHaveCount(0);
  });
});
