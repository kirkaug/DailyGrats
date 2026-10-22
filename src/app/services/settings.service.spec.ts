import { SettingsService } from './settings.service';
import { StorageService } from './storage.service';

describe('SettingsService', () => {
  it('applies data-theme attribute on load and update', async () => {
    const mockStorage: Partial<StorageService> = {
      get: async () => null,
      set: async () => {}
    };

    const service = new SettingsService(mockStorage as StorageService);
    await service.updateSettings({ theme: 'dark' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    await service.updateSettings({ theme: 'light' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('getSettings returns a clone so mutating the returned object does not corrupt service state', async () => {
    const mockStorage: Partial<StorageService> = {
      get: async () => null,
      set: async () => {}
    };

    const service = new SettingsService(mockStorage as StorageService);
    const fetched = await service.getSettings();
    fetched.notifications.enabled = true;
    fetched.notifications.days.length = 0;

    const fresh = await service.getSettings();
    expect(fresh.notifications.enabled).toBe(false);
    expect(fresh.notifications.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
