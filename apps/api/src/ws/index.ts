// ---------------------------------------------------------------------------
// WebSocket Handler Registration
// ---------------------------------------------------------------------------

import type { FastifyInstance } from 'fastify';
import { registerExecutionFeed } from './execution-feed';

/**
 * Register all WebSocket route handlers on the Fastify instance.
 */
export async function registerWebSocketHandlers(
  app: FastifyInstance,
): Promise<void> {
  await registerExecutionFeed(app);

  app.log.info('WebSocket handlers registered');
}
