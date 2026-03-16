// ---------------------------------------------------------------------------
// Root tRPC Router
// ---------------------------------------------------------------------------

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createRouter } from './trpc.js';
import { createContext } from './context.js';
import { workflowRouter } from './routers/workflow.js';
import { executionRouter } from './routers/execution.js';
import { gateRouter } from './routers/gate.js';
import { projectRouter } from './routers/project.js';
import { organizationRouter } from './routers/organization.js';
import { templateRouter } from './routers/template.js';
import { agentRouter } from './routers/agent.js';

// ---------------------------------------------------------------------------
// App Router
// ---------------------------------------------------------------------------

export const appRouter = createRouter({
  workflow: workflowRouter,
  execution: executionRouter,
  gate: gateRouter,
  project: projectRouter,
  organization: organizationRouter,
  template: templateRouter,
  agent: agentRouter,
});

export type AppRouter = typeof appRouter;

// ---------------------------------------------------------------------------
// Fastify Plugin — registers tRPC under /trpc/*
// ---------------------------------------------------------------------------

export async function registerTrpcRoutes(app: FastifyInstance): Promise<void> {
  // Handle all tRPC requests under /trpc
  app.all('/trpc/*', async (req: FastifyRequest, res: FastifyReply) => {
    // Build a standard Request from Fastify's raw req for the fetch adapter
    const url = new URL(
      req.url,
      `http://${req.headers.host ?? 'localhost:3001'}`,
    );

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          for (const v of value) headers.append(key, v);
        } else {
          headers.set(key, value);
        }
      }
    }

    let body: BodyInit | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Fastify has already parsed the body for us
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const fetchRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    });

    const response = await fetchRequestHandler({
      endpoint: '/trpc',
      req: fetchRequest,
      router: appRouter,
      createContext: () => createContext(req, res),
    });

    // Convert the fetch Response back to Fastify
    res.status(response.status);

    response.headers.forEach((value, key) => {
      void res.header(key, value);
    });

    const responseBody = await response.text();
    return res.send(responseBody);
  });
}
