'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  FolderKanban,
  Workflow,
  X,
  Loader2,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  description?: string;
  workflowCount: number;
  updatedAt: string;
}

/** Placeholder project data for initial rendering. */
const PLACEHOLDER_PROJECTS: Project[] = [
  {
    id: 'proj_demo_1',
    name: 'Customer Support',
    description: 'Automated customer support triage and response workflows',
    workflowCount: 3,
    updatedAt: '2026-03-15T10:30:00Z',
  },
  {
    id: 'proj_demo_2',
    name: 'Data Pipeline',
    description: 'ETL and data transformation agent workflows',
    workflowCount: 5,
    updatedAt: '2026-03-14T16:45:00Z',
  },
  {
    id: 'proj_demo_3',
    name: 'Content Generation',
    description: 'Multi-agent content creation and review',
    workflowCount: 2,
    updatedAt: '2026-03-12T09:00:00Z',
  },
];

function CreateProjectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  if (!open) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    // TODO: call trpc mutation
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
            Create Project
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
              Project name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
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
              placeholder="What is this project about?"
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

function ProjectCard({ project }: { project: Project }) {
  const updatedDate = new Date(project.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-ring hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <FolderKanban className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
            {project.name}
          </h3>
        </div>
      </div>

      {project.description && (
        <p className="mb-4 line-clamp-2 text-xs text-muted-foreground">
          {project.description}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Workflow className="h-3 w-3" />
          {project.workflowCount} workflow{project.workflowCount !== 1 ? 's' : ''}
        </span>
        <span>Updated {updatedDate}</span>
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const projects = PLACEHOLDER_PROJECTS;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your agent workflow projects
          </p>
        </div>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
