'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  FolderKanban,
  Workflow,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/react';

interface Project {
  id: string;
  name: string;
  description?: string;
  workflowCount: number;
  updatedAt: string;
}

function CreateProjectDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const utils = trpc.useUtils();
  const createProject = trpc.project.create.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate();
      setName('');
      setDescription('');
      onClose();
    },
  });

  if (!open) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createProject.mutate({ name: name.trim(), description: description.trim() || undefined });
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

          {createProject.error && (
            <p className="text-sm text-destructive">
              Failed to create project. Please try again.
            </p>
          )}

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
              disabled={createProject.isPending || !name.trim()}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {createProject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const updatedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

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
          {project.workflowCount ?? 0} workflow{project.workflowCount !== 1 ? 's' : ''}
        </span>
        {updatedDate && <span>Updated {updatedDate}</span>}
      </div>
    </Link>
  );
}

export default function ProjectsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: projectsData, isLoading, error } = trpc.project.list.useQuery();
  const projects = (projectsData as any)?.items ?? projectsData ?? [];

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

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Unable to load projects</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {error.message || 'Something went wrong. Please try again.'}
          </p>
        </div>
      )}

      {!isLoading && !error && projects?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderKanban className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project to get started with agent workflows.
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>
      )}

      {!isLoading && !error && projects && projects.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: Project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
