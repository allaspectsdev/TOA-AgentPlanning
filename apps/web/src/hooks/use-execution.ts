import { useEffect, useCallback } from 'react';
import { useExecutionStore, type StepState } from '@/stores/execution-store';
import type { ExecutionStatus, GateApproval } from '@toa/shared';

/**
 * Custom hook for execution monitoring.
 * Connects to a WebSocket on mount when an executionId is provided,
 * and disconnects on unmount.
 */
export function useExecution(executionId: string | null) {
  const connectToExecution = useExecutionStore((s) => s.connectToExecution);
  const disconnect = useExecutionStore((s) => s.disconnect);
  const reset = useExecutionStore((s) => s.reset);

  const activeExecutionId = useExecutionStore((s) => s.activeExecutionId);
  const status = useExecutionStore((s) => s.status);
  const steps = useExecutionStore((s) => s.steps);
  const logs = useExecutionStore((s) => s.logs);
  const pendingGates = useExecutionStore((s) => s.pendingGates);
  const isConnected = useExecutionStore((s) => s.isConnected);
  const submitGateAction = useExecutionStore((s) => s.submitGateAction);

  // Connect on mount / when executionId changes
  useEffect(() => {
    if (!executionId) return;

    connectToExecution(executionId);

    return () => {
      disconnect();
    };
  }, [executionId, connectToExecution, disconnect]);

  /** Get the step state for a specific node. */
  const getStepForNode = useCallback(
    (nodeId: string): StepState | null => {
      return steps[nodeId] ?? null;
    },
    [steps],
  );

  /** Check whether any gates are pending. */
  const hasPendingGates = pendingGates.length > 0;

  /** Whether the execution is in a terminal state. */
  const isTerminal =
    status === 'completed' ||
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'timed_out';

  /** Whether the execution is actively running. */
  const isRunning = status === 'running';

  /** Whether the execution is paused (waiting on a gate). */
  const isPaused = status === 'paused';

  /** Approve a pending gate. */
  const approveGate = useCallback(
    async (gateId: string, comment?: string) => {
      await submitGateAction(gateId, 'approve', comment);
    },
    [submitGateAction],
  );

  /** Reject a pending gate. */
  const rejectGate = useCallback(
    async (gateId: string, comment?: string) => {
      await submitGateAction(gateId, 'reject', comment);
    },
    [submitGateAction],
  );

  return {
    activeExecutionId,
    status,
    steps,
    logs,
    pendingGates,
    isConnected,
    isRunning,
    isPaused,
    isTerminal,
    hasPendingGates,
    getStepForNode,
    approveGate,
    rejectGate,
    reset,
  };
}
