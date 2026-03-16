// ---------------------------------------------------------------------------
// Available AI Models — Updated March 2026
// ---------------------------------------------------------------------------

export interface ModelDefinition {
  /** Unique identifier sent to the provider's API. */
  id: string;
  /** Human-friendly display name. */
  name: string;
  /** Provider / vendor. */
  provider: 'anthropic' | 'openai' | 'google' | 'meta' | 'mistral' | 'deepseek' | 'xai';
  /** Maximum input context window in tokens. */
  contextWindow: number;
  /** Maximum output tokens the model can produce. */
  maxOutput: number;
  /** Whether this model supports tool / function calling. */
  supportsTools: boolean;
  /** Whether this model supports vision / image input. */
  supportsVision: boolean;
}

export const AVAILABLE_MODELS: ModelDefinition[] = [
  // ── Anthropic ─────────────────────────────────────────────────────────────
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'anthropic',
    contextWindow: 1_000_000,
    maxOutput: 128_000,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
  },

  // ── OpenAI ────────────────────────────────────────────────────────────────
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4',
    provider: 'openai',
    contextWindow: 1_050_000,
    maxOutput: 128_000,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'gpt-5-mini-2025-08-07',
    name: 'GPT-5 Mini',
    provider: 'openai',
    contextWindow: 400_000,
    maxOutput: 128_000,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    contextWindow: 200_000,
    maxOutput: 100_000,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'o4-mini',
    name: 'o4-mini',
    provider: 'openai',
    contextWindow: 200_000,
    maxOutput: 100_000,
    supportsTools: true,
    supportsVision: true,
  },

  // ── Google ────────────────────────────────────────────────────────────────
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'google',
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'google',
    contextWindow: 1_000_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    contextWindow: 1_000_000,
    maxOutput: 65_536,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    contextWindow: 1_000_000,
    maxOutput: 65_536,
    supportsTools: true,
    supportsVision: true,
  },

  // ── Meta ──────────────────────────────────────────────────────────────────
  {
    id: 'llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'meta',
    contextWindow: 1_000_000,
    maxOutput: 16_384,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'llama-4-scout',
    name: 'Llama 4 Scout',
    provider: 'meta',
    contextWindow: 10_000_000,
    maxOutput: 16_384,
    supportsTools: true,
    supportsVision: true,
  },

  // ── DeepSeek ──────────────────────────────────────────────────────────────
  {
    id: 'deepseek-chat',
    name: 'DeepSeek V3.2',
    provider: 'deepseek',
    contextWindow: 128_000,
    maxOutput: 8_192,
    supportsTools: true,
    supportsVision: false,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    contextWindow: 128_000,
    maxOutput: 64_000,
    supportsTools: true,
    supportsVision: false,
  },

  // ── xAI ───────────────────────────────────────────────────────────────────
  {
    id: 'grok-4.20-beta-0309-reasoning',
    name: 'Grok 4.20',
    provider: 'xai',
    contextWindow: 2_000_000,
    maxOutput: 128_000,
    supportsTools: true,
    supportsVision: true,
  },

  // ── Mistral ───────────────────────────────────────────────────────────────
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    provider: 'mistral',
    contextWindow: 128_000,
    maxOutput: 16_000,
    supportsTools: true,
    supportsVision: false,
  },
  {
    id: 'open-mistral-nemo-2407',
    name: 'Mistral NeMo',
    provider: 'mistral',
    contextWindow: 128_000,
    maxOutput: 16_000,
    supportsTools: true,
    supportsVision: false,
  },
] as const;

/** Look up a model by its ID. */
export function getModelById(id: string): ModelDefinition | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id);
}

/** Return models for a given provider. */
export function getModelsByProvider(
  provider: ModelDefinition['provider'],
): ModelDefinition[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === provider);
}

/** Default model used when creating a new agent node. */
export const DEFAULT_MODEL_ID = 'claude-sonnet-4-6';
