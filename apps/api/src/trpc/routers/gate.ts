// ---------------------------------------------------------------------------
// Gate Router — Human-in-the-Loop Approvals
// ---------------------------------------------------------------------------

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { gateApprovals } from '@toa/db';
import { inngest } from '@toa/engine';
import { createRouter, orgProcedure, requirePermission } from '../trpc.js';

// ---------------------------------------------------------------------------
// Input Schemas
// ---------------------------------------------------------------------------

const getPendingInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

const getForExecutionInput = z.object({
  executionId: z.string().uuid(),
});

const approveInput = z.object({
  gateId: z.string().uuid(),
  comment: z.string().max(2000).optional(),
});

const rejectInput = z.object({
  gateId: z.string().uuid(),
  comment: z.string().max(2000).optional(),
});

const submitInputInput = z.object({
  gateId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
  comment: z.string().max(2000).optional(),
});

const escalateInput = z.object({
  gateId: z.string().uuid(),
  escalateTo: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1).max(2000),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const gateRouter = createRouter({
  // ── getPending — gates assigned to the current user ────────────────────
  getPending: orgProcedure
    .use(requirePermission('execution', 'read'))
    .input(getPendingInput)
    .query(async ({ ctx, input }) => {
      // Gate approvals where the current user is in the assignedTo array
      // and the status is still 'pending'
      const [items, countResult] = await Promise.all([
        ctx.db
          .select()
          .from(gateApprovals)
          .where(
            and(
              eq(gateApprovals.status, 'pending'),
              sql`${ctx.user.id} = ANY(${gateApprovals.assignedTo})`,
            ),
          )
          .orderBy(desc(gateApprovals.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(gateApprovals)
          .where(
            and(
              eq(gateApprovals.status, 'pending'),
              sql`${ctx.user.id} = ANY(${gateApprovals.assignedTo})`,
            ),
          ),
      ]);

      return {
        items,
        total: countResult[0]?.count ?? 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // ── getForExecution — all gates for an execution ──────────────────────
  getForExecution: orgProcedure
    .use(requirePermission('execution', 'read'))
    .input(getForExecutionInput)
    .query(async ({ ctx, input }) => {
      const items = await ctx.db
        .select()
        .from(gateApprovals)
        .where(eq(gateApprovals.executionId, input.executionId))
        .orderBy(desc(gateApprovals.createdAt));

      return items;
    }),

  // ── approve ───────────────────────────────────────────────────────────
  approve: orgProcedure
    .use(requirePermission('execution', 'execute'))
    .input(approveInput)
    .mutation(async ({ ctx, input }) => {
      const [gate] = await ctx.db
        .select()
        .from(gateApprovals)
        .where(eq(gateApprovals.id, input.gateId))
        .limit(1);

      if (!gate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gate approval not found.' });
      }

      if (gate.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Gate is already '${gate.status}' and cannot be approved.`,
        });
      }

      const [updated] = await ctx.db
        .update(gateApprovals)
        .set({
          status: 'approved',
          approvedBy: ctx.user.id,
          reviewComment: input.comment,
          respondedAt: new Date(),
        })
        .where(eq(gateApprovals.id, input.gateId))
        .returning();

      // Notify the engine via Inngest
      await inngest.send({
        name: 'gate/responded',
        data: {
          gateId: gate.id,
          executionId: gate.executionId,
          nodeId: gate.gateNodeId,
          action: 'approve',
          userId: ctx.user.id,
          comment: input.comment,
        },
      });

      return updated!;
    }),

  // ── reject ────────────────────────────────────────────────────────────
  reject: orgProcedure
    .use(requirePermission('execution', 'execute'))
    .input(rejectInput)
    .mutation(async ({ ctx, input }) => {
      const [gate] = await ctx.db
        .select()
        .from(gateApprovals)
        .where(eq(gateApprovals.id, input.gateId))
        .limit(1);

      if (!gate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gate approval not found.' });
      }

      if (gate.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Gate is already '${gate.status}' and cannot be rejected.`,
        });
      }

      const [updated] = await ctx.db
        .update(gateApprovals)
        .set({
          status: 'rejected',
          approvedBy: ctx.user.id,
          reviewComment: input.comment,
          respondedAt: new Date(),
        })
        .where(eq(gateApprovals.id, input.gateId))
        .returning();

      await inngest.send({
        name: 'gate/responded',
        data: {
          gateId: gate.id,
          executionId: gate.executionId,
          nodeId: gate.gateNodeId,
          action: 'reject',
          userId: ctx.user.id,
          comment: input.comment,
        },
      });

      return updated!;
    }),

  // ── submitInput — for gates of type 'input' ──────────────────────────
  submitInput: orgProcedure
    .use(requirePermission('execution', 'execute'))
    .input(submitInputInput)
    .mutation(async ({ ctx, input }) => {
      const [gate] = await ctx.db
        .select()
        .from(gateApprovals)
        .where(eq(gateApprovals.id, input.gateId))
        .limit(1);

      if (!gate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gate approval not found.' });
      }

      if (gate.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Gate is already '${gate.status}' and cannot accept input.`,
        });
      }

      // Store the submitted data in the payload and mark as approved
      const updatedPayload = {
        ...(gate.payload ?? {}),
        submittedInput: input.data,
        submittedBy: ctx.user.id,
      };

      const [updated] = await ctx.db
        .update(gateApprovals)
        .set({
          status: 'approved',
          approvedBy: ctx.user.id,
          reviewComment: input.comment,
          payload: updatedPayload,
          respondedAt: new Date(),
        })
        .where(eq(gateApprovals.id, input.gateId))
        .returning();

      await inngest.send({
        name: 'gate/responded',
        data: {
          gateId: gate.id,
          executionId: gate.executionId,
          nodeId: gate.gateNodeId,
          action: 'submit_input',
          userId: ctx.user.id,
          comment: input.comment,
          inputData: input.data,
        },
      });

      return updated!;
    }),

  // ── escalate ──────────────────────────────────────────────────────────
  escalate: orgProcedure
    .use(requirePermission('execution', 'execute'))
    .input(escalateInput)
    .mutation(async ({ ctx, input }) => {
      const [gate] = await ctx.db
        .select()
        .from(gateApprovals)
        .where(eq(gateApprovals.id, input.gateId))
        .limit(1);

      if (!gate) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Gate approval not found.' });
      }

      if (gate.status !== 'pending') {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Gate is already '${gate.status}' and cannot be escalated.`,
        });
      }

      // Update gate status and reassign
      const [updated] = await ctx.db
        .update(gateApprovals)
        .set({
          status: 'escalated',
          assignedTo: input.escalateTo,
          reviewComment: `Escalated by ${ctx.user.name}: ${input.reason}`,
          respondedAt: new Date(),
        })
        .where(eq(gateApprovals.id, input.gateId))
        .returning();

      // Create a new pending gate for the escalation targets
      await ctx.db.insert(gateApprovals).values({
        executionId: gate.executionId,
        stepId: gate.stepId,
        gateNodeId: gate.gateNodeId,
        status: 'pending',
        assignedTo: input.escalateTo,
        payload: {
          ...gate.payload,
          escalatedFrom: gate.id,
          escalationReason: input.reason,
          escalatedBy: ctx.user.id,
        },
        timeoutAt: gate.timeoutAt,
      });

      await inngest.send({
        name: 'gate/responded',
        data: {
          gateId: gate.id,
          executionId: gate.executionId,
          nodeId: gate.gateNodeId,
          action: 'escalate',
          userId: ctx.user.id,
          comment: input.reason,
        },
      });

      return updated!;
    }),
});
