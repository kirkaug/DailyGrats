import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AppSettings } from '../models/journal-entry.model';
import { StorageService } from './storage.service';

const SETTINGS_KEY = 'app_settings';

const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    enabled: false,
    time: '20:00',
    days: [0, 1, 2, 3, 4, 5, 6] // All days
  },
  aiReflectionEnabled: true,
  theme: 'auto'
};

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settingsSubject = new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS);
  public settings$: Observable<AppSettings> = this.settingsSubject.asObservable();

  constructor(private storageService: StorageService) {
    this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    const settings = await this.storageService.get<AppSettings>(SETTINGS_KEY);
    if (settings) {
      this.settingsSubject.next(settings);
    } else {
      // Save default settings
      await this.saveSettings(DEFAULT_SETTINGS);
    }
  }

  async getSettings(): Promise<AppSettings> {
    return this.settingsSubject.value;
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    const currentSettings = this.settingsSubject.value;
    const newSettings = {
      ...currentSettings,
      ...updates,
      notifications: {
        ...currentSettings.notifications,
        ...(updates.notifications || {})
      }
    };

    await this.saveSettings(newSettings);
    return newSettings;
  }

  private async saveSettings(settings: AppSettings): Promise<void> {
    await this.storageService.set(SETTINGS_KEY, settings);
    this.settingsSubject.next(settings);
  }
}
