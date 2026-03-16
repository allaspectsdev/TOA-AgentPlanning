import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  applyNodeChanges,
  applyEdgeChanges,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Node,
  type Edge,
} from '@xyflow/react';
import type {
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  Position,
  Viewport,
  WorkflowSnapshot,
  BaseNodeData,
  AgentNodeData,
  TeamNodeData,
  TriggerNodeData,
  GateNodeData,
  ConditionNodeData,
  ToolNodeData,
  MemoryNodeData,
  OutputNodeData,
  SubflowNodeData,
  NoteNodeData,
} from '@toa/shared';
import {
  NODE_REGISTRY,
  DEFAULT_MODEL_ID,
  DEFAULT_AGENT_TEMPERATURE,
  DEFAULT_AGENT_MAX_TOKENS,
  DEFAULT_GATE_TIMEOUT_MINUTES,
} from '@toa/shared';
import {
  generateNodeId,
  generateEdgeId,
  validateGraph,
} from '@toa/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** React Flow node with our typed data. Use bare Node/Edge to avoid generic constraint issues with Record<string, unknown>. */
export type CanvasNode = Node;
/** React Flow edge with our typed data. */
export type CanvasEdge = Edge;

export interface ValidationError {
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface CanvasState {
  // --- Graph state ---
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;

  // --- Selection ---
  selectedNodeIds: string[];
  selectedEdgeIds: string[];

  // --- Undo/Redo ---
  undoStack: WorkflowSnapshot[];
  redoStack: WorkflowSnapshot[];

  // --- Dirty tracking ---
  isDirty: boolean;
  lastSavedSnapshot: WorkflowSnapshot | null;

  // --- React Flow callbacks ---
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // --- Node operations ---
  addNode: (type: NodeType, position: Position) => string;
  updateNodeData: (nodeId: string, data: Partial<BaseNodeData> & Record<string, unknown>) => void;
  removeNodes: (nodeIds: string[]) => void;
  duplicateNodes: (nodeIds: string[]) => void;

  // --- Edge operations ---
  removeEdges: (edgeIds: string[]) => void;

  // --- Selection ---
  setSelectedNodes: (nodeIds: string[]) => void;
  setSelectedEdges: (edgeIds: string[]) => void;
  clearSelection: () => void;

  // --- Viewport ---
  setViewport: (viewport: Viewport) => void;

  // --- History ---
  undo: () => void;
  redo: () => void;
  pushSnapshot: () => void;

  // --- Serialization ---
  getDefinition: () => WorkflowSnapshot;
  loadDefinition: (def: WorkflowSnapshot) => void;

  // --- Validation ---
  validate: () => ValidationError[];

  // --- Dirty tracking ---
  markSaved: () => void;
}

// ---------------------------------------------------------------------------
// Default node data factories
// ---------------------------------------------------------------------------

function createDefaultNodeData(type: NodeType): WorkflowNode['data'] {
  const registry = NODE_REGISTRY[type];
  const base: BaseNodeData = {
    label: registry.label,
    description: '',
    disabled: false,
  };

  switch (type) {
    case 'agent':
      return {
        ...base,
        model: DEFAULT_MODEL_ID,
        systemPrompt: '',
        temperature: DEFAULT_AGENT_TEMPERATURE,
        maxTokens: DEFAULT_AGENT_MAX_TOKENS,
        tools: [],
      } satisfies AgentNodeData;

    case 'team':
      return {
        ...base,
        pattern: 'sequential',
        agents: [],
        communicationProtocol: 'shared_context',
      } satisfies TeamNodeData;

    case 'trigger':
      return {
        ...base,
        triggerType: 'manual',
      } satisfies TriggerNodeData;

    case 'gate':
      return {
        ...base,
        gateType: 'approval',
        assignmentStrategy: 'any',
        timeoutMinutes: DEFAULT_GATE_TIMEOUT_MINUTES,
        timeoutAction: 'approve',
        notificationChannels: ['in_app'],
      } satisfies GateNodeData;

    case 'condition':
      return {
        ...base,
        conditionType: 'if_else',
      } satisfies ConditionNodeData;

    case 'tool':
      return {
        ...base,
        toolType: 'http_request',
      } satisfies ToolNodeData;

    case 'memory':
      return {
        ...base,
        memoryType: 'conversation_buffer',
        operation: 'read',
      } satisfies MemoryNodeData;

    case 'output':
      return {
        ...base,
        outputType: 'return',
        format: 'json',
      } satisfies OutputNodeData;

    case 'subflow':
      return {
        ...base,
        workflowId: '',
        inputMapping: {},
        outputMapping: {},
        waitForCompletion: true,
      } satisfies SubflowNodeData;

    case 'note':
      return {
        ...base,
        content: '',
        color: '#6366f1',
      } satisfies NoteNodeData;

    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown node type: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Snapshot helpers
// ---------------------------------------------------------------------------

function snapshotFromState(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  viewport: Viewport,
): WorkflowSnapshot {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as WorkflowNode['type'],
      position: n.position,
      data: n.data as unknown as WorkflowNode['data'],
      measured: n.measured
        ? { width: n.measured.width ?? 0, height: n.measured.height ?? 0 }
        : undefined,
      ports: NODE_REGISTRY[n.type as NodeType]?.defaultPorts,
    })) as WorkflowNode[],
    edges: edges.map((e) => ({
      id: e.id,
      type: (e.type ?? 'data') as WorkflowEdge['type'],
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? undefined,
      targetHandle: e.targetHandle ?? undefined,
      data: e.data,
    })) as WorkflowEdge[],
    viewport,
  };
}

