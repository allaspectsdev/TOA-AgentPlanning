// ---------------------------------------------------------------------------
// Project Router
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, sql, like, isNull } from 'drizzle-orm';
import { projects } from '@toa/db';
import { createRouter, orgProcedure, requirePermission } from '../trpc.js';

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const listInput = z.object({
  search: z.string().optional(),
  includeArchived: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const getInput = z.object({
  id: z.string().uuid(),
});

const createInput = z.object({
  name: z.string().min(1).max(128),
  slug: z.string().min(1).max(128),
  description: z.string().max(2000).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const updateInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(2000).optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const deleteInput = z.object({
  id: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const projectRouter = createRouter({
  // ── list ──────────────────────────────────────────────────────────────
  list: orgProcedure
    .use(requirePermission('project', 'read'))
    .input(listInput)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(projects.organizationId, ctx.organization.id)];

      if (!input.includeArchived) {
        conditions.push(isNull(projects.archivedAt));
      }

      if (input.search) {
        conditions.push(like(projects.name, `%${input.search}%`));
      }

      const [items, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(projects)
          .where(and(...conditions))
          .orderBy(desc(projects.updatedAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(projects)
          .where(and(...conditions)),
      ]);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // ── get ───────────────────────────────────────────────────────────────
  get: orgProcedure
    .use(requirePermission('project', 'read'))
    .input(getInput)
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, input.id),
            eq(projects.organizationId, ctx.organization.id),
          ),
        )
        .limit(1);

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
      }

      return project;
    }),

  // ── create ────────────────────────────────────────────────────────────
  create: orgProcedure
    .use(requirePermission('project', 'create'))
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate slug within the organization
      const [existing] = await ctx.db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, ctx.organization.id),
            eq(projects.slug, input.slug),
          ),
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A project with slug '${input.slug}' already exists in this organization.`,
        });
      }

      const [project] = await ctx.db
        .insert(projects)
        .values({
          organizationId: ctx.organization.id,
          name: input.name,
          slug: input.slug,
          description: input.description,
          settings: input.settings ?? {},
        })
        .returning();

      return project!;
    }),

  // ── update ────────────────────────────────────────────────────────────
  update: orgProcedure
    .use(requirePermission('project', 'update'))
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const setValues: Record<string, unknown> = {};
      if (updates.name !== undefined) setValues.name = updates.name;
      if (updates.description !== undefined) setValues.description = updates.description;
      if (updates.settings !== undefined) setValues.settings = updates.settings;

      if (Object.keys(setValues).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No fields to update.',
        });
      }

      const [updated] = await ctx.db
        .update(projects)
        .set(setValues)
        .where(
          and(
            eq(projects.id, id),
            eq(projects.organizationId, ctx.organization.id),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
      }

      return updated;
    }),

  // ── delete (soft archive) ─────────────────────────────────────────────
  delete: orgProcedure
    .use(requirePermission('project', 'delete'))
    .input(deleteInput)
    .mutation(async ({ ctx, input }) => {
      const [archived] = await ctx.db
        .update(projects)
        .set({ archivedAt: new Date() })
        .where(
          and(
            eq(projects.id, input.id),
            eq(projects.organizationId, ctx.organization.id),
          ),
        )
        .returning();

      if (!archived) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
      }

      return { success: true, id: archived.id };
    }),
});
