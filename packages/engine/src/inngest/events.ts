// ---------------------------------------------------------------------------
// Inngest Event Definitions
// ---------------------------------------------------------------------------

/**
 * All custom events that flow through the Inngest event bus.
 * Each key is the event name; the value is its `data` payload.
 */
export type Events = {
  /**
   * Trigger a full workflow execution.
   * Sent by the API layer when a user or webhook kicks off a run.
   */
  'workflow/execute': {
    data: {
      executionId: string;
      workflowId: string;
      versionId: string;
      input: Record<string, unknown>;
      triggeredBy: string;
      environmentId?: string;
      metadata?: Record<string, unknown>;
    };
  };

  /**
   * A human has responded to a HITL gate.
   * Sent by the API when a gate approval / rejection is submitted.
   */
  'gate/responded': {
    data: {
      gateId: string;
      executionId: string;
      nodeId: string;
      action: 'approve' | 'reject' | 'request_changes' | 'escalate' | 'submit_input';
      userId: string;
      comment?: string;
      inputData?: Record<string, unknown>;
    };
  };

  /**
   * Broadcast when a step within an execution completes successfully.
   * Other Inngest functions (or external listeners) can react to this.
   */
  'execution/step.completed': {
    data: {
      executionId: string;
      nodeId: string;
      nodeType: string;
      output: Record<string, unknown>;
      durationMs: number;
    };
  };

  /**
   * Broadcast when a step within an execution fails.
   */
  'execution/step.failed': {
    data: {
      executionId: string;
      nodeId: string;
      nodeType: string;
      error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
      };
    };
  };
};

/** Helper — extract the data payload type for a given event name. */
export type EventData<K extends keyof Events> = Events[K]['data'];
