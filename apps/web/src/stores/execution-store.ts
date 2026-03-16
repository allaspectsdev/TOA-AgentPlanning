import { create } from 'zustand';
import type {
  ExecutionStatus,
  StepStatus,
  ExecutionEvent,
  ExecutionLogEntry,
  TokenUsage,
  GateApproval,
} from '@toa/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StepState {
  nodeId: string;
  nodeType: string;
  status: StepStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  tokenUsage?: TokenUsage;
}

export interface ExecutionState {
  /** Currently active execution ID (null when not monitoring). */
  activeExecutionId: string | null;

  /** Overall execution status. */
  status: ExecutionStatus | null;

  /** Per-node step states keyed by node ID. */
  steps: Record<string, StepState>;

  /** Execution log entries. */
  logs: ExecutionLogEntry[];

  /** Gates pending human input. */
  pendingGates: GateApproval[];

  /** WebSocket connection instance. */
  _ws: WebSocket | null;

  /** Whether we are currently connected. */
  isConnected: boolean;

  // --- Actions ---
  connectToExecution: (executionId: string) => void;
  disconnect: () => void;
  handleEvent: (event: ExecutionEvent) => void;
  reset: () => void;

  /** Submit a gate action (approve/reject). */
  submitGateAction: (
    gateId: string,
    action: 'approve' | 'reject',
    comment?: string,
  ) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:4000/ws';

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  activeExecutionId: null,
  status: null,
  steps: {},
  logs: [],
  pendingGates: [],
  _ws: null,
  isConnected: false,

  connectToExecution: (executionId: string) => {
    const state = get();

    // Clean up any existing connection
    if (state._ws) {
      state._ws.close();
    }

    set({
      activeExecutionId: executionId,
      status: 'pending',
      steps: {},
      logs: [],
      pendingGates: [],
      isConnected: false,
    });

    try {
      const ws = new WebSocket(`${WS_URL}/executions/${executionId}`);

      ws.onopen = () => {
        set({ isConnected: true });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as ExecutionEvent;
          get().handleEvent(data);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        set({ isConnected: false, _ws: null });
      };

      ws.onerror = () => {
        set({ isConnected: false });
      };

      set({ _ws: ws });
    } catch {
      set({ isConnected: false });
    }
  },

  disconnect: () => {
    const { _ws } = get();
    if (_ws) {
      _ws.close();
    }
    set({
      _ws: null,
      isConnected: false,
      activeExecutionId: null,
    });
  },

  handleEvent: (event: ExecutionEvent) => {
    switch (event.type) {
      case 'execution.started':
        set({ status: 'running' });
        break;

      case 'execution.completed':
        set({ status: 'completed' });
        break;

      case 'execution.failed':
        set({ status: 'failed' });
        break;

      case 'step.started':
        set((state) => ({
          steps: {
            ...state.steps,
            [event.nodeId]: {
              nodeId: event.nodeId,
              nodeType: event.nodeType,
              status: 'running',
              startedAt: event.timestamp,
            },
          },
        }));
        break;

      case 'step.completed':
        set((state) => ({
          steps: {
            ...state.steps,
            [event.nodeId]: {
              ...state.steps[event.nodeId]!,
              status: 'completed',
              output: event.output,
              completedAt: event.timestamp,
              durationMs: event.durationMs,
              tokenUsage: event.tokenUsage,
            },
          },
        }));
        break;

      case 'step.failed':
        set((state) => ({
          steps: {
            ...state.steps,
            [event.nodeId]: {
              ...state.steps[event.nodeId]!,
              status: 'failed',
              error: event.error,
              completedAt: event.timestamp,
            },
          },
        }));
        break;

      case 'step.output':
        // Streaming partial output
        set((state) => {
          const existing = state.steps[event.nodeId];
          const currentOutput = (existing?.output ?? {}) as Record<
            string,
            unknown
          >;
          const existingChunks =
            (currentOutput._streamChunks as string[] | undefined) ?? [];
          return {
            steps: {
              ...state.steps,
              [event.nodeId]: {
                ...existing!,
                output: {
                  ...currentOutput,
                  _streamChunks: [...existingChunks, event.chunk],
                  _streamText:
                    ((currentOutput._streamText as string) ?? '') +
                    event.chunk,
                },
              },
            },
          };
        });
        break;

      case 'gate.waiting':
        set((state) => {
          // Update step status
          const updatedSteps = {
            ...state.steps,
            [event.nodeId]: {
              ...state.steps[event.nodeId]!,
              status: 'waiting_for_input' as StepStatus,
            },
          };

          // Add placeholder gate
          const newGate: GateApproval = {
            id: `gate_${event.nodeId}_${Date.now()}`,
            executionId: event.executionId,
            nodeId: event.nodeId,
            status: 'waiting',
            gateType: event.gateType as GateApproval['gateType'],
            assignees: event.assignees,
            assignmentStrategy: 'any',
            responses: [],
            timeoutMinutes: 60,
            timeoutAction: 'approve',
            createdAt: event.timestamp,
          };

          return {
            steps: updatedSteps,
            pendingGates: [...state.pendingGates, newGate],
            status: 'paused',
          };
        });
        break;

      case 'execution.log':
        set((state) => ({
          logs: [
            ...state.logs,
            {
              timestamp: event.timestamp,
              level: event.level,
              message: event.message,
              data: event.data,
            },
          ],
        }));
        break;
    }
  },

  reset: () => {
    const { _ws } = get();
    if (_ws) _ws.close();

    set({
      activeExecutionId: null,
      status: null,
      steps: {},
      logs: [],
      pendingGates: [],
      _ws: null,
      isConnected: false,
    });
  },

  submitGateAction: async (
    gateId: string,
    action: 'approve' | 'reject',
    comment?: string,
  ) => {
    const { activeExecutionId } = get();
    if (!activeExecutionId) return;

    const API_URL =
      process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

    await fetch(`${API_URL}/executions/${activeExecutionId}/gates/${gateId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        type: action,
        gateId,
        userId: 'current-user', // TODO: get from auth context
        comment,
      }),
    });

    // Remove the gate from pending
    set((state) => ({
      pendingGates: state.pendingGates.filter((g) => g.id !== gateId),
    }));
  },
}));
