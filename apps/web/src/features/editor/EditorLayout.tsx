'use client';

import { useCallback, useState, type DragEvent } from 'react';
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
} from 'lucide-react';
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
import {
  NODE_REGISTRY,
  getNodesByCategory,
  type NodeType,
  type NodeRegistryEntry,
} from '@toa/shared';
import { Canvas } from '@/features/canvas/Canvas';
import { CanvasToolbar } from '@/features/canvas/CanvasToolbar';
import { NodeInspector } from '@/features/editor/NodeInspector';
import { useUIStore } from '@/stores/ui-store';
import { useCanvasStore } from '@/stores/canvas-store';

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

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

const CATEGORY_LABELS: Record<NodeRegistryEntry['category'], string> = {
  triggers: 'Triggers',
  agents: 'Agents & Teams',
  logic: 'Logic & Flow',
  tools: 'Tools',
  memory: 'Memory',
  output: 'Output',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Node Palette (left panel)
// ---------------------------------------------------------------------------

function NodePalette() {
  const search = useUIStore((s) => s.nodePaletteSearch);
  const setSearch = useUIStore((s) => s.setNodePaletteSearch);
  const nodesByCategory = getNodesByCategory();

  const onDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, nodeType: NodeType) => {
      event.dataTransfer.setData('application/toa-node-type', nodeType);
      event.dataTransfer.effectAllowed = 'move';
    },
    [],
  );

  // Filter nodes by search
  const filteredCategories = Object.entries(nodesByCategory)
    .map(([category, types]) => {
      const filtered = types.filter((type) => {
        const entry = NODE_REGISTRY[type];
        return (
          entry.label.toLowerCase().includes(search.toLowerCase()) ||
          type.toLowerCase().includes(search.toLowerCase())
        );
      });
      return [category, filtered] as [NodeRegistryEntry['category'], NodeType[]];
    })
    .filter(([_, types]) => types.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Node Palette
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search nodes..."
            className="h-8 w-full rounded-md border border-input bg-transparent pl-8 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filteredCategories.map(([category, types]) => (
          <div key={category} className="mb-4">
            <h4 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABELS[category]}
            </h4>
            <div className="space-y-1">
              {types.map((type) => {
                const entry = NODE_REGISTRY[type];
                const Icon = ICON_MAP[entry.icon];
                return (
                  <div
                    key={type}
                    draggable
                    onDragStart={(e) => onDragStart(e, type)}
                    className="flex cursor-grab items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 transition-colors hover:border-border hover:bg-accent active:cursor-grabbing"
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md text-white ${entry.color}`}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <span className="text-xs font-medium text-foreground">
                      {entry.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor Layout
// ---------------------------------------------------------------------------

interface EditorLayoutProps {
  projectId: string;
  workflowId: string;
}

export function EditorLayout({ projectId, workflowId }: EditorLayoutProps) {
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const selectedNodeIds = useCanvasStore((s) => s.selectedNodeIds);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const definition = useCanvasStore.getState().getDefinition();
    // TODO: Save via tRPC mutation
    await new Promise((r) => setTimeout(r, 500));
    useCanvasStore.getState().markSaved();
    setIsSaving(false);
  }, []);

  const handleRun = useCallback(async () => {
    // TODO: Trigger execution via tRPC mutation and navigate to run page
    console.info('Run workflow');
  }, []);

  // Show right panel when a node is selected
  const showRightPanel = rightPanelOpen && selectedNodeIds.length === 1;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <CanvasToolbar
        workflowName="Untitled Workflow"
        projectId={projectId}
        workflowId={workflowId}
        isSaving={isSaving}
        onSave={handleSave}
        onRun={handleRun}
      />

      {/* Three-panel layout */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Left Panel: Node Palette */}
        {leftPanelOpen && (
          <div className="w-56 shrink-0 border-r border-border bg-background">
            <NodePalette />
          </div>
        )}

        {/* Panel toggle buttons */}
        <button
          onClick={toggleLeftPanel}
          className="absolute left-0 top-2 z-10 rounded-r-md border border-l-0 border-border bg-background p-1 text-muted-foreground hover:text-foreground"
          style={{ left: leftPanelOpen ? '14rem' : 0 }}
          title={leftPanelOpen ? 'Close palette' : 'Open palette'}
        >
          {leftPanelOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>

        {/* Center: Canvas */}
        <div className="flex-1">
          <Canvas />
        </div>

        {/* Right panel toggle */}
        {selectedNodeIds.length === 1 && (
          <button
            onClick={toggleRightPanel}
            className="absolute right-0 top-2 z-10 rounded-l-md border border-r-0 border-border bg-background p-1 text-muted-foreground hover:text-foreground"
            style={{ right: showRightPanel ? '20rem' : 0 }}
            title={showRightPanel ? 'Close inspector' : 'Open inspector'}
          >
            {showRightPanel ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Right Panel: Node Inspector */}
        {showRightPanel && (
          <div className="w-80 shrink-0 border-l border-border bg-background">
            <NodeInspector />
          </div>
        )}
      </div>
    </div>
  );
}