function canvasNodesFromSnapshot(
  snapshot: WorkflowSnapshot,
): CanvasNode[] {
  return snapshot.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data as unknown as Record<string, unknown>,
    measured: n.measured,
  })) as CanvasNode[];
}

function canvasEdgesFromSnapshot(
  snapshot: WorkflowSnapshot,
): CanvasEdge[] {
  return snapshot.edges.map((e) => ({
    id: e.id,
    type: e.type,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    data: e.data,
  }));
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const MAX_UNDO_STACK = 50;

export const useCanvasStore = create<CanvasState>()(
  subscribeWithSelector((set, get) => ({
    // --- Initial state ---
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    selectedNodeIds: [],
    selectedEdgeIds: [],
    undoStack: [],
    redoStack: [],
    isDirty: false,
    lastSavedSnapshot: null,

    // --- React Flow callbacks ---
    onNodesChange: (changes: NodeChange[]) => {
      set((state) => {
        const nextNodes = applyNodeChanges(changes, state.nodes) as CanvasNode[];

        // Track selection changes
        const selectedNodeIds = nextNodes
          .filter((n) => n.selected)
          .map((n) => n.id);

        // Only mark dirty for non-selection changes
        const hasMutations = changes.some(
          (c) => c.type !== 'select' && c.type !== 'dimensions',
        );

        return {
          nodes: nextNodes,
          selectedNodeIds,
          isDirty: state.isDirty || hasMutations,
        };
      });
    },

    onEdgesChange: (changes: EdgeChange[]) => {
      set((state) => {
        const nextEdges = applyEdgeChanges(changes, state.edges) as CanvasEdge[];

        const selectedEdgeIds = nextEdges
          .filter((e) => e.selected)
          .map((e) => e.id);

        const hasMutations = changes.some((c) => c.type !== 'select');

        return {
          edges: nextEdges,
          selectedEdgeIds,
          isDirty: state.isDirty || hasMutations,
        };
      });
    },

    onConnect: (connection: Connection) => {
      const state = get();
      state.pushSnapshot();

      const edgeId = generateEdgeId();
      const newEdge: CanvasEdge = {
        id: edgeId,
        type: 'data',
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      };

      set((s) => ({
        edges: [...s.edges, newEdge],
        isDirty: true,
      }));
    },

    // --- Node operations ---
    addNode: (type: NodeType, position: Position): string => {
      const state = get();
      state.pushSnapshot();

      const nodeId = generateNodeId();
      const data = createDefaultNodeData(type);
      const registry = NODE_REGISTRY[type];

      const newNode: CanvasNode = {
        id: nodeId,
        type,
        position,
        data: data as unknown as CanvasNode['data'],
      };

      set((s) => ({
        nodes: [...s.nodes, newNode],
        isDirty: true,
      }));

      return nodeId;
    },

    updateNodeData: (
      nodeId: string,
      data: Partial<BaseNodeData> & Record<string, unknown>,
    ) => {
      set((state) => ({
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, ...data } as CanvasNode['data'] }
            : n,
        ),
        isDirty: true,
      }));
    },

    removeNodes: (nodeIds: string[]) => {
      const state = get();
      state.pushSnapshot();

      const nodeIdSet = new Set(nodeIds);
      set((s) => ({
        nodes: s.nodes.filter((n) => !nodeIdSet.has(n.id)),
        edges: s.edges.filter(
          (e) => !nodeIdSet.has(e.source) && !nodeIdSet.has(e.target),
        ),
        selectedNodeIds: s.selectedNodeIds.filter((id) => !nodeIdSet.has(id)),
        isDirty: true,
      }));
    },

    duplicateNodes: (nodeIds: string[]) => {
      const state = get();
      state.pushSnapshot();

      const nodeIdSet = new Set(nodeIds);
      const idMapping = new Map<string, string>();

      const newNodes = state.nodes
        .filter((n) => nodeIdSet.has(n.id))
        .map((n) => {
          const newId = generateNodeId();
          idMapping.set(n.id, newId);
          return {
            ...n,
            id: newId,
            position: { x: n.position.x + 50, y: n.position.y + 50 },
            selected: false,
          };
        });

      // Duplicate edges that are completely within the selection
      const newEdges = state.edges
        .filter(
          (e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target),
        )
        .map((e) => ({
          ...e,
          id: generateEdgeId(),
          source: idMapping.get(e.source) ?? e.source,
          target: idMapping.get(e.target) ?? e.target,
        }));

      set((s) => ({
        nodes: [...s.nodes, ...newNodes],
        edges: [...s.edges, ...newEdges],
        isDirty: true,
      }));
    },

    // --- Edge operations ---
    removeEdges: (edgeIds: string[]) => {
      const state = get();
      state.pushSnapshot();

      const edgeIdSet = new Set(edgeIds);
      set((s) => ({
        edges: s.edges.filter((e) => !edgeIdSet.has(e.id)),
        selectedEdgeIds: s.selectedEdgeIds.filter((id) => !edgeIdSet.has(id)),
        isDirty: true,
      }));
    },

    // --- Selection ---
    setSelectedNodes: (nodeIds: string[]) => {
      set({ selectedNodeIds: nodeIds });
    },

    setSelectedEdges: (edgeIds: string[]) => {
      set({ selectedEdgeIds: edgeIds });
    },

    clearSelection: () => {
      set({ selectedNodeIds: [], selectedEdgeIds: [] });
    },

    // --- Viewport ---
    setViewport: (viewport: Viewport) => {
      set({ viewport });
    },

    // --- History ---
    pushSnapshot: () => {
      const { nodes, edges, viewport, undoStack } = get();
      const snapshot = snapshotFromState(nodes, edges, viewport);
      const newStack = [...undoStack, snapshot].slice(-MAX_UNDO_STACK);
      set({ undoStack: newStack, redoStack: [] });
    },

    undo: () => {
      const { undoStack, nodes, edges, viewport } = get();
      if (undoStack.length === 0) return;

      const current = snapshotFromState(nodes, edges, viewport);
      const previous = undoStack[undoStack.length - 1]!;

      set((s) => ({
        nodes: canvasNodesFromSnapshot(previous),
        edges: canvasEdgesFromSnapshot(previous),
        viewport: previous.viewport ?? { x: 0, y: 0, zoom: 1 },
        undoStack: s.undoStack.slice(0, -1),
        redoStack: [...s.redoStack, current],
        isDirty: true,
      }));
    },

    redo: () => {
      const { redoStack, nodes, edges, viewport } = get();
      if (redoStack.length === 0) return;

      const current = snapshotFromState(nodes, edges, viewport);
      const next = redoStack[redoStack.length - 1]!;

      set((s) => ({
        nodes: canvasNodesFromSnapshot(next),
        edges: canvasEdgesFromSnapshot(next),
        viewport: next.viewport ?? { x: 0, y: 0, zoom: 1 },
        redoStack: s.redoStack.slice(0, -1),
        undoStack: [...s.undoStack, current],
        isDirty: true,
      }));
    },

    // --- Serialization ---
    getDefinition: (): WorkflowSnapshot => {
      const { nodes, edges, viewport } = get();
      return snapshotFromState(nodes, edges, viewport);
    },

    loadDefinition: (def: WorkflowSnapshot) => {
      set({
        nodes: canvasNodesFromSnapshot(def),
        edges: canvasEdgesFromSnapshot(def),
        viewport: def.viewport ?? { x: 0, y: 0, zoom: 1 },
        undoStack: [],
        redoStack: [],
        isDirty: false,
        lastSavedSnapshot: def,
        selectedNodeIds: [],
        selectedEdgeIds: [],
      });
    },

    // --- Validation ---
    validate: (): ValidationError[] => {
      const { nodes, edges } = get();

      const snapshot = snapshotFromState(nodes, edges, { x: 0, y: 0, zoom: 1 });
      const graphResult = validateGraph(snapshot.nodes, snapshot.edges);

      const errors: ValidationError[] = graphResult.errors.map((msg) => ({
        message: msg,
      }));

      // Check for nodes without labels
      for (const node of snapshot.nodes) {
        if (!node.data.label || node.data.label.trim() === '') {
          errors.push({
            nodeId: node.id,
            message: `Node "${node.id}" is missing a label.`,
          });
        }
      }

      // Check agent nodes have system prompts
      for (const node of snapshot.nodes) {
        if (node.type === 'agent') {
          const data = node.data as AgentNodeData;
          if (!data.systemPrompt || data.systemPrompt.trim() === '') {
            errors.push({
              nodeId: node.id,
              message: `Agent "${data.label}" is missing a system prompt.`,
            });
          }
        }
      }

      // Check trigger nodes exist
      const hasTrigger = snapshot.nodes.some((n) => n.type === 'trigger');
      if (snapshot.nodes.length > 0 && !hasTrigger) {
        errors.push({
          message:
            'Workflow has no trigger node. Add a trigger to define how the workflow starts.',
        });
      }

      return errors;
    },

    // --- Dirty tracking ---
    markSaved: () => {
      const { nodes, edges, viewport } = get();
      set({
        isDirty: false,
        lastSavedSnapshot: snapshotFromState(nodes, edges, viewport),
      });
    },
  })),
);
