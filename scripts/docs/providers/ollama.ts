/**
 * Ollama Provider for Local LLM Translation
 */

import type { LLMProvider, GenerateOptions } from './index.js';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  readonly type = 'local' as const;
  readonly capabilities = ['translate'] as const;

  private endpoint: string;
  private defaultModel: string;

  constructor(endpoint = 'http://localhost:11434', defaultModel = 'gpt-oss:20b') {
    this.endpoint = endpoint;
    this.defaultModel = defaultModel;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as { models: { name: string }[] };
      return data.models.map((m) => m.name);
    } catch {
      return [];
    }
  }

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = options?.model ?? this.defaultModel;

    const response = await fetch(`${this.endpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.1,
          num_predict: options?.maxTokens ?? 16384,
          num_ctx: 32768,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = (await response.json()) as { response: string };
    return data.response;
  }
}

export function createOllamaProvider(endpoint?: string, defaultModel?: string): OllamaProvider {
  return new OllamaProvider(endpoint, defaultModel);
}
