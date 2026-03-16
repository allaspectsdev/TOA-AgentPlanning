'use client';

import { useMemo, useCallback } from 'react';
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
  Trash2,
  Copy,
} from 'lucide-react';
import { NODE_REGISTRY, AVAILABLE_MODELS } from '@toa/shared';
import type {
  NodeType,
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
import { useCanvas } from '@/hooks/use-canvas';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bot, Users, Zap, ShieldCheck, GitBranch, Wrench, Database, Send, Workflow, StickyNote,
};

// ---------------------------------------------------------------------------
// Shared field components
// ---------------------------------------------------------------------------

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="flex w-full rounded-md border border-input bg-transparent px-2.5 py-1.5 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="flex h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

function CheckboxInput({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-input"
      />
      {label}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Per-type configuration forms
// ---------------------------------------------------------------------------

function AgentFields({
  data,
  onUpdate,
}: {
  data: AgentNodeData;
  onUpdate: (d: Partial<AgentNodeData>) => void;
}) {
  return (
    <>
      <Field label="Model">
        <SelectInput
          value={data.model}
          onChange={(v) => onUpdate({ model: v })}
          options={AVAILABLE_MODELS.map((m) => ({
            label: `${m.name} (${m.provider})`,
            value: m.id,
          }))}
        />
      </Field>
      <Field label="System Prompt">
        <TextArea
          value={data.systemPrompt}
          onChange={(v) => onUpdate({ systemPrompt: v })}
          placeholder="You are a helpful assistant..."
          rows={6}
        />
      </Field>
      <Field label="Temperature">
        <NumberInput
          value={data.temperature}
          onChange={(v) => onUpdate({ temperature: v })}
          min={0}
          max={2}
          step={0.1}
        />
      </Field>
      <Field label="Max Tokens">
        <NumberInput
          value={data.maxTokens}
          onChange={(v) => onUpdate({ maxTokens: v })}
          min={1}
          max={200000}
          step={256}
        />
      </Field>
    </>
  );
}

function TeamFields({
  data,
  onUpdate,
}: {
  data: TeamNodeData;
  onUpdate: (d: Partial<TeamNodeData>) => void;
}) {
  return (
    <>
      <Field label="Pattern">
        <SelectInput
          value={data.pattern}
          onChange={(v) =>
            onUpdate({ pattern: v as TeamNodeData['pattern'] })
          }
          options={[
            { label: 'Sequential', value: 'sequential' },
            { label: 'Parallel', value: 'parallel' },
            { label: 'Supervisor', value: 'supervisor' },
            { label: 'Debate', value: 'debate' },
            { label: 'Round Robin', value: 'round_robin' },
            { label: 'Custom', value: 'custom' },
          ]}
        />
      </Field>
      <Field label="Communication Protocol">
        <SelectInput
          value={data.communicationProtocol}
          onChange={(v) =>
            onUpdate({
              communicationProtocol: v as TeamNodeData['communicationProtocol'],
            })
          }
          options={[
            { label: 'Shared Context', value: 'shared_context' },
            { label: 'Message Passing', value: 'message_passing' },
            { label: 'Blackboard', value: 'blackboard' },
          ]}
        />
      </Field>
      <Field label="Max Rounds">
        <NumberInput
          value={data.maxRounds ?? 10}
          onChange={(v) => onUpdate({ maxRounds: v })}
          min={1}
          max={50}
        />
      </Field>
      <p className="text-[10px] text-muted-foreground">
        {data.agents.length} agent(s) configured
      </p>
    </>
  );
}

function TriggerFields({
  data,
  onUpdate,
}: {
  data: TriggerNodeData;
  onUpdate: (d: Partial<TriggerNodeData>) => void;
}) {
  return (
    <>
      <Field label="Trigger Type">
        <SelectInput
          value={data.triggerType}
          onChange={(v) =>
            onUpdate({ triggerType: v as TriggerNodeData['triggerType'] })
          }
          options={[
            { label: 'Manual', value: 'manual' },
            { label: 'Webhook', value: 'webhook' },
            { label: 'Schedule', value: 'schedule' },
            { label: 'Event', value: 'event' },
          ]}
        />
      </Field>

      {data.triggerType === 'webhook' && (
        <>
          <Field label="Webhook Path">
            <TextInput
              value={data.webhookConfig?.path ?? ''}
              onChange={(v) =>
                onUpdate({
                  webhookConfig: {
                    path: v,
                    method: data.webhookConfig?.method ?? 'POST',
                  },
                })
              }
              placeholder="/api/trigger"
            />
          </Field>
          <Field label="Method">
            <SelectInput
              value={data.webhookConfig?.method ?? 'POST'}
              onChange={(v) =>
                onUpdate({
                  webhookConfig: {
                    path: data.webhookConfig?.path ?? '',
                    method: v as 'GET' | 'POST',
                  },
                })
              }
              options={[
                { label: 'POST', value: 'POST' },
                { label: 'GET', value: 'GET' },
              ]}
            />
          </Field>
        </>
      )}

      {data.triggerType === 'schedule' && (
        <>
          <Field label="Cron Expression">
            <TextInput
              value={data.scheduleConfig?.cron ?? ''}
              onChange={(v) =>
                onUpdate({
                  scheduleConfig: {
                    cron: v,
                    timezone: data.scheduleConfig?.timezone ?? 'UTC',
                  },
                })
              }
              placeholder="0 9 * * *"
            />
          </Field>
          <Field label="Timezone">
            <TextInput
              value={data.scheduleConfig?.timezone ?? 'UTC'}
              onChange={(v) =>
                onUpdate({
                  scheduleConfig: {
                    cron: data.scheduleConfig?.cron ?? '',
                    timezone: v,
                  },
                })
              }
              placeholder="UTC"
            />
          </Field>
        </>
      )}
    </>
  );
}

function GateFields({
  data,
  onUpdate,
}: {
  data: GateNodeData;
  onUpdate: (d: Partial<GateNodeData>) => void;
}) {
  return (
    <>
      <Field label="Gate Type">
        <SelectInput
          value={data.gateType}
          onChange={(v) =>
            onUpdate({ gateType: v as GateNodeData['gateType'] })
          }
          options={[
            { label: 'Approval', value: 'approval' },
            { label: 'Review', value: 'review' },
            { label: 'Input', value: 'input' },
            { label: 'Escalation', value: 'escalation' },
          ]}
        />
      </Field>
      <Field label="Assignment Strategy">
        <SelectInput
          value={data.assignmentStrategy}
          onChange={(v) =>
            onUpdate({
              assignmentStrategy: v as GateNodeData['assignmentStrategy'],
            })
          }
          options={[
            { label: 'Any assignee', value: 'any' },
            { label: 'All assignees', value: 'all' },
            { label: 'Round Robin', value: 'round_robin' },
          ]}
        />
      </Field>
      <Field label="Timeout (minutes)">
        <NumberInput
          value={data.timeoutMinutes}
          onChange={(v) => onUpdate({ timeoutMinutes: v })}
          min={1}
          max={10080}
        />
      </Field>
      <Field label="Timeout Action">
        <SelectInput
          value={data.timeoutAction}
          onChange={(v) =>
            onUpdate({
              timeoutAction: v as GateNodeData['timeoutAction'],
            })
          }
          options={[
            { label: 'Approve', value: 'approve' },
            { label: 'Reject', value: 'reject' },
            { label: 'Escalate', value: 'escalate' },
            { label: 'Fallback Node', value: 'fallback_node' },
          ]}
        />
      </Field>
      <Field label="Review Instructions">
        <TextArea
          value={data.reviewInstructions ?? ''}
          onChange={(v) => onUpdate({ reviewInstructions: v })}
          placeholder="Instructions for the reviewer..."
          rows={3}
        />
      </Field>
    </>
  );
}

function ConditionFields({
  data,
  onUpdate,
}: {
  data: ConditionNodeData;
  onUpdate: (d: Partial<ConditionNodeData>) => void;
}) {
  return (
    <>
      <Field label="Condition Type">
        <SelectInput
          value={data.conditionType}
          onChange={(v) =>
            onUpdate({
              conditionType: v as ConditionNodeData['conditionType'],
            })
          }
          options={[
            { label: 'If/Else', value: 'if_else' },
            { label: 'Switch', value: 'switch' },
            { label: 'LLM Router', value: 'llm_router' },
          ]}
        />
      </Field>
      {data.conditionType === 'llm_router' && (
        <>
          <Field label="Routing Model">
            <SelectInput
              value={data.llmRouterConfig?.model ?? ''}
              onChange={(v) =>
                onUpdate({
                  llmRouterConfig: {
                    model: v,
                    routingPrompt: data.llmRouterConfig?.routingPrompt ?? '',
                    options: data.llmRouterConfig?.options ?? [],
                  },
                })
              }
              options={AVAILABLE_MODELS.map((m) => ({
                label: m.name,
                value: m.id,
              }))}
            />
          </Field>
          <Field label="Routing Prompt">
            <TextArea
              value={data.llmRouterConfig?.routingPrompt ?? ''}
              onChange={(v) =>
                onUpdate({
                  llmRouterConfig: {
                    model: data.llmRouterConfig?.model ?? '',
                    routingPrompt: v,
                    options: data.llmRouterConfig?.options ?? [],
                  },
                })
              }
              placeholder="Decide which path to take..."
              rows={4}
            />
          </Field>
        </>
      )}
      {(data.conditionType === 'if_else' ||
        data.conditionType === 'switch') && (
        <p className="text-[10px] text-muted-foreground">
          {data.conditions?.length ?? 0} condition(s) configured
        </p>
      )}
    </>
  );
}

function ToolFields({
  data,
  onUpdate,
}: {
  data: ToolNodeData;
  onUpdate: (d: Partial<ToolNodeData>) => void;
}) {
  return (
    <>
      <Field label="Tool Type">
        <SelectInput
          value={data.toolType}
          onChange={(v) =>
            onUpdate({ toolType: v as ToolNodeData['toolType'] })
          }
          options={[
            { label: 'HTTP Request', value: 'http_request' },
            { label: 'Code Execution', value: 'code_execution' },
            { label: 'File I/O', value: 'file_io' },
            { label: 'Database', value: 'database' },
            { label: 'MCP Server', value: 'mcp' },
          ]}
        />
      </Field>

      {data.toolType === 'http_request' && (
        <>
          <Field label="URL">
            <TextInput
              value={data.httpConfig?.url ?? ''}
              onChange={(v) =>
                onUpdate({
                  httpConfig: {
                    url: v,
                    method: data.httpConfig?.method ?? 'GET',
                    headers: data.httpConfig?.headers ?? {},
                  },
                })
              }
              placeholder="https://api.example.com/endpoint"
            />
          </Field>
          <Field label="Method">
            <SelectInput
              value={data.httpConfig?.method ?? 'GET'}
              onChange={(v) =>
                onUpdate({
                  httpConfig: {
                    url: data.httpConfig?.url ?? '',
                    method: v,
                    headers: data.httpConfig?.headers ?? {},
                  },
                })
              }
              options={[
                { label: 'GET', value: 'GET' },
                { label: 'POST', value: 'POST' },
                { label: 'PUT', value: 'PUT' },
                { label: 'PATCH', value: 'PATCH' },
                { label: 'DELETE', value: 'DELETE' },
              ]}
            />
          </Field>
        </>
      )}

      {data.toolType === 'code_execution' && (
        <>
          <Field label="Language">
            <SelectInput
              value={data.codeConfig?.language ?? 'typescript'}
              onChange={(v) =>
                onUpdate({
                  codeConfig: {
                    language: v as 'javascript' | 'typescript' | 'python',
                    code: data.codeConfig?.code ?? '',
                    timeout: data.codeConfig?.timeout ?? 30,
                  },
                })
              }
              options={[
                { label: 'TypeScript', value: 'typescript' },
                { label: 'JavaScript', value: 'javascript' },
                { label: 'Python', value: 'python' },
              ]}
            />
          </Field>
          <Field label="Code">
            <TextArea
              value={data.codeConfig?.code ?? ''}
              onChange={(v) =>
                onUpdate({
                  codeConfig: {
                    language: data.codeConfig?.language ?? 'typescript',
                    code: v,
                    timeout: data.codeConfig?.timeout ?? 30,
                  },
                })
              }
              placeholder="// Your code here..."
              rows={8}
            />
          </Field>
        </>
      )}

      {data.toolType === 'mcp' && (
        <>
          <Field label="Server URI">
            <TextInput
              value={data.mcpConfig?.serverUri ?? ''}
              onChange={(v) =>
                onUpdate({
                  mcpConfig: {
                    serverUri: v,
                    toolName: data.mcpConfig?.toolName ?? '',
                    inputMapping: data.mcpConfig?.inputMapping ?? {},
                  },
                })
              }
              placeholder="ws://localhost:3001"
            />
          </Field>
          <Field label="Tool Name">
            <TextInput
              value={data.mcpConfig?.toolName ?? ''}
              onChange={(v) =>
                onUpdate({
                  mcpConfig: {
                    serverUri: data.mcpConfig?.serverUri ?? '',
                    toolName: v,
                    inputMapping: data.mcpConfig?.inputMapping ?? {},
                  },
                })
              }
              placeholder="my_tool"
            />
          </Field>
        </>
      )}
    </>
  );
}

function MemoryFields({
  data,
  onUpdate,
}: {
  data: MemoryNodeData;
  onUpdate: (d: Partial<MemoryNodeData>) => void;
}) {
  return (
    <>
      <Field label="Memory Type">
        <SelectInput
          value={data.memoryType}
          onChange={(v) =>
            onUpdate({ memoryType: v as MemoryNodeData['memoryType'] })
          }
          options={[
            { label: 'Conversation Buffer', value: 'conversation_buffer' },
            { label: 'Summary', value: 'summary' },
            { label: 'Vector Store', value: 'vector_store' },
            { label: 'Key-Value', value: 'key_value' },
          ]}
        />
      </Field>
      <Field label="Operation">
        <SelectInput
          value={data.operation}
          onChange={(v) =>
            onUpdate({ operation: v as MemoryNodeData['operation'] })
          }
          options={[
            { label: 'Read', value: 'read' },
            { label: 'Write', value: 'write' },
            { label: 'Search', value: 'search' },
            { label: 'Clear', value: 'clear' },
          ]}
        />
      </Field>
      <Field label="Namespace">
        <TextInput
          value={data.namespace ?? ''}
          onChange={(v) => onUpdate({ namespace: v })}
          placeholder="default"
        />
      </Field>
      {data.memoryType === 'vector_store' && (
        <>
          <Field label="Top K">
            <NumberInput
              value={data.vectorConfig?.topK ?? 5}
              onChange={(v) =>
                onUpdate({
                  vectorConfig: {
                    embeddingModel: data.vectorConfig?.embeddingModel ?? '',
                    topK: v,
                    similarityThreshold:
                      data.vectorConfig?.similarityThreshold ?? 0.7,
                  },
                })
              }
              min={1}
              max={100}
            />
          </Field>
          <Field label="Similarity Threshold">
            <NumberInput
              value={data.vectorConfig?.similarityThreshold ?? 0.7}
              onChange={(v) =>
                onUpdate({
                  vectorConfig: {
                    embeddingModel: data.vectorConfig?.embeddingModel ?? '',
                    topK: data.vectorConfig?.topK ?? 5,
                    similarityThreshold: v,
                  },
                })
              }
              min={0}
              max={1}
              step={0.05}
            />
          </Field>
        </>
      )}
    </>
  );
}

function OutputFields({
  data,
  onUpdate,
}: {
  data: OutputNodeData;
  onUpdate: (d: Partial<OutputNodeData>) => void;
}) {
  return (
    <>
      <Field label="Output Type">
        <SelectInput
          value={data.outputType}
          onChange={(v) =>
            onUpdate({ outputType: v as OutputNodeData['outputType'] })
          }
          options={[
            { label: 'Return', value: 'return' },
            { label: 'Webhook', value: 'webhook' },
            { label: 'Email', value: 'email' },
            { label: 'Store', value: 'store' },
            { label: 'Stream', value: 'stream' },
          ]}
        />
      </Field>
      <Field label="Format">
        <SelectInput
          value={data.format ?? 'json'}
          onChange={(v) =>
            onUpdate({ format: v as OutputNodeData['format'] })
          }
          options={[
            { label: 'JSON', value: 'json' },
            { label: 'Text', value: 'text' },
            { label: 'Markdown', value: 'markdown' },
            { label: 'HTML', value: 'html' },
          ]}
        />
      </Field>
    </>
  );
}

function SubflowFields({
  data,
  onUpdate,
}: {
  data: SubflowNodeData;
  onUpdate: (d: Partial<SubflowNodeData>) => void;
}) {
  return (
    <>
      <Field label="Workflow ID">
        <TextInput
          value={data.workflowId}
          onChange={(v) => onUpdate({ workflowId: v })}
          placeholder="wf_..."
        />
      </Field>
      <Field label="Version ID">
        <TextInput
          value={data.versionId ?? ''}
          onChange={(v) => onUpdate({ versionId: v || undefined })}
          placeholder="Latest (leave empty)"
        />
      </Field>
      <CheckboxInput
        checked={data.waitForCompletion}
        onChange={(v) => onUpdate({ waitForCompletion: v })}
        label="Wait for completion"
      />
    </>
  );
}

function NoteFields({
  data,
  onUpdate,
}: {
  data: NoteNodeData;
  onUpdate: (d: Partial<NoteNodeData>) => void;
}) {
  return (
    <>
      <Field label="Content">
        <TextArea
          value={data.content}
          onChange={(v) => onUpdate({ content: v })}
          placeholder="Add a note..."
          rows={6}
        />
      </Field>
      <Field label="Color">
        <input
          type="color"
          value={data.color}
          onChange={(e) => onUpdate({ color: e.target.value })}
          className="h-8 w-full cursor-pointer rounded-md border border-input"
        />
      </Field>
    </>
  );
}

// ---------------------------------------------------------------------------
// Node Inspector
// ---------------------------------------------------------------------------

export function NodeInspector() {
  const {
    selectedNode,
    selectedNodeType,
    selectedNodeData,
    updateNodeData,
    removeNodes,
    duplicateSelection,
  } = useCanvas();

  const handleUpdate = useCallback(
    (data: Record<string, unknown>) => {
      if (!selectedNode) return;
      updateNodeData(selectedNode.id, data);
    },
    [selectedNode, updateNodeData],
  );

  const handleDelete = useCallback(() => {
    if (!selectedNode) return;
    removeNodes([selectedNode.id]);
  }, [selectedNode, removeNodes]);

  if (!selectedNode || !selectedNodeType || !selectedNodeData) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">
          Select a node to inspect
        </p>
      </div>
    );
  }

  const registry = NODE_REGISTRY[selectedNodeType];
  const Icon = ICON_MAP[registry.icon];
  const data = selectedNodeData as unknown as Record<string, unknown>;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-md text-white ${registry.color}`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              {registry.label}
            </h3>
            <p className="font-mono text-[10px] text-muted-foreground">
              {selectedNode.id}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={duplicateSelection}
            title="Duplicate"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleDelete}
            title="Delete"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {/* Common fields */}
        <Field label="Label">
          <TextInput
            value={(data.label as string) ?? ''}
            onChange={(v) => handleUpdate({ label: v })}
            placeholder="Node label"
          />
        </Field>
        <Field label="Description">
          <TextArea
            value={(data.description as string) ?? ''}
            onChange={(v) => handleUpdate({ description: v })}
            placeholder="Optional description..."
            rows={2}
          />
        </Field>
        <CheckboxInput
          checked={(data.disabled as boolean) ?? false}
          onChange={(v) => handleUpdate({ disabled: v })}
          label="Disabled (skip during execution)"
        />

        <div className="border-t border-border pt-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configuration
          </h4>

          {/* Type-specific fields */}
          {selectedNodeType === 'agent' && (
            <div className="space-y-4">
              <AgentFields
                data={data as unknown as AgentNodeData}
                onUpdate={handleUpdate}
              />
            </div>
          )}
          {selectedNodeType === 'team' && (
            <div className="space-y-4">
              <TeamFields
                data={data as unknown as TeamNodeData}
                onUpdate={handleUpdate}
              />
            </div>
          )}
          {selectedNodeType === 'trigger' && (
            <div className="space-y-4">
              <TriggerFields
                data={data as unknown as TriggerNodeData}
                onUpdate={handleUpdate}
              />
            </div>
          )}
          {selectedNodeType === 'gate' && (
            <div className="space-y-4">
              <GateFields
                data={data as unknown as GateNodeData}
                onUpdate={handleUpdate}
              />
            </div>
          )}
          {selectedNodeType === 'condition' && (
            <div className="space-y-4">
              <ConditionFields
                data={data as unknown as ConditionNodeData}
                onUpdate={handleUpdate}
              />
            </div>
          )}
          {selectedNodeType === 'tool' && (
            <div className="space-y-4">
              <ToolFields
                data={data as unknown as ToolNodeData}
                onUpdate={handleUpdate}
              />
            </div>
          )}
          {selectedNodeType === 'memory' && (
            <div className="space-y-4">
              <MemoryFields
                data={data as unknown as MemoryNodeData}
                onUpdate={handleUpdate}
              />
            </div>
          )}
          {selectedNodeType === 'output' && (
            <div className="space-y-4">
              <OutputFields
                data={data as unknown as OutputNodeData}
                onUpdate={handleUpdate}
              />
            </div>
          )}
          {selectedNodeType === 'subflow' && (
            <div className="space-y-4">
              <SubflowFields
                data={data as unknown as SubflowNodeData}
                onUpdate={handleUpdate}
              />
            </div>
          )}
          {selectedNodeType === 'note' && (
            <div className="space-y-4">
              <NoteFields
                data={data as unknown as NoteNodeData}
                onUpdate={handleUpdate}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
