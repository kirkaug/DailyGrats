import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly NOTIFICATION_ID = 1;

  constructor(private settingsService: SettingsService) {}

  async initialize(): Promise<void> {
    const settings = await this.settingsService.getSettings();
    if (!settings.notifications.enabled) {
      return;
    }

    // Request permission
    const permission = await LocalNotifications.requestPermissions();
    if (permission.display === 'granted') {
      await this.scheduleNotifications();
    }
  }

  async scheduleNotifications(): Promise<void> {
    const settings = await this.settingsService.getSettings();

    // Always cancel existing notifications before scheduling new ones
    await this.cancelNotifications();

    if (!settings.notifications.enabled) {
      return;
    }

    const [hours, minutes] = settings.notifications.time.split(':').map(Number);
    const isNative = Capacitor.isNativePlatform();
    const now = new Date();

    // Schedule notifications for each enabled day
    const notifications = settings.notifications.days.map((day, index) => {
      // Capacitor's weekday is 1-7 (Sun-Sat), while our setting is 0-6
      const weekday = day + 1;

      return {
        id: this.NOTIFICATION_ID + index,
        title: 'Daily Gratitude Reminder',
        body: 'Take a moment to reflect on what you\'re grateful for today.',
        schedule: isNative
          ? {
              on: {
                weekday: weekday,
                hour: hours,
                minute: minutes,
              },
              repeats: true,
              allowWhileIdle: true,
            }
          : {
              at: this.getNextNotificationDate(day, hours, minutes, now),
            },
      };
    });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  }

  getNextNotificationDate(day: number, hours: number, minutes: number, now: Date = new Date()): Date {
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    let daysUntil = (day - now.getDay() + 7) % 7;
    if (daysUntil === 0 && next.getTime() <= now.getTime()) {
      daysUntil = 7;
    }

    next.setDate(next.getDate() + daysUntil);
    return next;
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
