// ---------------------------------------------------------------------------
// Available AI Models
// ---------------------------------------------------------------------------

export interface ModelDefinition {
  /** Unique identifier sent to the provider's API. */
  id: string;
  /** Human-friendly display name. */
  name: string;
  /** Provider / vendor. */
  provider: 'anthropic' | 'openai' | 'google' | 'meta' | 'mistral';
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
  // ---- Anthropic ---------------------------------------------------------
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutput: 16_384,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutput: 32_000,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'claude-haiku-4-20250514',
    name: 'Claude Haiku 4',
    provider: 'anthropic',
    contextWindow: 200_000,
    maxOutput: 16_384,
    supportsTools: true,
    supportsVision: true,
  },

  // ---- OpenAI ------------------------------------------------------------
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 16_384,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128_000,
    maxOutput: 16_384,
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
    id: 'o3-mini',
    name: 'o3-mini',
    provider: 'openai',
    contextWindow: 200_000,
    maxOutput: 100_000,
    supportsTools: true,
    supportsVision: false,
  },

  // ---- Google ------------------------------------------------------------
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

  // ---- Meta --------------------------------------------------------------
  {
    id: 'llama-4-maverick',
    name: 'Llama 4 Maverick',
    provider: 'meta',
    contextWindow: 1_000_000,
    maxOutput: 16_384,
    supportsTools: true,
    supportsVision: true,
  },

  // ---- Mistral -----------------------------------------------------------
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    provider: 'mistral',
    contextWindow: 128_000,
    maxOutput: 8_192,
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
export const DEFAULT_MODEL_ID = 'claude-sonnet-4-20250514';
