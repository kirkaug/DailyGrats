import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AiReflectionService {
  // This can be configured to use different AI services
  // For now, we'll create a structure that can work with various APIs
  private apiEndpoint = ''; // To be configured by user
  private apiKey = ''; // To be configured by user

  constructor(private http: HttpClient) {}

  setApiConfig(endpoint: string, apiKey: string): void {
    this.apiEndpoint = endpoint;
    this.apiKey = apiKey;
  }

  async generateReflection(content: string): Promise<string> {
    if (!this.apiEndpoint || !this.apiKey) {
      // Return a mock reflection if API is not configured
      return this.generateMockReflection(content);
    }

    try {
      const response = await firstValueFrom(
        this.http.post<{ reflection: string }>(
          this.apiEndpoint,
          {
            prompt: this.buildPrompt(content),
            max_tokens: 200
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        )
      );

      return response.reflection;
    } catch (error) {
      console.error('Error generating AI reflection:', error);
      throw new Error('Failed to generate AI reflection. Please check your API configuration.');
    }
  }

  private buildPrompt(content: string): string {
    return `As a thoughtful companion, provide a brief, encouraging reflection on this gratitude entry.
Keep your response to 2-3 sentences, acknowledging what they shared and offering a gentle insight or affirmation.

Entry: "${content}"

Reflection:`;
  }

  private generateMockReflection(content: string): string {
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
    return !!this.apiEndpoint && !!this.apiKey;
  }
}
