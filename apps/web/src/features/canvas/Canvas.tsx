'use client';

import { useCallback, useMemo, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
  type EdgeTypes,
  type DefaultEdgeOptions,
  type OnNodeDrag,
  type IsValidConnection,
  type Viewport,
} from '@xyflow/react';
import type { NodeType } from '@toa/shared';
import { useCanvas } from '@/hooks/use-canvas';
import { useCanvasStore } from '@/stores/canvas-store';
import { useUIStore } from '@/stores/ui-store';
import { useExecutionStore } from '@/stores/execution-store';

// ---------------------------------------------------------------------------
// Custom Node Component (generic for all types)
// ---------------------------------------------------------------------------

import {
  Bot,
  Users,
  Zap,
  ShieldCheck,
  GitBranch,
  Wrench,
  Database,
  Send,
  Workflow,
  StickyNote,
} from 'lucide-react';
import { NODE_REGISTRY } from '@toa/shared';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bot,
  Users,
  Zap,
  ShieldCheck,
  GitBranch,
  Wrench,
  Database,
  Send,
  Workflow,
  StickyNote,
};

function WorkflowNodeComponent({ data, type, selected, id }: NodeProps<Node>) {
  const nodeType = type as NodeType;
  const registry = NODE_REGISTRY[nodeType];
  if (!registry) return null;

  const Icon = ICON_MAP[registry.icon];
  const nodeData = data as Record<string, unknown>;
  const label = (nodeData.label as string) ?? registry.label;
  const description = (nodeData.description as string) ?? '';

  // Execution status from execution store
  const stepState = useExecutionStore((s) => s.steps[id]);
  const executionStatus = stepState?.status;

  return (
    <div
      className={`workflow-node ${selected ? 'selected' : ''}`}
      data-status={executionStatus}
    >
      {/* Input handles */}
      {registry.defaultPorts.inputs.map((port, i) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{ top: `${((i + 1) / (registry.defaultPorts.inputs.length + 1)) * 100}%` }}
        />
      ))}

      {/* Header */}
      <div
        className="workflow-node-header"
        style={{ backgroundColor: registry.color }}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span className="truncate">{label}</span>
      </div>

      {/* Body */}
      {description && (
        <div className="workflow-node-body">
          <p className="line-clamp-2">{description}</p>
        </div>
      )}

      {/* Execution status indicator */}
      {executionStatus && (
        <div className="px-3 pb-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              executionStatus === 'completed'
                ? 'bg-green-500/15 text-green-400'
                : executionStatus === 'running'
                  ? 'bg-blue-500/15 text-blue-400'
                  : executionStatus === 'failed'
                    ? 'bg-red-500/15 text-red-400'
                    : executionStatus === 'waiting_for_input'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-secondary text-muted-foreground'
            }`}
          >
            {executionStatus.replace('_', ' ')}
          </span>
        </div>
      )}

      {/* Output handles */}
      {registry.defaultPorts.outputs.map((port, i) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{
            top: `${((i + 1) / (registry.defaultPorts.outputs.length + 1)) * 100}%`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Node & Edge Type Registrations
// ---------------------------------------------------------------------------

const nodeTypes: NodeTypes = {
  agent: WorkflowNodeComponent,
  team: WorkflowNodeComponent,
  trigger: WorkflowNodeComponent,
  gate: WorkflowNodeComponent,
  condition: WorkflowNodeComponent,
  tool: WorkflowNodeComponent,
  memory: WorkflowNodeComponent,
  output: WorkflowNodeComponent,
  subflow: WorkflowNodeComponent,
  note: WorkflowNodeComponent,
};

const edgeTypes: EdgeTypes = {
  // Custom edge types can be registered here when needed:
  // data: DataEdge,
  // conditional: ConditionalEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'smoothstep',
  animated: false,
  style: { strokeWidth: 2 },
};

const connectionLineStyle = {
  strokeWidth: 2,
  strokeDasharray: '6 3',
};

// ---------------------------------------------------------------------------
// Canvas Component
// ---------------------------------------------------------------------------

export function Canvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNodeAtScreenPosition,
  } = useCanvas();

  const setViewport = useCanvasStore((s) => s.setViewport);
  const setRightPanelOpen = useUIStore((s) => s.setRightPanelOpen);
  const setSelectedNodes = useCanvasStore((s) => s.setSelectedNodes);

  // --- Drag & drop from palette ---
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData(
        'application/toa-node-type',
      ) as NodeType;
      if (!type) return;

      addNodeAtScreenPosition(type, event.clientX, event.clientY);
    },
    [addNodeAtScreenPosition],
  );

  // --- Node click to open inspector ---
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodes([node.id]);
      setRightPanelOpen(true);
    },
    [setSelectedNodes, setRightPanelOpen],
  );

  // --- Pane click to deselect ---
  const onPaneClick = useCallback(() => {
    setSelectedNodes([]);
    setRightPanelOpen(false);
  }, [setSelectedNodes, setRightPanelOpen]);

  // --- Connection validation ---
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      // Prevent self-connections
      if (connection.source === connection.target) return false;

      // Prevent duplicate edges
      const exists = edges.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          e.sourceHandle === connection.sourceHandle &&
          e.targetHandle === connection.targetHandle,
      );
      return !exists;
    },
    [edges],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        isValidConnection={isValidConnection}
        connectionLineStyle={connectionLineStyle}
        onMoveEnd={(_event: MouseEvent | TouchEvent | null, viewport: Viewport) =>
          setViewport({
            x: viewport.x,
            y: viewport.y,
            zoom: viewport.zoom,
          })
        }
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode="Shift"
        selectionOnDrag
        panOnScroll
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color="var(--color-canvas-dots)"
        />
        <Controls showZoom showFitView showInteractive={false} />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{ width: 160, height: 120 }}
        />
      </ReactFlow>
    </div>
  );
}
