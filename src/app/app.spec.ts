import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { NotificationService } from './services/notification.service';
import { SettingsService } from './services/settings.service';
import { BehaviorSubject } from 'rxjs';
import { AppSettings } from './models/journal-entry.model';

const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    enabled: false,
    time: '20:00',
    days: [0, 1, 2, 3, 4, 5, 6]
  },
  aiReflectionEnabled: true,
  theme: 'auto'
};

describe('App', () => {
  let mockNotificationService: Partial<NotificationService>;
  let mockSettingsService: Partial<SettingsService>;

  beforeEach(async () => {
    mockNotificationService = {
      initialize: () => Promise.resolve(),
      scheduleNotifications: () => Promise.resolve(),
      cancelNotifications: () => Promise.resolve(),
      checkPermissions: () => Promise.resolve(true),
      requestPermissions: () => Promise.resolve(true),
    };

    mockSettingsService = {
      settings$: new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS),
      getSettings: () => Promise.resolve(DEFAULT_SETTINGS),
      updateSettings: (updates: Partial<AppSettings>) => Promise.resolve({ ...DEFAULT_SETTINGS, ...updates }),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: SettingsService, useValue: mockSettingsService },
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should not render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toBeUndefined();
  });
});
