// ---------------------------------------------------------------------------
// Fastify Server Factory
// ---------------------------------------------------------------------------

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { auth } from './auth/index';
import { registerTrpcRoutes } from './trpc/router';
import { registerInngestHandler } from './inngest/serve';
import { registerWebSocketHandlers } from './ws/index';

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

  // ── Better-Auth handler ────────────────────────────────────────────────
  // Mount Better-Auth as a catch-all under /api/auth/*
  app.all('/api/auth/*', async (req, reply) => {
    // Convert Fastify request to Web Request
    const url = `${req.protocol}://${req.hostname}${req.url}`;
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (val) headers.set(key, Array.isArray(val) ? val.join(', ') : val);
    }

    const webRequest = new Request(url, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD'
        ? JSON.stringify(req.body)
        : undefined,
    });

    const response = await auth.handler(webRequest);

    // Convert Web Response back to Fastify reply
    reply.status(response.status);
    response.headers.forEach((value: string, key: string) => {
      reply.header(key, value);
    });
    const body = await response.text();
    return reply.send(body);
  });

  // ── tRPC routes ─────────────────────────────────────────────────────────
  await registerTrpcRoutes(app);

  // ── Inngest serve handler ───────────────────────────────────────────────
  await registerInngestHandler(app);

  // ── WebSocket handlers ──────────────────────────────────────────────────
  await registerWebSocketHandlers(app);

  return app;
}
