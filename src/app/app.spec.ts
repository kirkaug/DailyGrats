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
});
