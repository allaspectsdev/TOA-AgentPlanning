'use client';

import { useRef, useEffect, useState } from 'react';
import { ArrowDown, Trash2, Filter } from 'lucide-react';
import type { ExecutionLogEntry, ExecutionLogLevel } from '@toa/shared';

const LEVEL_STYLES: Record<ExecutionLogLevel, { bg: string; text: string }> = {
  debug: { bg: 'bg-secondary', text: 'text-muted-foreground' },
  info: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  warn: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  error: { bg: 'bg-red-500/15', text: 'text-red-400' },
};

interface LogViewerProps {
  logs: ExecutionLogEntry[];
  maxHeight?: string;
  onClear?: () => void;
}

export function LogViewer({
  logs,
  maxHeight = '300px',
  onClear,
}: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterLevel, setFilterLevel] = useState<ExecutionLogLevel | 'all'>(
    'all',
  );

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
    setAutoScroll(isAtBottom);
  };

  const filteredLogs =
    filterLevel === 'all'
      ? logs
      : logs.filter((log) => log.level === filterLevel);

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-foreground">Logs</h4>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {filteredLogs.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Level filter */}
          <div className="relative">
            <select
              value={filterLevel}
              onChange={(e) =>
                setFilterLevel(e.target.value as ExecutionLogLevel | 'all')
              }
              className="h-6 appearance-none rounded border border-border bg-transparent pl-5 pr-2 text-[10px] text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All levels</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
            <Filter className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>

          {/* Auto-scroll indicator */}
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (containerRef.current) {
                  containerRef.current.scrollTop =
                    containerRef.current.scrollHeight;
                }
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Scroll to bottom"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          )}

          {/* Clear logs */}
          {onClear && (
            <button
              onClick={onClear}
              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              title="Clear logs"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto font-mono text-xs"
        style={{ maxHeight }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p>No log entries</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredLogs.map((log, index) => {
              const styles = LEVEL_STYLES[log.level];
              const time = new Date(log.timestamp).toLocaleTimeString(
                'en-US',
                {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  fractionalSecondDigits: 3,
                },
              );

              return (
                <div
                  key={`${log.timestamp}-${index}`}
                  className="flex items-start gap-2 px-3 py-1.5 hover:bg-muted/30"
                >
                  <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground">
                    {time}
                  </span>
                  <span
                    className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase ${styles.bg} ${styles.text}`}
                  >
                    {log.level}
                  </span>
                  <span className="flex-1 break-all text-foreground">
                    {log.message}
                  </span>
                  {log.data && (
                    <details className="shrink-0">
                      <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                        data
                      </summary>
                      <pre className="mt-1 max-w-xs overflow-x-auto rounded bg-muted/50 p-1 text-[10px]">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
