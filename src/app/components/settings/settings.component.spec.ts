import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { SettingsComponent } from './settings.component';
import { JournalService } from '../../services/journal.service';
import { SettingsService } from '../../services/settings.service';
import { NotificationService } from '../../services/notification.service';
import { AppSettings, JournalEntry } from '../../models/journal-entry.model';

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

describe('SettingsComponent', () => {
  it('uses native share sheet when exporting on a native platform', async () => {
    const mockEntries: JournalEntry[] = [
      {
        id: 'native1',
        date: new Date('2026-10-22T10:00:00Z'),
        content: 'Native export test',
        createdAt: new Date('2026-10-22T10:00:00Z'),
        updatedAt: new Date('2026-10-22T10:00:00Z')
      }
    ];

    const mockJournalService: Partial<JournalService> = {
      getEntries: async () => mockEntries,
      exportEntries: async () => JSON.stringify({ version: 1, entries: mockEntries })
    };

    const mockSettingsService: Partial<SettingsService> = {
      getSettings: async () => DEFAULT_SETTINGS
    };

    const mockNotificationService: Partial<NotificationService> = {
      checkPermissions: async () => true
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: JournalService, useValue: mockJournalService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;

    const origIsNative = Capacitor.isNativePlatform;
    const origShare = navigator.share;
    const origCanShare = navigator.canShare;
    let sharedPayload: ShareData | undefined;

    try {
      Capacitor.isNativePlatform = () => true;
      Object.defineProperty(navigator, 'canShare', {
        configurable: true,
        value: () => true
      });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (data: ShareData) => {
          sharedPayload = data;
        }
      });

      await component.exportEntries();

      expect(sharedPayload).toBeDefined();
      expect(sharedPayload?.files?.length).toBe(1);
      expect(sharedPayload?.files?.[0].name).toMatch(/^dailygrats-entries-\d{4}-\d{2}-\d{2}\.json$/);
      expect(component.importExportError).toBe(false);
      expect(component.importExportMessage).toBe('Exported 1 entry successfully.');
    } finally {
      Capacitor.isNativePlatform = origIsNative;
      Object.defineProperty(navigator, 'share', { configurable: true, value: origShare });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: origCanShare });
    }
  });

  it('debounces AI config input and does not reschedule notifications on non-notification updates', async () => {
    let updateSettingsCount = 0;
    let scheduleCount = 0;
    let cancelCount = 0;

    const mockSettingsService: Partial<SettingsService> = {
      getSettings: async () => structuredClone(DEFAULT_SETTINGS),
      updateSettings: async (updates: Partial<AppSettings>) => {
        updateSettingsCount++;
        return { ...DEFAULT_SETTINGS, ...updates };
      }
    };

    const mockNotificationService: Partial<NotificationService> = {
      checkPermissions: async () => true,
      scheduleNotifications: async () => {
        scheduleCount++;
      },
      cancelNotifications: async () => {
        cancelCount++;
      }
    };

    await TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: JournalService, useValue: {} },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();

    component.settings.aiApiKey = 'k';
    component.onAiConfigInput();
    component.settings.aiApiKey = 'ke';
    component.onAiConfigInput();
    component.settings.aiApiKey = 'key-123';
    component.onAiConfigInput();

    expect(updateSettingsCount).toBe(0);

    await component.updateAiConfig();
    expect(updateSettingsCount).toBe(1);
    expect(scheduleCount).toBe(0);
    expect(cancelCount).toBe(0);

    await component.updateTheme('dark');
    expect(updateSettingsCount).toBe(2);
    expect(scheduleCount).toBe(0);
    expect(cancelCount).toBe(0);
  });
});
