import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { AiReflectionService } from './ai-reflection.service';
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

describe('AiReflectionService', () => {
  it('syncs API config from SettingsService', async () => {
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

  it('sends Gemini API key via x-goog-api-key header instead of URL query string', async () => {
    let capturedUrl = '';
    let capturedHeaders: Record<string, string> | undefined;

    const mockHttp: Partial<HttpClient> = {
      post: ((url: string, _body: unknown, options?: { headers?: Record<string, string> }) => {
        capturedUrl = url;
        capturedHeaders = options?.headers;
        return of({
          candidates: [{ content: { parts: [{ text: 'Header-authenticated reflection' }] } }]
        });
      }) as HttpClient['post']
    };

    const settingsWithKey: AppSettings = {
      ...DEFAULT_SETTINGS,
      aiApiEndpoint:
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
      aiApiKey: 'secret-gemini-key'
    };

    const mockSettingsService: Partial<SettingsService> = {
      settings$: new BehaviorSubject<AppSettings>(settingsWithKey),
      getSettings: async () => settingsWithKey
    };

    const aiService = new AiReflectionService(
      mockHttp as HttpClient,
      mockSettingsService as SettingsService
    );

    const reflection = await aiService.generateReflection('Grateful for security');
    expect(reflection).toBe('Header-authenticated reflection');
    expect(capturedUrl).not.toContain('key=');
    expect(capturedHeaders?.['x-goog-api-key']).toBe('secret-gemini-key');
  });
});
