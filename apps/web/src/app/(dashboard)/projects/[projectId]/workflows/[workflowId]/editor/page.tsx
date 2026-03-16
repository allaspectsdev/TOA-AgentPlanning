'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import { EditorLayout } from '@/features/editor/EditorLayout';
import { useCanvasStore } from '@/stores/canvas-store';
import { trpc } from '@/lib/trpc/react';

import '@xyflow/react/dist/style.css';

export default function EditorPage() {
  const params = useParams<{ projectId: string; workflowId: string }>();
  const router = useRouter();
  const { projectId, workflowId } = params;

  const loadDefinition = useCanvasStore((s) => s.loadDefinition);
  const getDefinition = useCanvasStore((s) => s.getDefinition);
  const markSaved = useCanvasStore((s) => s.markSaved);

  // Fetch workflow definition from API
  const { data: workflow, isLoading } = trpc.workflow.get.useQuery({ id: workflowId });

  // Load definition into canvas store when workflow data arrives
  useEffect(() => {
    if (workflow?.currentVersion?.definition) {
      loadDefinition(workflow.currentVersion.definition);
    }
  }, [workflow, loadDefinition]);

  // Save mutation
  const saveVersion = trpc.workflow.saveVersion.useMutation({
    onSuccess: () => {
      markSaved();
    },
  });

  async function handleSave() {
    const definition = getDefinition();
    await saveVersion.mutateAsync({ workflowId, definition });
  }

  // Run mutation
  const startExecution = trpc.execution.start.useMutation({
    onSuccess: (data: { id: string }) => {
      router.push(`/projects/${projectId}/workflows/${workflowId}/runs/${data.id}`);
    },
  });

  function handleRun() {
    startExecution.mutate({ workflowId });
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading workflow...</div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <EditorLayout
          projectId={projectId}
          workflowId={workflowId}
          workflowName={workflow?.name}
          isSaving={saveVersion.isPending}
          onSave={handleSave}
          onRun={handleRun}
        />
      </div>
    </ReactFlowProvider>
  );
}
