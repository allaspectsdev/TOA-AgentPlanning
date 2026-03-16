// ---------------------------------------------------------------------------
// Inngest Serve Handler — Fastify Integration
// ---------------------------------------------------------------------------

import type { FastifyInstance } from 'fastify';
import { serve } from 'inngest/fastify';
import { inngest, inngestFunctions } from '@toa/engine';

/**
 * Register the Inngest serve handler as Fastify routes.
 *
 * Inngest's dev server or cloud calls these endpoints to discover and invoke
 * functions. We use the `inngest/fastify` serve adapter which returns a native
 * Fastify handler.
 */
export async function registerInngestHandler(
  app: FastifyInstance,
): Promise<void> {
  const inngestHandler = serve({
    client: inngest,
    functions: inngestFunctions,
    serveHost: process.env.INNGEST_SERVE_HOST,
    servePath: '/api/inngest',
  });

  app.route({
    method: ['GET', 'POST', 'PUT'],
    url: '/api/inngest',
    handler: inngestHandler,
  });

  app.log.info('Inngest serve handler registered at /api/inngest');
}
