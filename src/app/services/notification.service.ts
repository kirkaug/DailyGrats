import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly NOTIFICATION_ID = 1;

  constructor(private settingsService: SettingsService) {}

  async initialize(): Promise<void> {
    // Request permission
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display === 'granted') {
      await this.scheduleNotifications();
    }
  }

  async scheduleNotifications(): Promise<void> {
    const settings = await this.settingsService.getSettings();

    if (!settings.notifications.enabled) {
      await this.cancelNotifications();
      return;
    }

    // Cancel existing notifications
    await this.cancelNotifications();

    const [hours, minutes] = settings.notifications.time.split(':').map(Number);

    // Schedule notifications for each enabled day
    const notifications = settings.notifications.days.map((day, index) => {
      const schedule = new Date();
      schedule.setHours(hours, minutes, 0, 0);

      // If the time has passed today, start from tomorrow
      if (schedule <= new Date()) {
        schedule.setDate(schedule.getDate() + 1);
      }

      // Adjust to the correct day of the week
      while (schedule.getDay() !== day) {
        schedule.setDate(schedule.getDate() + 1);
      }

      return {
        id: this.NOTIFICATION_ID + index,
        title: 'Daily Gratitude Reminder',
        body: 'Take a moment to reflect on what you\'re grateful for today.',
        schedule: {
          on: {
            hour: hours,
            minute: minutes
          },
          repeats: true,
          allowWhileIdle: true
        }
      };
    });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  async cancelNotifications(): Promise<void> {
    try {
      // Get all pending notifications
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        const ids = pending.notifications.map(n => ({ id: n.id }));
        await LocalNotifications.cancel({ notifications: ids });
      }
    } catch (error) {
      console.error('Error canceling notifications:', error);
    }
  }

  async checkPermissions(): Promise<boolean> {
    const permission = await LocalNotifications.checkPermissions();
    return permission.display === 'granted';
  }

  async requestPermissions(): Promise<boolean> {
    const permission = await LocalNotifications.requestPermissions();
    return permission.display === 'granted';
  }
}
