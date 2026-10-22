import { NotificationService } from './notification.service';
import { SettingsService } from './settings.service';
import { AppSettings } from '../models/journal-entry.model';

const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    enabled: false,
    time: '20:00',
    days: [0, 1, 2, 3, 4, 5, 6]
  },
  aiReflectionEnabled: true,
  aiApiEndpoint: '',
  aiApiKey: '',
  theme: 'auto'
};

describe('NotificationService', () => {
  it('computes future notification dates on web so notifications do not fire immediately on page load', async () => {
    const mockSettingsService: Partial<SettingsService> = {
      getSettings: async () => DEFAULT_SETTINGS
    };
    const notificationService = new NotificationService(mockSettingsService as SettingsService);

    // Thursday Oct 22, 2026 at 15:41 local time (getDay() === 4)
    const now = new Date(2026, 9, 22, 15, 41, 0, 0);

    for (let day = 0; day <= 6; day++) {
      // Case A: time earlier in the day (08:00) -> today's notification should be scheduled 7 days ahead
      const nextMorning = notificationService.getNextNotificationDate(day, 8, 0, now);
      expect(nextMorning.getTime()).toBeGreaterThan(now.getTime());
      expect(nextMorning.getDay()).toBe(day);
      expect(nextMorning.getHours()).toBe(8);
      expect(nextMorning.getMinutes()).toBe(0);

      // Case B: time later in the day (20:00) -> today's notification should be scheduled later today
      const nextEvening = notificationService.getNextNotificationDate(day, 20, 0, now);
      expect(nextEvening.getTime()).toBeGreaterThan(now.getTime());
      expect(nextEvening.getDay()).toBe(day);
      expect(nextEvening.getHours()).toBe(20);
      expect(nextEvening.getMinutes()).toBe(0);
    }
  });
});
