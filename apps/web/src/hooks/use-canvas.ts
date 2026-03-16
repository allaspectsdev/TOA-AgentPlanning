import { useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvas-store';
import type { NodeType, Position, WorkflowNode } from '@toa/shared';
import { NODE_REGISTRY } from '@toa/shared';

/**
 * Custom hook wrapping common canvas store operations with convenient
 * React Flow integration and memoised selectors.
 */
export function useCanvas() {
  const reactFlowInstance = useReactFlow();

  // --- Store selectors ---
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const selectedEdgeIds = useCanvasStore((s) => s.selectedEdgeIds);
  const isDirty = useCanvasStore((s) => s.isDirty);
  const onNodesChange = useCanvasStore((s) => s.onNodesChange);
  const onEdgesChange = useCanvasStore((s) => s.onEdgesChange);
  const onConnect = useCanvasStore((s) => s.onConnect);

  // --- Store actions ---
  const addNodeAction = useCanvasStore((s) => s.addNode);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const removeNodes = useCanvasStore((s) => s.removeNodes);
  const removeEdges = useCanvasStore((s) => s.removeEdges);
  const duplicateNodes = useCanvasStore((s) => s.duplicateNodes);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const validate = useCanvasStore((s) => s.validate);
  const getDefinition = useCanvasStore((s) => s.getDefinition);
  const loadDefinition = useCanvasStore((s) => s.loadDefinition);
  const markSaved = useCanvasStore((s) => s.markSaved);

  const canUndo = useCanvasStore((s) => s.undoStack.length > 0);
  const canRedo = useCanvasStore((s) => s.redoStack.length > 0);

  // --- Derived data ---

  /** The single selected node, or null if zero or multiple are selected. */
  const selectedNode = useMemo<CanvasNode | null>(() => {
    if (selectedNodeIds.length !== 1) return null;
    return nodes.find((n) => n.id === selectedNodeIds[0]) ?? null;
  }, [nodes, selectedNodeIds]);

  /** Typed data of the selected node. */
  const selectedNodeData = useMemo(() => {
    return selectedNode?.data ?? null;
  }, [selectedNode]);

  /** Node type of the selected node. */
  const selectedNodeType = useMemo(() => {
    return (selectedNode?.type as NodeType) ?? null;
  }, [selectedNode]);

  // --- Actions ---

  /**
   * Add a node at the center of the current viewport (screen coords are
   * converted to flow coords).
   */
  const addNodeAtCenter = useCallback(
    (type: NodeType) => {
      const viewportCenter = reactFlowInstance.screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      return addNodeAction(type, viewportCenter);
    },
    [reactFlowInstance, addNodeAction],
  );

  /**
   * Add a node at a specific screen position (e.g., from a drag-and-drop
   * event). Converts screen coordinates to flow coordinates automatically.
   */
  const addNodeAtScreenPosition = useCallback(
    (type: NodeType, screenX: number, screenY: number) => {
      const position = reactFlowInstance.screenToFlowPosition({
        x: screenX,
        y: screenY,
      });
      return addNodeAction(type, position);
    },
    [reactFlowInstance, addNodeAction],
  );

  /** Delete the currently selected nodes and edges. */
  const deleteSelection = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      removeNodes(selectedNodeIds);
    }
    if (selectedEdgeIds.length > 0) {
      removeEdges(selectedEdgeIds);
    }
  }, [selectedNodeIds, selectedEdgeIds, removeNodes, removeEdges]);

  /** Duplicate currently selected nodes. */
  const duplicateSelection = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      duplicateNodes(selectedNodeIds);
    }
  }, [selectedNodeIds, duplicateNodes]);

  /** Zoom to fit all nodes. */
  const zoomToFit = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlowInstance]);

  return {
    // State
    nodes,
    edges,
    selectedNodeIds,
    selectedEdgeIds,
    selectedNode,
    selectedNodeData,
    selectedNodeType,
    isDirty,
    canUndo,
    canRedo,

    // React Flow callbacks
    onNodesChange,
    onEdgesChange,
    onConnect,

    // Node operations
    addNodeAtCenter,
    addNodeAtScreenPosition,
    updateNodeData,
    removeNodes,
    deleteSelection,
    duplicateSelection,

    // History
    undo,
    redo,

    // Serialization
    validate,
    getDefinition,
    loadDefinition,
    markSaved,

    // Viewport
    zoomToFit,
  };
}
