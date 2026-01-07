/**
 * Gemini Provider for API-based Compilation and Translation
 */

import type { LLMProvider, GenerateOptions } from './index.js';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly type = 'api' as const;
  readonly capabilities = ['compile', 'translate', 'edit'] as const;

  private endpoint: string;
  private apiKey: string;
  private defaultModel: string;

  constructor(
    apiKey?: string,
    defaultModel = 'gemini-2.0-flash',
    endpoint = 'https://generativelanguage.googleapis.com/v1beta',
  ) {
    this.apiKey = apiKey ?? process.env.GEMINI_API_KEY ?? '';
    this.endpoint = endpoint;
    this.defaultModel = defaultModel;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }
    try {
      const response = await fetch(`${this.endpoint}/models?key=${this.apiKey}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    if (!this.apiKey) {
      return [];
    }
    try {
      const response = await fetch(`${this.endpoint}/models?key=${this.apiKey}`);
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as {
        models: { name: string }[];
      };
      return data.models
        .map((m) => m.name.replace('models/', ''))
        .filter((m) => m.startsWith('gemini'));
    } catch {
      return [];
    }
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const model = options?.model ?? this.defaultModel;
    const url = `${this.endpoint}/models/${model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: options?.temperature ?? 0.1,
          maxOutputTokens: options?.maxTokens ?? 8192,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      candidates: { content: { parts: { text: string }[] } }[];
    };

    return data.candidates[0]?.content?.parts[0]?.text ?? '';
  }
}

export function createGeminiProvider(apiKey?: string, defaultModel?: string): GeminiProvider {
  return new GeminiProvider(apiKey, defaultModel);
}
