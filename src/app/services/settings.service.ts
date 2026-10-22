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
  aiApiEndpoint: '',
  aiApiKey: '',
  theme: 'auto'
};

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settingsSubject = new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS);
  public settings$: Observable<AppSettings> = this.settingsSubject.asObservable();
  private initializedPromise: Promise<void>;
  private mediaQuery?: MediaQueryList;

  constructor(private storageService: StorageService) {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener?.('change', () => {
        if (this.settingsSubject.value.theme === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
    this.initializedPromise = this.loadSettings();
  }

  private async loadSettings(): Promise<void> {
    const settings = await this.storageService.get<AppSettings>(SETTINGS_KEY);
    if (settings) {
      const merged = this.cloneSettings({
        ...DEFAULT_SETTINGS,
        ...settings,
        notifications: {
          ...DEFAULT_SETTINGS.notifications,
          ...(settings.notifications || {})
        }
      });
      this.settingsSubject.next(merged);
      this.applyTheme(merged.theme);
    } else {
      // Save default settings
      const defaults = this.cloneSettings(DEFAULT_SETTINGS);
      await this.saveSettings(defaults);
      this.applyTheme(defaults.theme);
    }
  }

  async getSettings(): Promise<AppSettings> {
    await this.initializedPromise;
    return this.cloneSettings(this.settingsSubject.value);
  }

  async updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    await this.initializedPromise;
    const currentSettings = this.settingsSubject.value;
    const newSettings = this.cloneSettings({
      ...currentSettings,
      ...updates,
      notifications: {
        ...currentSettings.notifications,
        ...(updates.notifications || {})
      }
    });

    await this.saveSettings(newSettings);
    this.applyTheme(newSettings.theme);
    return this.cloneSettings(newSettings);
  }

  applyTheme(theme: 'light' | 'dark' | 'auto'): void {
    if (typeof document === 'undefined') {
      return;
    }
    const prefersDark = this.mediaQuery?.matches ?? false;
    const effectiveTheme = theme === 'auto' ? (prefersDark ? 'dark' : 'light') : theme;
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }

  private async saveSettings(settings: AppSettings): Promise<void> {
    const cloned = this.cloneSettings(settings);
    await this.storageService.set(SETTINGS_KEY, cloned);
    this.settingsSubject.next(cloned);
  }

  private cloneSettings(settings: AppSettings): AppSettings {
    return {
      ...settings,
      notifications: {
        ...settings.notifications,
        days: [...(settings.notifications?.days ?? DEFAULT_SETTINGS.notifications.days)]
      }
    };
  }
}
