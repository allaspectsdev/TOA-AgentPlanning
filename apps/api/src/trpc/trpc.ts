// ---------------------------------------------------------------------------
// tRPC Initialization
// ---------------------------------------------------------------------------

import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context.js';
import { isAuthenticated, withOrganization, requirePermission } from './middleware.js';

// ---------------------------------------------------------------------------
// tRPC instance
// ---------------------------------------------------------------------------

export const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === 'BAD_REQUEST' && error.cause instanceof Error
            ? error.cause.message
            : null,
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Router & procedure factories
// ---------------------------------------------------------------------------

/** Create a new tRPC router. */
export const createRouter = t.router;

/** Create a caller factory for server-side calls. */
export const createCallerFactory = t.createCallerFactory;

/** Public procedure — no authentication required. */
export const publicProcedure = t.procedure;

/** Protected procedure — requires a valid session. */
export const protectedProcedure = t.procedure.use(isAuthenticated);

/** Organization procedure — requires auth + org membership. */
export const orgProcedure = t.procedure.use(withOrganization);

/**
 * Admin procedure — requires auth + org membership with admin or owner role.
 * For more granular checks, use `orgProcedure` with `requirePermission`.
 */
export const adminProcedure = t.procedure
  .use(withOrganization)
  .use(requirePermission('org_settings', 'update'));

export { requirePermission };
