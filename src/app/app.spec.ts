import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { App } from './app';
import { NotificationService } from './services/notification.service';
import { SettingsService } from './services/settings.service';
import { StorageService } from './services/storage.service';
import { JournalService } from './services/journal.service';
import { AiReflectionService } from './services/ai-reflection.service';
import { PhotoService } from './services/photo.service';
import { EntryDetailComponent } from './components/entry-detail/entry-detail.component';
import { AppSettings, JournalEntry } from './models/journal-entry.model';

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
      applyTheme: () => {},
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

describe('Fixes 1-4 Verification', () => {
  it('Fix 1: JournalService.getEntryById awaits initial async storage load', async () => {
    const storedEntry: JournalEntry = {
      id: 'abc123',
      date: new Date('2026-10-22T10:00:00Z'),
      content: 'Grateful for morning coffee',
      createdAt: new Date('2026-10-22T10:00:00Z'),
      updatedAt: new Date('2026-10-22T10:00:00Z')
    };

    const mockStorage: Partial<StorageService> = {
      keys: () => new Promise(resolve => setTimeout(() => resolve(['entry_abc123']), 25)),
      get: async <T>(key: string) => (key === 'entry_abc123' ? (storedEntry as unknown as T) : null),
      set: async () => {},
      remove: async () => {}
    };

    const service = new JournalService(mockStorage as StorageService);
    const found = await service.getEntryById('abc123');
    expect(found).toBeDefined();
    expect(found?.content).toBe('Grateful for morning coffee');
  });

  it('Fix 2: SettingsService applies data-theme attribute on load and update', async () => {
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

  it('Fix 3: AiReflectionService syncs API config from SettingsService', async () => {
    const settingsSubject = new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS);
    const mockSettingsService: Partial<SettingsService> = {
      settings$: settingsSubject.asObservable(),
      getSettings: async () => settingsSubject.value
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        AiReflectionService,
        { provide: SettingsService, useValue: mockSettingsService }
      ]
    });

    const aiService = TestBed.inject(AiReflectionService);
    expect(aiService.isConfigured()).toBe(false);

    settingsSubject.next({
      ...DEFAULT_SETTINGS,
      aiApiEndpoint: 'https://api.example.com/reflect',
      aiApiKey: 'secret-token'
    });

    expect(aiService.isConfigured()).toBe(true);
  });

  it('Fix 4: EntryDetailComponent generates and saves AI reflection on a new entry', async () => {
    let createdArgs: { content: string; photoUrl?: string; aiReflection?: string } | undefined;

    const mockJournalService: Partial<JournalService> = {
      createEntry: async (content: string, photoUrl?: string, aiReflection?: string) => {
        createdArgs = { content, photoUrl, aiReflection };
        return {
          id: 'new1',
          date: new Date(),
          content,
          photoUrl,
          aiReflection,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    };

    const mockSettingsService: Partial<SettingsService> = {
      settings$: new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS),
      getSettings: async () => DEFAULT_SETTINGS
    };

    const mockAiService: Partial<AiReflectionService> = {
      generateReflection: async () => 'Mock encouraging reflection',
      generateMockReflection: () => 'Mock encouraging reflection'
    };

    await TestBed.configureTestingModule({
      imports: [EntryDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'new' } } }
        },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: JournalService, useValue: mockJournalService },
        { provide: PhotoService, useValue: {} },
        { provide: AiReflectionService, useValue: mockAiService },
        { provide: SettingsService, useValue: mockSettingsService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(EntryDetailComponent);
    const component = fixture.componentInstance;
    await component.ngOnInit();

    expect(component.isNew).toBe(true);
    component.content = 'Grateful for family and sunshine';

    await component.generateReflection();
    expect(component.aiReflection).toBe('Mock encouraging reflection');

    await component.save();
    expect(createdArgs).toEqual({
      content: 'Grateful for family and sunshine',
      photoUrl: undefined,
      aiReflection: 'Mock encouraging reflection'
    });
  });

  it('Populates textarea DOM value when editing an existing entry', async () => {
    const existingEntry: JournalEntry = {
      id: 'existing1',
      date: new Date(),
      content: 'Existing gratitude content in textarea',
      aiReflection: 'Existing reflection',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockJournalService: Partial<JournalService> = {
      getEntryById: async (id: string) =>
        new Promise(resolve => setTimeout(() => resolve(id === 'existing1' ? existingEntry : undefined), 20))
    };

    const mockSettingsService: Partial<SettingsService> = {
      settings$: new BehaviorSubject<AppSettings>(DEFAULT_SETTINGS),
      getSettings: async () =>
        new Promise(resolve => setTimeout(() => resolve(DEFAULT_SETTINGS), 10))
    };

    await TestBed.configureTestingModule({
      imports: [EntryDetailComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'existing1' } } }
        },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: JournalService, useValue: mockJournalService },
        { provide: PhotoService, useValue: {} },
        { provide: AiReflectionService, useValue: {} },
        { provide: SettingsService, useValue: mockSettingsService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(EntryDetailComponent);
    fixture.detectChanges();

    await new Promise(resolve => setTimeout(resolve, 50));
    await fixture.whenStable();

    const textarea = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Existing gratitude content in textarea');
  });

  it('Exports entries to JSON and merges imported entries (updating matching IDs, adding new ones)', async () => {
    const store = new Map<string, unknown>();
    const initialEntry: JournalEntry = {
      id: 'entry1',
      date: new Date('2026-10-20T10:00:00Z'),
      content: 'Original content',
      aiReflection: 'Original reflection',
      createdAt: new Date('2026-10-20T10:00:00Z'),
      updatedAt: new Date('2026-10-20T10:00:00Z')
    };
    store.set('entry_entry1', initialEntry);

    const mockStorage: Partial<StorageService> = {
      keys: async () => Array.from(store.keys()),
      get: async <T>(key: string) => (store.get(key) as T) ?? null,
      set: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      remove: async (key: string) => {
        store.delete(key);
      }
    };

    const service = new JournalService(mockStorage as StorageService);
    const exportedJson = await service.exportEntries();
    const parsedExport = JSON.parse(exportedJson);
    expect(parsedExport.version).toBe(1);
    expect(parsedExport.entries.length).toBe(1);
    expect(parsedExport.entries[0].id).toBe('entry1');

    const importPayload = JSON.stringify({
      version: 1,
      exportedAt: '2026-10-22T12:00:00Z',
      entries: [
        {
          id: 'entry1',
          date: '2026-10-20T10:00:00Z',
          content: 'Updated content from import',
          aiReflection: 'Updated reflection',
          createdAt: '2026-10-20T10:00:00Z',
          updatedAt: '2026-10-22T12:00:00Z'
        },
        {
          id: 'entry2',
          date: '2026-10-21T10:00:00Z',
          content: 'Brand new imported entry',
          photoUrl: 'data:image/jpeg;base64,abc',
          createdAt: '2026-10-21T10:00:00Z',
          updatedAt: '2026-10-21T10:00:00Z'
        }
      ]
    });

    const result = await service.importEntries(importPayload);
    expect(result).toEqual({ added: 1, updated: 1 });

    const allEntries = await service.getEntries();
    expect(allEntries.length).toBe(2);
    expect(allEntries[0].id).toBe('entry2');
    expect(allEntries[0].photoUrl).toBe('data:image/jpeg;base64,abc');
    expect(allEntries[1].id).toBe('entry1');
    expect(allEntries[1].content).toBe('Updated content from import');

    const clearedCount = await service.clearEntries();
    expect(clearedCount).toBe(2);
    expect((await service.getEntries()).length).toBe(0);
    expect(store.size).toBe(0);
  });

  it('Computes future notification dates on web so notifications do not fire immediately on page load', async () => {
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
