// ---------------------------------------------------------------------------
// tRPC Middleware
// ---------------------------------------------------------------------------

import { TRPCError } from '@trpc/server';
import { t } from './trpc.js';
import { checkPermission, type Resource, type Action } from '../auth/permissions.js';

// ---------------------------------------------------------------------------
// isAuthenticated — validates that the request has a valid session
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

// ---------------------------------------------------------------------------
// withOrganization — resolves org from x-org-id header
// ---------------------------------------------------------------------------

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
      message:
        'Organization not found. Provide a valid x-org-id header.',
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

// ---------------------------------------------------------------------------
// requirePermission — RBAC check for a specific resource + action
// ---------------------------------------------------------------------------

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
