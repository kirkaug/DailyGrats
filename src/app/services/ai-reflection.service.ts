import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SettingsService } from './settings.service';

export const DEFAULT_GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

@Injectable({
  providedIn: 'root'
})
export class AiReflectionService {
  private apiEndpoint = '';
  private apiKey = '';

  constructor(
    private http: HttpClient,
    private settingsService: SettingsService
  ) {
    this.settingsService.settings$.subscribe(settings => {
      if (settings.aiApiEndpoint !== undefined) {
        this.apiEndpoint = settings.aiApiEndpoint.trim();
      }
      if (settings.aiApiKey !== undefined) {
        this.apiKey = settings.aiApiKey.trim();
      }
    });
  }

  setApiConfig(endpoint: string, apiKey: string): void {
    this.apiEndpoint = endpoint.trim();
    this.apiKey = apiKey.trim();
  }

  async generateReflection(content: string): Promise<string> {
    const settings = await this.settingsService.getSettings();
    const apiKey = this.apiKey || settings.aiApiKey?.trim() || '';
    let endpoint =
      this.apiEndpoint ||
      settings.aiApiEndpoint?.trim() ||
      (apiKey ? DEFAULT_GEMINI_ENDPOINT : '');

    if (!endpoint || !apiKey) {
      // Return a mock reflection if API is not configured
      return this.generateMockReflection(content);
    }

    // Automatically upgrade retired gemini-2.5-flash model URLs to gemini-3.5-flash
    if (endpoint.includes('models/gemini-2.5-flash')) {
      endpoint = endpoint.replace('models/gemini-2.5-flash', 'models/gemini-3.5-flash');
    }

    const prompt = this.buildPrompt(content);

    try {
      if (this.isGeminiEndpoint(endpoint)) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (!endpoint.includes('key=')) {
          headers['x-goog-api-key'] = apiKey;
        }

        const response = await firstValueFrom(
          this.http.post<{
            candidates?: Array<{
              content?: { parts?: Array<{ text?: string; thought?: boolean }> };
            }>;
          }>(
            endpoint,
            {
              contents: [{ parts: [{ text: prompt }] }]
            },
            { headers }
          )
        );

        const parts = response.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find(p => !p.thought && p.text) || parts[0];
        const text = textPart?.text?.trim();
        if (!text) {
          throw new Error('Empty response from Gemini API.');
        }
        return text;
      }

      const response = await firstValueFrom(
        this.http.post<{
          reflection?: string;
          choices?: Array<{ message?: { content?: string } }>;
        }>(
          endpoint,
          {
            prompt,
            max_tokens: 200
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        )
      );

      return (
        response.reflection ||
        response.choices?.[0]?.message?.content?.trim() ||
        this.generateMockReflection(content)
      );
    } catch (error) {
      console.error('Error generating AI reflection:', error);
      throw new Error('Failed to generate AI reflection. Please check your API configuration.');
    }
  }

  private isGeminiEndpoint(endpoint: string): boolean {
    return (
      endpoint.includes('generativelanguage.googleapis.com') ||
      endpoint.includes(':generateContent')
    );
  }

  private buildPrompt(content: string): string {
    return `As a thoughtful companion, provide a brief, encouraging reflection on this gratitude entry.
Keep your response to 2-3 sentences, acknowledging what they shared and offering a gentle insight or affirmation.

Entry: "${content}"

Reflection:`;
  }

  generateMockReflection(content: string): string {
    // Generate a simple reflection based on content analysis
    const reflections = [
      "It's wonderful that you're taking time to recognize these positive moments. Gratitude has a way of multiplying when we acknowledge it.",
      "What a beautiful observation. The simple act of noticing these things can shift our perspective in profound ways.",
      "Thank you for sharing this. Recognizing what we're grateful for helps us stay grounded in the present moment.",
      "This is a lovely reminder that joy often comes from the everyday moments we might otherwise overlook.",
      "Your awareness of these blessings is inspiring. Cultivating gratitude is one of the most powerful practices we can develop."
    ];

    // Simple content-based selection
    const hash = content.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return reflections[hash % reflections.length];
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }
}
