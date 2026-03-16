// ---------------------------------------------------------------------------
// Execution Router
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import {
  executions,
  executionSteps,
  executionLogs,
  workflows,
  workflowVersions,
} from '@toa/db';
import { inngest } from '@toa/engine';
import { createRouter, orgProcedure, requirePermission } from '../trpc';

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const startInput = z.object({
  workflowId: z.string().min(1),
  versionId: z.string().min(1).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
  triggerType: z.enum(['manual', 'api', 'schedule', 'webhook', 'event']).default('manual'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const cancelInput = z.object({
  executionId: z.string().min(1),
  reason: z.string().optional(),
});

const getInput = z.object({
  id: z.string().min(1),
});

const listInput = z.object({
  workflowId: z.string().min(1).optional(),
  status: z
    .enum(['pending', 'running', 'paused', 'completed', 'failed', 'cancelled', 'timed_out'])
    .optional(),
  startedAfter: z.string().datetime().optional(),
  startedBefore: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const getLogsInput = z.object({
  executionId: z.string().min(1),
  stepId: z.string().min(1).optional(),
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

const retryInput = z.object({
  executionId: z.string().min(1),
  fromNodeId: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const executionRouter = createRouter({
  // ── start ─────────────────────────────────────────────────────────────
  start: orgProcedure
    .use(requirePermission('execution', 'execute'))
    .input(startInput)
    .mutation(async ({ ctx, input }) => {
      // Resolve the workflow
      const workflow = await ctx.db.query.workflows.findFirst({
        where: eq(workflows.id, input.workflowId),
      });

      if (!workflow) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow not found.' });
      }

      // Determine version to execute
      let versionId = input.versionId;
      if (!versionId) {
        // Use published version, falling back to current
        versionId = workflow.publishedVersionId ?? workflow.currentVersionId ?? undefined;
      }

      if (!versionId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No version available to execute. Save or publish a version first.',
        });
      }

      // Verify the version exists
      const [version] = await ctx.db
        .select()
        .from(workflowVersions)
        .where(eq(workflowVersions.id, versionId))
        .limit(1);

      if (!version) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workflow version not found.' });
      }

      // Create the execution record
      const [execution] = await ctx.db
        .insert(executions)
        .values({
          workflowId: input.workflowId,
          workflowVersionId: versionId,
          triggeredById: ctx.user.id,
          triggerType: input.triggerType,
          triggerPayload: input.input,
          status: 'pending',
          metadata: input.metadata ?? {},
        })
        .returning();

      // Send the event to Inngest to start the execution
      await inngest.send({
        name: 'workflow/execute',
        data: {
          executionId: execution!.id,
          workflowId: input.workflowId,
          versionId,
          input: input.input,
          triggeredBy: ctx.user.id,
          metadata: input.metadata,
        },
      });

      return execution!;
    }),

  // ── cancel ────────────────────────────────────────────────────────────
  cancel: orgProcedure
    .use(requirePermission('execution', 'execute'))
    .input(cancelInput)
    .mutation(async ({ ctx, input }) => {
      const [execution] = await ctx.db
        .select()
        .from(executions)
        .where(eq(executions.id, input.executionId))
        .limit(1);

      if (!execution) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Execution not found.' });
      }

      if (execution.status !== 'running' && execution.status !== 'pending' && execution.status !== 'paused') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot cancel execution with status '${execution.status}'.`,
        });
      }

      const [updated] = await ctx.db
        .update(executions)
        .set({
          status: 'cancelled',
          completedAt: new Date(),
          error: input.reason ? { code: 'CANCELLED', message: input.reason } : undefined,
        })
        .where(eq(executions.id, input.executionId))
        .returning();

      // Cancel all pending/running steps
      await ctx.db
        .update(executionSteps)
        .set({ status: 'skipped' })
        .where(
          and(
            eq(executionSteps.executionId, input.executionId),
            sql`${executionSteps.status} IN ('pending', 'running', 'waiting')`,
          ),
        );

      return updated!;
    }),

  // ── get ───────────────────────────────────────────────────────────────
  get: orgProcedure
    .use(requirePermission('execution', 'read'))
    .input(getInput)
    .query(async ({ ctx, input }) => {
      const execution = await ctx.db.query.executions.findFirst({
        where: eq(executions.id, input.id),
        with: {
          steps: {
            orderBy: (steps, { asc: a }) => [a(steps.startedAt)],
          },
          workflow: {
            columns: { id: true, name: true, slug: true },
          },
          triggeredBy: {
            columns: { id: true, name: true, email: true },
          },
        },
      });

      if (!execution) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Execution not found.' });
      }

      return execution;
    }),

  // ── list ──────────────────────────────────────────────────────────────
  list: orgProcedure
    .use(requirePermission('execution', 'read'))
    .input(listInput)
    .query(async ({ ctx, input }) => {
      const conditions: ReturnType<typeof eq>[] = [];

      if (input.workflowId) {
        conditions.push(eq(executions.workflowId, input.workflowId));
      }

      if (input.status) {
        conditions.push(eq(executions.status, input.status));
      }

      if (input.startedAfter) {
        conditions.push(gte(executions.createdAt, new Date(input.startedAfter)));
      }

      if (input.startedBefore) {
        conditions.push(lte(executions.createdAt, new Date(input.startedBefore)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(executions)
          .where(whereClause)
          .orderBy(desc(executions.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(executions)
          .where(whereClause),
      ]);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // ── getLogs ───────────────────────────────────────────────────────────
  getLogs: orgProcedure
    .use(requirePermission('execution', 'read'))
    .input(getLogsInput)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(executionLogs.executionId, input.executionId)];

      if (input.stepId) {
        conditions.push(eq(executionLogs.stepId, input.stepId));
      }

      if (input.level) {
        conditions.push(eq(executionLogs.level, input.level));
      }

      const [items, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(executionLogs)
          .where(and(...conditions))
          .orderBy(desc(executionLogs.timestamp))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(executionLogs)
          .where(and(...conditions)),
      ]);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // ── retry ─────────────────────────────────────────────────────────────
  retry: orgProcedure
    .use(requirePermission('execution', 'execute'))
    .input(retryInput)
    .mutation(async ({ ctx, input }) => {
      const [execution] = await ctx.db
        .select()
        .from(executions)
        .where(eq(executions.id, input.executionId))
        .limit(1);

      if (!execution) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Execution not found.' });
      }

      if (execution.status !== 'failed' && execution.status !== 'cancelled') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Cannot retry execution with status '${execution.status}'. Only failed or cancelled executions can be retried.`,
        });
      }

      // Create a new execution based on the original
      const [newExecution] = await ctx.db
        .insert(executions)
        .values({
          workflowId: execution.workflowId,
          workflowVersionId: execution.workflowVersionId,
          triggeredById: ctx.user.id,
          triggerType: 'manual',
          triggerPayload: execution.triggerPayload,
          status: 'pending',
          metadata: {
            ...(execution.metadata ?? {}),
            retriedFrom: execution.id,
            retryFromNodeId: input.fromNodeId,
          },
        })
        .returning();

      // Send to Inngest
      await inngest.send({
        name: 'workflow/execute',
        data: {
          executionId: newExecution!.id,
          workflowId: execution.workflowId,
          versionId: execution.workflowVersionId,
          input: (execution.triggerPayload as Record<string, unknown>) ?? {},
          triggeredBy: ctx.user.id,
          metadata: {
            retriedFrom: execution.id,
            retryFromNodeId: input.fromNodeId,
          },
        },
      });

      return newExecution!;
    }),
});

