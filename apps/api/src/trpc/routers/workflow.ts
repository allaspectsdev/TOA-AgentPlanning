// ---------------------------------------------------------------------------
// Workflow Router
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, sql, like } from 'drizzle-orm';
import { workflows, workflowVersions } from '@toa/db';
import { validateWorkflow, type ValidationResult } from '@toa/engine';
import { diffWorkflows, type WorkflowDefinition } from '@toa/shared';
import { createRouter, orgProcedure, requirePermission } from '../trpc.js';

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const listInput = z.object({
  projectId: z.string().uuid(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const getInput = z.object({
  id: z.string().uuid(),
});

const createInput = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(128),
  slug: z.string().min(1).max(128),
  description: z.string().max(2000).optional(),
});

const updateInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const deleteInput = z.object({
  id: z.string().uuid(),
});

const saveVersionInput = z.object({
  workflowId: z.string().uuid(),
  definition: z.record(z.string(), z.unknown()),
  changeMessage: z.string().max(500).optional(),
  branch: z.string().default('main'),
});

const getVersionInput = z.object({
  id: z.string().uuid(),
});

const listVersionsInput = z.object({
  workflowId: z.string().uuid(),
  branch: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const diffVersionsInput = z.object({
  versionAId: z.string().uuid(),
  versionBId: z.string().uuid(),
});

const rollbackInput = z.object({
  workflowId: z.string().uuid(),
  versionId: z.string().uuid(),
});

const publishInput = z.object({
  workflowId: z.string().uuid(),
  versionId: z.string().uuid(),
});

const unpublishInput = z.object({
  workflowId: z.string().uuid(),
});

const validateInput = z.object({
  definition: z.record(z.string(), z.unknown()),
});

const duplicateInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(128),
  slug: z.string().min(1).max(128),
  projectId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const workflowRouter = createRouter({
  // ── list ──────────────────────────────────────────────────────────────
  list: orgProcedure
    .use(requirePermission('workflow', 'read'))
    .input(listInput)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(workflows.projectId, input.projectId)];

      if (input.status) {
        conditions.push(eq(workflows.status, input.status));
      }

      if (input.search) {
        conditions.push(like(workflows.name, `%${input.search}%`));
      }

      const [items, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(workflows)
          .where(and(...conditions))
          .orderBy(desc(workflows.updatedAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(workflows)
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
    .use(requirePermission('workflow', 'read'))
    .input(getInput)
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.workflows.findFirst({
        where: eq(workflows.id, input.id),
        with: {
          currentVersion: true,
          publishedVersion: true,
          createdBy: {
            columns: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found.' });
      }

      return result;
    }),

  // ── create ────────────────────────────────────────────────────────────
  create: orgProcedure
    .use(requirePermission('workflow', 'create'))
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const [workflow] = await ctx.db
        .insert(workflows)
        .values({
          projectId: input.projectId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          status: 'draft',
          createdById: ctx.user.id,
        })
        .returning();

      return workflow!;
    }),

  // ── update ────────────────────────────────────────────────────────────
  update: orgProcedure
    .use(requirePermission('workflow', 'update'))
    .input(updateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Filter out undefined values
      const setValues: Record<string, unknown> = {};
      if (updates.name !== undefined) setValues.name = updates.name;
      if (updates.description !== undefined) setValues.description = updates.description;
      if (updates.status !== undefined) setValues.status = updates.status;

      if (Object.keys(setValues).length === 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No fields to update.',
        });
      }

      const [updated] = await ctx.db
        .update(workflows)
        .set(setValues)
        .where(eq(workflows.id, id))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found.' });
      }

      return updated;
    }),

  // ── delete (soft delete by archiving) ─────────────────────────────────
  delete: orgProcedure
    .use(requirePermission('workflow', 'delete'))
    .input(deleteInput)
    .mutation(async ({ ctx, input }) => {
      const [archived] = await ctx.db
        .update(workflows)
        .set({ status: 'archived' })
        .where(eq(workflows.id, input.id))
        .returning();

      if (!archived) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found.' });
      }

      return { success: true, id: archived.id };
    }),

  // ── saveVersion ───────────────────────────────────────────────────────
  saveVersion: orgProcedure
    .use(requirePermission('workflow', 'update'))
    .input(saveVersionInput)
    .mutation(async ({ ctx, input }) => {
      // Get the latest version number for this workflow + branch
      const [latestVersion] = await ctx.db
        .select({ version: workflowVersions.version })
        .from(workflowVersions)
        .where(
          and(
            eq(workflowVersions.workflowId, input.workflowId),
            eq(workflowVersions.branch, input.branch),
          ),
        )
        .orderBy(desc(workflowVersions.version))
        .limit(1);

      const nextVersion = (latestVersion?.version ?? 0) + 1;

      const [version] = await ctx.db
        .insert(workflowVersions)
        .values({
          workflowId: input.workflowId,
          version: nextVersion,
          branch: input.branch,
          definition: input.definition,
          changeMessage: input.changeMessage,
          createdById: ctx.user.id,
        })
        .returning();

      // Update the workflow's currentVersionId pointer
      await ctx.db
        .update(workflows)
        .set({ currentVersionId: version!.id })
        .where(eq(workflows.id, input.workflowId));

      return version!;
    }),

  // ── getVersion ────────────────────────────────────────────────────────
  getVersion: orgProcedure
    .use(requirePermission('workflow', 'read'))
    .input(getVersionInput)
    .query(async ({ ctx, input }) => {
      const result = await ctx.db.query.workflowVersions.findFirst({
        where: eq(workflowVersions.id, input.id),
        with: {
          createdBy: {
            columns: { id: true, name: true, email: true },
          },
        },
      });

      if (!result) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Version not found.' });
      }

      return result;
    }),

  // ── listVersions ──────────────────────────────────────────────────────
  listVersions: orgProcedure
    .use(requirePermission('workflow', 'read'))
    .input(listVersionsInput)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(workflowVersions.workflowId, input.workflowId)];

      if (input.branch) {
        conditions.push(eq(workflowVersions.branch, input.branch));
      }

      const [items, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(workflowVersions)
          .where(and(...conditions))
          .orderBy(desc(workflowVersions.version))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(workflowVersions)
          .where(and(...conditions)),
      ]);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // ── diffVersions ──────────────────────────────────────────────────────
  diffVersions: orgProcedure
    .use(requirePermission('workflow', 'read'))
    .input(diffVersionsInput)
    .query(async ({ ctx, input }) => {
      const [versionA, versionB] = await Promise.all([
        ctx.db
          .select()
          .from(workflowVersions)
          .where(eq(workflowVersions.id, input.versionAId))
          .limit(1),
        ctx.db
          .select()
          .from(workflowVersions)
          .where(eq(workflowVersions.id, input.versionBId))
          .limit(1),
      ]);

      if (!versionA[0] || !versionB[0]) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'One or both versions not found.',
        });
      }

      const defA = versionA[0].definition as unknown as WorkflowDefinition;
      const defB = versionB[0].definition as unknown as WorkflowDefinition;

      return diffWorkflows(defA, defB);
    }),

  // ── rollback ──────────────────────────────────────────────────────────
  rollback: orgProcedure
    .use(requirePermission('workflow', 'update'))
    .input(rollbackInput)
    .mutation(async ({ ctx, input }) => {
      // Verify the version belongs to this workflow
      const [version] = await ctx.db
        .select()
        .from(workflowVersions)
        .where(
          and(
            eq(workflowVersions.id, input.versionId),
            eq(workflowVersions.workflowId, input.workflowId),
          ),
        )
        .limit(1);

      if (!version) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Version not found or does not belong to this workflow.',
        });
      }

      // Create a new version based on the rollback target
      const [latestVersion] = await ctx.db
        .select({ version: workflowVersions.version })
        .from(workflowVersions)
        .where(
          and(
            eq(workflowVersions.workflowId, input.workflowId),
            eq(workflowVersions.branch, version.branch),
          ),
        )
        .orderBy(desc(workflowVersions.version))
        .limit(1);

      const nextVersion = (latestVersion?.version ?? 0) + 1;

      const [newVersion] = await ctx.db
        .insert(workflowVersions)
        .values({
          workflowId: input.workflowId,
          version: nextVersion,
          branch: version.branch,
          parentVersionId: version.id,
          definition: version.definition,
          changeMessage: `Rollback to version ${version.version}`,
          createdById: ctx.user.id,
        })
        .returning();

      // Update workflow pointer
      await ctx.db
        .update(workflows)
        .set({ currentVersionId: newVersion!.id })
        .where(eq(workflows.id, input.workflowId));

      return newVersion!;
    }),

  // ── publish ───────────────────────────────────────────────────────────
  publish: orgProcedure
    .use(requirePermission('workflow', 'publish'))
    .input(publishInput)
    .mutation(async ({ ctx, input }) => {
      // Verify version belongs to the workflow
      const [version] = await ctx.db
        .select()
        .from(workflowVersions)
        .where(
          and(
            eq(workflowVersions.id, input.versionId),
            eq(workflowVersions.workflowId, input.workflowId),
          ),
        )
        .limit(1);

      if (!version) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Version not found or does not belong to this workflow.',
        });
      }

      const [updated] = await ctx.db
        .update(workflows)
        .set({
          publishedVersionId: input.versionId,
          status: 'published',
        })
        .where(eq(workflows.id, input.workflowId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found.' });
      }

      return updated;
    }),

  // ── unpublish ─────────────────────────────────────────────────────────
  unpublish: orgProcedure
    .use(requirePermission('workflow', 'publish'))
    .input(unpublishInput)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(workflows)
        .set({
          publishedVersionId: null,
          status: 'draft',
        })
        .where(eq(workflows.id, input.workflowId))
        .returning();

      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found.' });
      }

      return updated;
    }),

  // ── validate ──────────────────────────────────────────────────────────
  validate: orgProcedure
    .use(requirePermission('workflow', 'read'))
    .input(validateInput)
    .query(async ({ input }) => {
      const result: ValidationResult = validateWorkflow(
        input.definition as unknown as WorkflowDefinition,
      );
      return result;
    }),

  // ── duplicate ─────────────────────────────────────────────────────────
  duplicate: orgProcedure
    .use(requirePermission('workflow', 'create'))
    .input(duplicateInput)
    .mutation(async ({ ctx, input }) => {
      // Fetch source workflow with current version
      const source = await ctx.db.query.workflows.findFirst({
        where: eq(workflows.id, input.id),
        with: { currentVersion: true },
      });

      if (!source) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Source workflow not found.' });
      }

      // Create the new workflow
      const [newWorkflow] = await ctx.db
        .insert(workflows)
        .values({
          projectId: input.projectId ?? source.projectId,
          name: input.name,
          slug: input.slug,
          description: source.description,
          status: 'draft',
          createdById: ctx.user.id,
        })
        .returning();

      // If the source has a current version, duplicate it
      if (source.currentVersion) {
        const [newVersion] = await ctx.db
          .insert(workflowVersions)
          .values({
            workflowId: newWorkflow!.id,
            version: 1,
            branch: 'main',
            definition: source.currentVersion.definition,
            changeMessage: `Duplicated from "${source.name}"`,
            createdById: ctx.user.id,
          })
          .returning();

        await ctx.db
          .update(workflows)
          .set({ currentVersionId: newVersion!.id })
          .where(eq(workflows.id, newWorkflow!.id));

        return { ...newWorkflow!, currentVersionId: newVersion!.id };
      }

      return newWorkflow!;
    }),
});
