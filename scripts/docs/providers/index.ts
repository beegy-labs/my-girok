/**
 * LLM Provider Interface for Documentation Compiler
 */

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  readonly name: string;
  readonly type: 'local' | 'api';
  readonly capabilities: ('compile' | 'translate' | 'edit')[];

  healthCheck(): Promise<boolean>;
  listModels(): Promise<string[]>;
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
}

export interface ProviderConfig {
  type: 'local' | 'api';
  capabilities: string[];
  endpoint: string;
  apiKeyEnv?: string;
  models: string[];
  defaultModel: string;
}

// Provider registry
const providers = new Map<string, LLMProvider>();

export function registerProvider(name: string, provider: LLMProvider): void {
  providers.set(name, provider);
}

export function getProvider(name: string): LLMProvider | undefined {
  return providers.get(name);
}

export function getAvailableProviders(): string[] {
  return Array.from(providers.keys());
}

export function getProvidersWithCapability(
  capability: 'compile' | 'translate' | 'edit',
): LLMProvider[] {
  return Array.from(providers.values()).filter((p) => p.capabilities.includes(capability));
}
