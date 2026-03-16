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
  /** Tailwind colour class used for the node header. */
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
    color: 'bg-violet-500',
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
    color: 'bg-indigo-500',
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
    color: 'bg-amber-500',
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
    color: 'bg-orange-500',
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
    color: 'bg-cyan-500',
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
    color: 'bg-emerald-500',
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
    color: 'bg-pink-500',
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
    color: 'bg-blue-500',
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
    color: 'bg-teal-500',
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
    color: 'bg-gray-400',
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
