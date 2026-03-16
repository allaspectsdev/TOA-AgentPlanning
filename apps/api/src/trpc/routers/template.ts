// ---------------------------------------------------------------------------
// Template Router — Workflow Templates
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, or, sql, like } from 'drizzle-orm';
import { workflowTemplates, workflows, workflowVersions } from '@toa/db';
import { createRouter, orgProcedure, requirePermission } from '../trpc.js';

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const listWorkflowInput = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const getWorkflowInput = z.object({
  id: z.string().uuid(),
});

const createFromWorkflowInput = z.object({
  workflowId: z.string().uuid(),
  name: z.string().min(1).max(128),
  description: z.string().min(1).max(2000),
  category: z.string().min(1).max(64),
  isPublic: z.boolean().default(false),
  thumbnail: z.string().url().optional(),
});

const instantiateInput = z.object({
  templateId: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1).max(128),
  slug: z.string().min(1).max(128),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const templateRouter = createRouter({
  // ── listWorkflow — list available templates ────────────────────────────
  listWorkflow: orgProcedure
    .use(requirePermission('template', 'read'))
    .input(listWorkflowInput)
    .query(async ({ ctx, input }) => {
      // Show public templates + templates belonging to this org
      const conditions = [
        or(
          eq(workflowTemplates.isPublic, true),
          eq(workflowTemplates.organizationId, ctx.organization.id),
        ),
      ];

      if (input.category) {
        conditions.push(eq(workflowTemplates.category, input.category));
      }

      if (input.search) {
        conditions.push(like(workflowTemplates.name, `%${input.search}%`));
      }

      const [items, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(workflowTemplates)
          .where(and(...conditions))
          .orderBy(desc(workflowTemplates.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(workflowTemplates)
          .where(and(...conditions)),
      ]);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // ── getWorkflow — get a single template ───────────────────────────────
  getWorkflow: orgProcedure
    .use(requirePermission('template', 'read'))
    .input(getWorkflowInput)
    .query(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .select()
        .from(workflowTemplates)
        .where(
          and(
            eq(workflowTemplates.id, input.id),
            or(
              eq(workflowTemplates.isPublic, true),
              eq(workflowTemplates.organizationId, ctx.organization.id),
            ),
          ),
        )
        .limit(1);

      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found.' });
      }

      return template;
    }),

  // ── createFromWorkflow — save a workflow as a template ────────────────
  createFromWorkflow: orgProcedure
    .use(requirePermission('template', 'create'))
    .input(createFromWorkflowInput)
    .mutation(async ({ ctx, input }) => {
      // Get the workflow's current version for the definition
      const workflow = await ctx.db.query.workflows.findFirst({
        where: eq(workflows.id, input.workflowId),
        with: { currentVersion: true },
      });

      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found.' });
      }

      if (!workflow.currentVersion) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Workflow has no saved version to create a template from.',
        });
      }

      const [template] = await ctx.db
        .insert(workflowTemplates)
        .values({
          organizationId: ctx.organization.id,
          name: input.name,
          description: input.description,
          category: input.category,
          definition: workflow.currentVersion.definition,
          thumbnail: input.thumbnail,
          isPublic: input.isPublic,
        })
        .returning();

      return template!;
    }),

  // ── instantiate — create a new workflow from a template ────────────────
  instantiate: orgProcedure
    .use(requirePermission('workflow', 'create'))
    .input(instantiateInput)
    .mutation(async ({ ctx, input }) => {
      // Fetch the template
      const [template] = await ctx.db
        .select()
        .from(workflowTemplates)
        .where(
          and(
            eq(workflowTemplates.id, input.templateId),
            or(
              eq(workflowTemplates.isPublic, true),
              eq(workflowTemplates.organizationId, ctx.organization.id),
            ),
          ),
        )
        .limit(1);

      if (!template) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Template not found.' });
      }

      // Create a new workflow
      const [newWorkflow] = await ctx.db
        .insert(workflows)
        .values({
          projectId: input.projectId,
          name: input.name,
          slug: input.slug,
          description: template.description,
          status: 'draft',
          createdById: ctx.user.id,
        })
        .returning();

      // Create the initial version from the template definition
      const [newVersion] = await ctx.db
        .insert(workflowVersions)
        .values({
          workflowId: newWorkflow!.id,
          version: 1,
          branch: 'main',
          definition: template.definition,
          changeMessage: `Created from template "${template.name}"`,
          createdById: ctx.user.id,
        })
        .returning();

      // Point the workflow to this version
      await ctx.db
        .update(workflows)
        .set({ currentVersionId: newVersion!.id })
        .where(eq(workflows.id, newWorkflow!.id));

      return {
        ...newWorkflow!,
        currentVersionId: newVersion!.id,
        templateName: template.name,
      };
    }),
});
