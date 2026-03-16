import * as React from 'react';

import { cn } from '../lib/utils.js';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional max-height for the scroll container. */
  maxHeight?: string;
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, maxHeight, children, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        style={{ maxHeight, ...style }}
        {...props}
      >
        <div className="h-full w-full overflow-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/25">
          {children}
        </div>
      </div>
    );
  },
);
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
