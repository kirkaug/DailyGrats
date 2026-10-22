import { Page } from '@playwright/test';

export interface SeedEntry {
  id: string;
  date: string;
  content: string;
  photoUrl?: string;
  aiReflection?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SeedSettings {
  notifications?: {
    enabled: boolean;
    time: string;
    days: number[];
  };
  aiReflectionEnabled?: boolean;
  aiApiEndpoint?: string;
  aiApiKey?: string;
  theme?: 'light' | 'dark' | 'auto';
}

/**
 * 1x1 red PNG image as a base64 string and Buffer for testing photo attachment flows.
 */
export const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const SAMPLE_PNG_DATA_URL = `data:image/png;base64,${SAMPLE_PNG_BASE64}`;

export const SAMPLE_PNG_BUFFER = Buffer.from(SAMPLE_PNG_BASE64, 'base64');

/**
 * Clears all Capacitor Preferences entries in localStorage on the next navigation or immediately.
 */
export async function clearCapacitorStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

/**
 * Seeds Capacitor Preferences (`CapacitorStorage.*`) in localStorage before navigating or reloading.
 */
export async function seedCapacitorStorage(
  page: Page,
  options: {
    entries?: SeedEntry[];
    settings?: SeedSettings;
  }
): Promise<void> {
  await page.evaluate(({ entries, settings }) => {
    localStorage.clear();

    if (settings) {
      const mergedSettings = {
        notifications: {
          enabled: false,
          time: '20:00',
          days: [0, 1, 2, 3, 4, 5, 6],
          ...(settings.notifications || {}),
        },
        aiReflectionEnabled: settings.aiReflectionEnabled ?? true,
        aiApiEndpoint: settings.aiApiEndpoint ?? '',
        aiApiKey: settings.aiApiKey ?? '',
        theme: settings.theme ?? 'auto',
      };
      localStorage.setItem('CapacitorStorage.app_settings', JSON.stringify(mergedSettings));
    }

    if (entries) {
      for (const entry of entries) {
        const stored = {
          ...entry,
          createdAt: entry.createdAt ?? entry.date,
          updatedAt: entry.updatedAt ?? entry.date,
        };
        localStorage.setItem(`CapacitorStorage.entry_${entry.id}`, JSON.stringify(stored));
      }
    }
  }, options);
}
