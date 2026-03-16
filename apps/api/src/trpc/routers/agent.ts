// ---------------------------------------------------------------------------
// Agent Router — Model Management & Prompt Testing
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { AVAILABLE_MODELS, getModelById, getModelsByProvider } from '@toa/shared';
import { createRouter, orgProcedure, requirePermission } from '../trpc.js';

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const listModelsInput = z.object({
  provider: z.enum(['anthropic', 'openai', 'google', 'meta', 'mistral']).optional(),
  supportsTools: z.boolean().optional(),
  supportsVision: z.boolean().optional(),
});

const testPromptInput = z.object({
  model: z.string().min(1),
  systemPrompt: z.string().min(1).max(100_000),
  userMessage: z.string().min(1).max(50_000),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().max(100_000).default(4096),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const agentRouter = createRouter({
  // ── listModels — return available AI models ────────────────────────────
  listModels: orgProcedure
    .use(requirePermission('workflow', 'read'))
    .input(listModelsInput)
    .query(async ({ input }) => {
      let models = [...AVAILABLE_MODELS];

      if (input.provider) {
        models = models.filter((m) => m.provider === input.provider);
      }

      if (input.supportsTools !== undefined) {
        models = models.filter((m) => m.supportsTools === input.supportsTools);
      }

      if (input.supportsVision !== undefined) {
        models = models.filter((m) => m.supportsVision === input.supportsVision);
      }

      return models;
    }),

  // ── testPrompt — test a prompt against a model ────────────────────────
  testPrompt: orgProcedure
    .use(requirePermission('workflow', 'execute'))
    .input(testPromptInput)
    .mutation(async ({ ctx, input }) => {
      const model = getModelById(input.model);

      if (!model) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Unknown model: '${input.model}'. Use the listModels endpoint to see available models.`,
        });
      }

      // For Anthropic models, use the Anthropic SDK via the engine's runtime
      // For other providers, we would route to the appropriate SDK
      // Here we implement a provider-agnostic test that delegates to the engine

      if (model.provider === 'anthropic') {
        // Dynamic import to avoid hard dependency if SDK not configured
        try {
          const { default: Anthropic } = await import('@anthropic-ai/sdk');
          const client = new Anthropic();

          const startTime = Date.now();
          const response = await client.messages.create({
            model: input.model,
            max_tokens: input.maxTokens,
            temperature: input.temperature,
            system: input.systemPrompt,
            messages: [{ role: 'user', content: input.userMessage }],
          });

          const durationMs = Date.now() - startTime;

          const textContent = response.content
            .filter((block) => block.type === 'text')
            .map((block) => ('text' in block ? block.text : ''))
            .join('');

          return {
            output: textContent,
            model: input.model,
            provider: model.provider,
            tokenUsage: {
              promptTokens: response.usage.input_tokens,
              completionTokens: response.usage.output_tokens,
              totalTokens: response.usage.input_tokens + response.usage.output_tokens,
            },
            durationMs,
            stopReason: response.stop_reason,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to call Anthropic API: ${message}`,
          });
        }
      }

      // For non-Anthropic providers, return a helpful message
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Prompt testing for '${model.provider}' models is not yet implemented. Currently only Anthropic models are supported for prompt testing.`,
      });
    }),
});
