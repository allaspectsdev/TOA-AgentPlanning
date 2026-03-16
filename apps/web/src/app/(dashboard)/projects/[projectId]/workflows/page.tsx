'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Plus,
  Workflow,
  ArrowLeft,
  X,
  Loader2,
  Pencil,
  Globe,
  FileText,
} from 'lucide-react';
import type { WorkflowStatus } from '@toa/shared';

interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  currentVersion: number;
  updatedAt: string;
}

const STATUS_BADGES: Record<
  WorkflowStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Draft',
    className: 'bg-secondary text-secondary-foreground',
  },
  published: {
    label: 'Published',
    className: 'bg-green-500/15 text-green-700 dark:text-green-400',
  },
  archived: {
    label: 'Archived',
    className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  disabled: {
    label: 'Disabled',
    className: 'bg-red-500/15 text-red-700 dark:text-red-400',
  },
};

const PLACEHOLDER_WORKFLOWS: WorkflowSummary[] = [
  {
    id: 'wf_demo_1',
    name: 'Ticket Triage',
    description: 'Classify and route incoming support tickets',
    status: 'published',
    currentVersion: 3,
    updatedAt: '2026-03-15T10:30:00Z',
  },
  {
    id: 'wf_demo_2',
    name: 'Response Generator',
    description: 'Generate draft responses using a team of specialist agents',
    status: 'draft',
    currentVersion: 1,
    updatedAt: '2026-03-14T08:20:00Z',
  },
  {
    id: 'wf_demo_3',
    name: 'Escalation Handler',
    description: 'Handle escalated tickets with human-in-the-loop approval',
    status: 'draft',
    currentVersion: 1,
    updatedAt: '2026-03-13T14:00:00Z',
  },
];

const STATUS_ICONS: Record<WorkflowStatus, typeof Pencil> = {
  draft: Pencil,
  published: Globe,
  archived: FileText,
  disabled: FileText,
};

function CreateWorkflowDialog({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!open) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    // TODO: call trpc mutation to create workflow
    await new Promise((r) => setTimeout(r, 500));
    setIsCreating(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Create Workflow
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Workflow name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workflow"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow does"
              rows={3}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm hover:bg-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WorkflowCard({
  workflow,
  projectId,
}: {
  workflow: WorkflowSummary;
  projectId: string;
}) {
  const badge = STATUS_BADGES[workflow.status];
  const StatusIcon = STATUS_ICONS[workflow.status];
  const updatedDate = new Date(workflow.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      href={`/projects/${projectId}/workflows/${workflow.id}/editor`}
      className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-ring hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-info/10">
            <Workflow className="h-4 w-4 text-info" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
              {workflow.name}
            </h3>
            <span className="text-xs text-muted-foreground">
              v{workflow.currentVersion}
            </span>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${badge.className}`}
        >
          <StatusIcon className="h-3 w-3" />
          {badge.label}
        </span>
      </div>

      {workflow.description && (
        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
          {workflow.description}
        </p>
      )}

      <div className="text-xs text-muted-foreground">
        Last edited {updatedDate}
      </div>
    </Link>
  );
}

export default function WorkflowsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [dialogOpen, setDialogOpen] = useState(false);
  const workflows = PLACEHOLDER_WORKFLOWS;

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/projects"
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Workflows</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build and manage agent workflows for this project
            </p>
          </div>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Workflow
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.map((wf) => (
          <WorkflowCard key={wf.id} workflow={wf} projectId={projectId} />
        ))}
      </div>

      <CreateWorkflowDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        projectId={projectId}
      />
    </div>
  );
}
