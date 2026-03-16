'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ReactFlowProvider } from '@xyflow/react';
import { EditorLayout } from '@/features/editor/EditorLayout';
import { useCanvasStore } from '@/stores/canvas-store';

import '@xyflow/react/dist/style.css';

export default function EditorPage() {
  const params = useParams<{ projectId: string; workflowId: string }>();
  const loadDefinition = useCanvasStore((s) => s.loadDefinition);

  useEffect(() => {
    // TODO: Fetch workflow definition from API via tRPC and load into canvas store.
    // For now we initialize with an empty canvas.
    loadDefinition({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
  }, [params.workflowId, loadDefinition]);

  return (
    <ReactFlowProvider>
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <EditorLayout
          projectId={params.projectId}
          workflowId={params.workflowId}
        />
      </div>
    </ReactFlowProvider>
  );
}
