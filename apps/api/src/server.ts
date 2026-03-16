// ---------------------------------------------------------------------------
// Fastify Server Factory
// ---------------------------------------------------------------------------

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { registerTrpcRoutes } from './trpc/router.js';
import { registerInngestHandler } from './inngest/serve.js';
import { registerWebSocketHandlers } from './ws/index.js';

export interface ServerOptions {
  logger?: boolean;
}

/**
 * Creates and configures a Fastify server instance without starting it.
 * Useful for testing and for the main entry point to control startup separately.
 */
export async function createServer(
  opts: ServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? true,
    maxParamLength: 300,
  });

  // ── CORS ────────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-org-id'],
  });

  // ── WebSocket ───────────────────────────────────────────────────────────
  await app.register(websocket);

  // ── Health check ────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  // ── tRPC routes ─────────────────────────────────────────────────────────
  await registerTrpcRoutes(app);

  // ── Inngest serve handler ───────────────────────────────────────────────
  await registerInngestHandler(app);

  // ── WebSocket handlers ──────────────────────────────────────────────────
  await registerWebSocketHandlers(app);

  return app;
}
