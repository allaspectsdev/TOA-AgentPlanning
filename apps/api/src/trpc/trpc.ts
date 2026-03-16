// ---------------------------------------------------------------------------
// tRPC Initialization
// ---------------------------------------------------------------------------

import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context';
import { checkPermission, type Resource, type Action } from '../auth/permissions';

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
// Middleware
// ---------------------------------------------------------------------------

export const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
    },
  });
});

export const withOrganization = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action.',
    });
  }

  if (!ctx.organization) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Organization not found. Provide a valid x-org-id header.',
    });
  }

  if (!ctx.orgMembership || !ctx.orgRole) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not a member of this organization.',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      session: ctx.session,
      organization: ctx.organization,
      orgMembership: ctx.orgMembership,
      orgRole: ctx.orgRole,
    },
  });
});

export function requirePermission(resource: Resource, action: Action) {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.user || !ctx.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'You must be logged in to perform this action.',
      });
    }

    if (!ctx.organization || !ctx.orgRole) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Organization context is required for this operation.',
      });
    }

    if (!checkPermission(ctx.orgRole, resource, action)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `Insufficient permissions: cannot '${action}' on '${resource}'.`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        session: ctx.session,
        organization: ctx.organization,
        orgMembership: ctx.orgMembership!,
        orgRole: ctx.orgRole,
      },
    });
  });
}

// ---------------------------------------------------------------------------
// Router & procedure factories
// ---------------------------------------------------------------------------

export const createRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const orgProcedure = t.procedure.use(withOrganization);
export const adminProcedure = t.procedure
  .use(withOrganization)
  .use(requirePermission('org_settings', 'update'));
