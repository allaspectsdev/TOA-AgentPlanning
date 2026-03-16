'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutTemplate,
  Brain,
  Users,
  Workflow,
  Search,
  Plus,
  ArrowRight,
  Zap,
  ShieldCheck,
  Wrench,
  Loader2,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodeCount: number;
  icon: typeof Brain;
  isPublic: boolean;
}

// ---------------------------------------------------------------------------
// Sample / fallback data
// ---------------------------------------------------------------------------

const CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'customer-support', label: 'Customer Support' },
  { id: 'content', label: 'Content & Writing' },
  { id: 'data', label: 'Data Processing' },
  { id: 'devops', label: 'DevOps & Engineering' },
  { id: 'research', label: 'Research & Analysis' },
] as const;

const ICON_MAP: Record<string, typeof Brain> = {
  'customer-support': ShieldCheck,
  content: Users,
  data: Wrench,
  devops: Brain,
  research: Users,
};

const BUILTIN_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl_1',
    name: 'Customer Support Triage',
    description: 'Classify incoming tickets, route to the right team, and draft initial responses with human approval.',
    category: 'customer-support',
    nodeCount: 6,
    icon: ShieldCheck,
    isPublic: true,
  },
  {
    id: 'tpl_2',
    name: 'Blog Post Pipeline',
    description: 'Research, outline, draft, and edit blog posts with a team of specialized writing agents.',
    category: 'content',
    nodeCount: 8,
    icon: Users,
    isPublic: true,
  },
  {
    id: 'tpl_3',
    name: 'Data Extraction & Analysis',
    description: 'Extract structured data from documents, validate with rules, and generate summary reports.',
    category: 'data',
    nodeCount: 5,
    icon: Wrench,
    isPublic: true,
  },
  {
    id: 'tpl_4',
    name: 'Code Review Agent',
    description: 'Analyze PRs for bugs, security issues, and style violations. Escalate critical findings for human review.',
    category: 'devops',
    nodeCount: 7,
    icon: Brain,
    isPublic: true,
  },
  {
    id: 'tpl_5',
    name: 'Research Assistant',
    description: 'Multi-agent research team that searches, synthesizes, and fact-checks information from multiple sources.',
    category: 'research',
    nodeCount: 9,
    icon: Users,
    isPublic: true,
  },
  {
    id: 'tpl_6',
    name: 'Simple Agent + Approval',
    description: 'Basic single-agent workflow with a human approval gate before delivering output.',
    category: 'customer-support',
    nodeCount: 4,
    icon: Zap,
    isPublic: true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapApiTemplate(t: any): WorkflowTemplate {
  return {
    id: t.id,
    name: t.name ?? 'Untitled Template',
    description: t.description ?? '',
    category: t.category ?? 'data',
    nodeCount: t.nodeCount ?? t.nodes?.length ?? 0,
    icon: ICON_MAP[t.category as string] ?? Workflow,
    isPublic: t.isPublic ?? true,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TemplatesPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // --- tRPC: fetch templates from backend ---
  const { data: apiTemplates, isLoading, error } = trpc.template.listWorkflow.useQuery(undefined, {
    retry: false,
  });

  // Merge: prefer API data, fall back to built-in samples
  const remoteTemplates: WorkflowTemplate[] = apiTemplates
    ? (apiTemplates as any[]).map(mapApiTemplate)
    : [];

  const allTemplates = remoteTemplates.length > 0 ? remoteTemplates : BUILTIN_TEMPLATES;
  const isUsingFallback = remoteTemplates.length === 0;

  // --- tRPC: instantiate template mutation ---
  const instantiateMutation = trpc.template.instantiate.useMutation({
    onSuccess: () => {
      alert('Template instantiated successfully! Redirecting to projects...');
      router.push('/projects');
    },
    onError: (err: any) => {
      alert(`Failed to instantiate template: ${err.message}`);
    },
  });

  // --- Client-side filtering ---
  const filtered = allTemplates.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      activeCategory === 'all' || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // --- Handlers ---
  function handleUseTemplate(template: WorkflowTemplate) {
    const projectId = prompt(
      'Enter the Project ID to instantiate this template into.\n\n(You can find your project ID on the Projects page.)',
    );
    if (!projectId) return;

    const name = prompt('Name for the new workflow:', template.name);
    if (!name) return;

    instantiateMutation.mutate({
      templateId: template.id,
      projectId,
      name,
    });
  }

  function handleCreateTemplate() {
    alert(
      'To create a template, open a workflow in the editor and use "Save as Template" from the workflow menu.\n\nThis requires an existing workflow to use as the source.',
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Templates
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Start from pre-built workflow templates or create your own
          </p>
        </div>
        <button
          onClick={handleCreateTemplate}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading templates...
        </div>
      )}

      {/* Fallback notice */}
      {isUsingFallback && !isLoading && (
        <div className="rounded-md bg-muted/50 border border-border px-4 py-2 text-xs text-muted-foreground">
          {error
            ? 'Could not load templates from API. Showing built-in templates.'
            : 'Showing built-in templates.'}
        </div>
      )}

      {/* Search + Categories */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((template) => {
          const Icon = template.icon;
          return (
            <div
              key={template.id}
              className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-ring hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                {template.isPublic && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Public
                  </span>
                )}
              </div>

              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {template.name}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {template.description}
              </p>

              <div className="mt-4 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Workflow className="h-3 w-3" />
                  {template.nodeCount} nodes
                </span>
                <button
                  onClick={() => handleUseTemplate(template)}
                  disabled={instantiateMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                >
                  {instantiateMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      Use Template
                      <ArrowRight className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutTemplate className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No templates match your search
          </p>
        </div>
      )}
    </div>
  );
}
