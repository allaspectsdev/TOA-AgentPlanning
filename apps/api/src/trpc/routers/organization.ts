// ---------------------------------------------------------------------------
// Organization Router
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { organizations, organizationMembers, users } from '@toa/db';
import { createRouter, orgProcedure, adminProcedure, requirePermission } from '../trpc';

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const getInput = z.object({});

const updateInput = z.object({
  name: z.string().min(1).max(128).optional(),
  slug: z.string().min(1).max(128).optional(),
});

const listMembersInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const inviteMemberInput = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

const removeMemberInput = z.object({
  userId: z.string().uuid(),
});

const updateMemberRoleInput = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member', 'viewer']),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const organizationRouter = createRouter({
  // ── get ───────────────────────────────────────────────────────────────
  get: orgProcedure
    .use(requirePermission('org_settings', 'read'))
    .input(getInput)
    .query(async ({ ctx }) => {
      return ctx.organization;
    }),

  // ── update ────────────────────────────────────────────────────────────
  update: adminProcedure
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const setValues: Record<string, unknown> = {};
      if (input.name !== undefined) setValues.name = input.name;
      if (input.slug !== undefined) setValues.slug = input.slug;

      if (Object.keys(setValues).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No fields to update.',
        });
      }

      // If slug is being changed, check for conflicts
      if (input.slug) {
        const [existing] = await ctx.db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.slug, input.slug))
          .limit(1);

        if (existing && existing.id !== ctx.organization.id) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `An organization with slug '${input.slug}' already exists.`,
          });
        }
      }

      const [updated] = await ctx.db
        .update(organizations)
        .set(setValues)
        .where(eq(organizations.id, ctx.organization.id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Organization not found.' });
      }

      return updated;
    }),

  // ── listMembers ───────────────────────────────────────────────────────
  listMembers: orgProcedure
    .use(requirePermission('org_settings', 'read'))
    .input(listMembersInput)
    .query(async ({ ctx, input }) => {
      const condition = eq(organizationMembers.organizationId, ctx.organization.id);

      const [items, countResult] = await Promise.all([
        ctx.db
          .select({
            id: organizationMembers.id,
            userId: organizationMembers.userId,
            role: organizationMembers.role,
            createdAt: organizationMembers.createdAt,
            userName: users.name,
            userEmail: users.email,
            userAvatarUrl: users.avatarUrl,
          })
          .from(organizationMembers)
          .innerJoin(users, eq(organizationMembers.userId, users.id))
          .where(condition)
          .orderBy(desc(organizationMembers.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(organizationMembers)
          .where(condition),
      ]);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // ── inviteMember ──────────────────────────────────────────────────────
  inviteMember: orgProcedure
    .use(requirePermission('org_settings', 'manage_members'))
    .input(inviteMemberInput)
    .mutation(async ({ ctx, input }) => {
      // Look up the user by email
      const [user] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `No user found with email '${input.email}'. They must sign up first.`,
        });
      }

      // Check if already a member
      const [existing] = await ctx.db
        .select({ id: organizationMembers.id })
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, ctx.organization.id),
            eq(organizationMembers.userId, user.id),
          ),
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User is already a member of this organization.',
        });
      }

      const [member] = await ctx.db
        .insert(organizationMembers)
        .values({
          organizationId: ctx.organization.id,
          userId: user.id,
          role: input.role,
        })
        .returning();

      return {
        ...member!,
        userName: user.name,
        userEmail: user.email,
      };
    }),

  // ── removeMember ──────────────────────────────────────────────────────
  removeMember: orgProcedure
    .use(requirePermission('org_settings', 'manage_members'))
    .input(removeMemberInput)
    .mutation(async ({ ctx, input }) => {
      // Prevent removing self if owner (guard against orphaned orgs)
      if (input.userId === ctx.user.id && ctx.orgRole === 'owner') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'The owner cannot remove themselves. Transfer ownership first.',
        });
      }

      // Check if target is an owner — only owners can remove other owners
      const [target] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, ctx.organization.id),
            eq(organizationMembers.userId, input.userId),
          ),
        )
        .limit(1);

      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found in this organization.',
        });
      }

      if (target.role === 'owner' && ctx.orgRole !== 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners can remove other owners.',
        });
      }

      await ctx.db
        .delete(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, ctx.organization.id),
            eq(organizationMembers.userId, input.userId),
          ),
        );

      return { success: true, userId: input.userId };
    }),

  // ── updateMemberRole ──────────────────────────────────────────────────
  updateMemberRole: orgProcedure
    .use(requirePermission('org_settings', 'manage_members'))
    .input(updateMemberRoleInput)
    .mutation(async ({ ctx, input }) => {
      // Cannot change own role
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot change your own role.',
        });
      }

      // Verify target exists
      const [target] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, ctx.organization.id),
            eq(organizationMembers.userId, input.userId),
          ),
        )
        .limit(1);

      if (!target) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found in this organization.',
        });
      }

      // Only owners can promote to admin
      if (target.role === 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot change the role of an owner.',
        });
      }

      const [updated] = await ctx.db
        .update(organizationMembers)
        .set({ role: input.role })
        .where(
          and(
            eq(organizationMembers.organizationId, ctx.organization.id),
            eq(organizationMembers.userId, input.userId),
          ),
        )
        .returning();

      return updated!;
    }),
});
