// ---------------------------------------------------------------------------
// Node Registry — metadata for every node type
// ---------------------------------------------------------------------------

import type { NodeType, Port } from '../types/nodes';

export interface NodeRegistryEntry {
  /** Human-readable label shown in the palette. */
  label: string;
  /** Grouping category for the node palette. */
  category: 'triggers' | 'agents' | 'logic' | 'tools' | 'memory' | 'output' | 'other';
  /** Lucide icon name (camelCase). */
  icon: string;
  /** Hex color for the node header/accent. */
  color: string;
  /** Default input/output ports when a node is first created. */
  defaultPorts: { inputs: Port[]; outputs: Port[] };
  /** Whether the engine will attempt to execute this node type. */
  isExecutable: boolean;
}

/** Canonical registry mapping each `NodeType` to its metadata. */
export const NODE_REGISTRY: Record<NodeType, NodeRegistryEntry> = {
  agent: {
    label: 'Agent',
    category: 'agents',
    icon: 'Bot',
    color: '#8b5cf6',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }],
      outputs: [{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }],
    },
    isExecutable: true,
  },

  team: {
    label: 'Team',
    category: 'agents',
    icon: 'Users',
    color: '#6366f1',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }],
      outputs: [{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }],
    },
    isExecutable: true,
  },

  trigger: {
    label: 'Trigger',
    category: 'triggers',
    icon: 'Zap',
    color: '#f59e0b',
    defaultPorts: {
      inputs: [],
      outputs: [{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }],
    },
    isExecutable: true,
  },

  gate: {
    label: 'Gate',
    category: 'logic',
    icon: 'ShieldCheck',
    color: '#f97316',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }],
      outputs: [
        { id: 'approved', type: 'output', label: 'Approved', dataType: 'any' },
        { id: 'rejected', type: 'output', label: 'Rejected', dataType: 'any' },
      ],
    },
    isExecutable: true,
  },

  condition: {
    label: 'Condition',
    category: 'logic',
    icon: 'GitBranch',
    color: '#06b6d4',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }],
      outputs: [
        { id: 'true', type: 'output', label: 'True', dataType: 'any' },
        { id: 'false', type: 'output', label: 'False', dataType: 'any' },
      ],
    },
    isExecutable: true,
  },

  tool: {
    label: 'Tool',
    category: 'tools',
    icon: 'Wrench',
    color: '#10b981',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }],
      outputs: [{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }],
    },
    isExecutable: true,
  },

  memory: {
    label: 'Memory',
    category: 'memory',
    icon: 'Database',
    color: '#ec4899',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }],
      outputs: [{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }],
    },
    isExecutable: true,
  },

  output: {
    label: 'Output',
    category: 'output',
    icon: 'Send',
    color: '#3b82f6',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }],
      outputs: [],
    },
    isExecutable: true,
  },

  subflow: {
    label: 'Subflow',
    category: 'logic',
    icon: 'Workflow',
    color: '#14b8a6',
    defaultPorts: {
      inputs: [{ id: 'input', type: 'input', label: 'Input', dataType: 'any' }],
      outputs: [{ id: 'output', type: 'output', label: 'Output', dataType: 'any' }],
    },
    isExecutable: true,
  },

  note: {
    label: 'Note',
    category: 'other',
    icon: 'StickyNote',
    color: '#9ca3af',
    defaultPorts: {
      inputs: [],
      outputs: [],
    },
    isExecutable: false,
  },
} as const;

/** All available node types in palette order. */
export const NODE_TYPES = Object.keys(NODE_REGISTRY) as NodeType[];

/** Node types grouped by category. */
export function getNodesByCategory(): Record<NodeRegistryEntry['category'], NodeType[]> {
  const groups: Record<string, NodeType[]> = {};
  for (const [type, entry] of Object.entries(NODE_REGISTRY)) {
    const cat = entry.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(type as NodeType);
  }
  return groups as Record<NodeRegistryEntry['category'], NodeType[]>;
}
