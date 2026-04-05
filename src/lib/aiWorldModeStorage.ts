/**
 * User-provided LLM config for AI world simulation (BYOK).
 * Stored in localStorage only — never in compressed game saves.
 */

export const AI_WORLD_STORAGE_KEY = 'isocity-ai-world-mode';

export type AiWorldApiConfig = {
  /** OpenAI-compatible base, e.g. https://api.openai.com/v1 */
  baseUrl: string;
  model: string;
  apiKey: string;
};

export type AiWorldPersisted = {
  simulationEnabled: boolean;
  config: AiWorldApiConfig | null;
};

export const DEFAULT_AI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_AI_MODEL = 'gpt-4o-mini';

export function loadAiWorldPersisted(): AiWorldPersisted {
  if (typeof window === 'undefined') {
    return { simulationEnabled: false, config: null };
  }
  try {
    const raw = localStorage.getItem(AI_WORLD_STORAGE_KEY);
    if (!raw) return { simulationEnabled: false, config: null };
    const parsed = JSON.parse(raw) as Partial<AiWorldPersisted>;
    if (!parsed || typeof parsed !== 'object') {
      return { simulationEnabled: false, config: null };
    }
    const config =
      parsed.config &&
      typeof parsed.config.baseUrl === 'string' &&
      typeof parsed.config.model === 'string' &&
      typeof parsed.config.apiKey === 'string'
        ? {
            baseUrl: parsed.config.baseUrl.trim() || DEFAULT_AI_BASE_URL,
            model: parsed.config.model.trim() || DEFAULT_AI_MODEL,
            apiKey: parsed.config.apiKey,
          }
        : null;
    return {
      simulationEnabled: Boolean(parsed.simulationEnabled) && Boolean(config?.apiKey),
      config,
    };
  } catch {
    return { simulationEnabled: false, config: null };
  }
}

export function saveAiWorldPersisted(data: AiWorldPersisted): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AI_WORLD_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save AI world settings:', e);
  }
}
