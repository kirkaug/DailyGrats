import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { EntryDetailComponent } from './entry-detail.component';
import { JournalService } from '../../services/journal.service';
import { PhotoService } from '../../services/photo.service';
import { AiReflectionService } from '../../services/ai-reflection.service';
import { SettingsService } from '../../services/settings.service';
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

describe('EntryDetailComponent', () => {
  it('generates and saves AI reflection on a new entry', async () => {
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

  it('populates textarea DOM value and sets accessible labels on icon buttons when editing an existing entry', async () => {
    const existingEntry: JournalEntry = {
      id: 'existing1',
      date: new Date(),
      content: 'Existing gratitude content in textarea',
      photoUrl: 'data:image/png;base64,abc',
      aiReflection: 'Existing reflection',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockJournalService: Partial<JournalService> = {
      getEntryById: async (id: string) =>
        new Promise(resolve =>
          setTimeout(() => resolve(id === 'existing1' ? existingEntry : undefined), 20)
        )
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

    const backBtn = fixture.nativeElement.querySelector('.back-btn') as HTMLButtonElement;
    const deleteBtn = fixture.nativeElement.querySelector('.delete-btn') as HTMLButtonElement;
    const removePhotoBtn = fixture.nativeElement.querySelector(
      '.remove-photo-btn'
    ) as HTMLButtonElement;

    expect(backBtn.getAttribute('aria-label')).toBe('Back to entries');
    expect(deleteBtn.getAttribute('aria-label')).toBe('Delete entry');
    expect(removePhotoBtn.getAttribute('aria-label')).toBe('Remove photo');
  });
});
