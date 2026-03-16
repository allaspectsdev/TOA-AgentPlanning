'use client';

import { createTRPCReact, httpBatchLink } from '@trpc/react-query';
import { createTRPCClient } from '@trpc/client';
import superjson from 'superjson';

/**
 * tRPC React hooks.
 *
 * NOTE: The `AppRouter` type should be imported from the API package once it
 * is available. For now we use `any` to avoid a circular workspace dependency.
 *
 * We use `createTRPCReact<any>()` but must cast through `any` to avoid the
 * `ProtectedIntersection` collision errors that tRPC v11 produces when the
 * router type is `any`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppRouter = any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _trpc = createTRPCReact<AppRouter>() as any;

/**
 * Typed tRPC hooks object. Router procedure accessors remain untyped until
 * the real `AppRouter` type is wired in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trpc: any = _trpc;

const API_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002') + '/trpc';

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_URL,
      transformer: superjson,
      headers() {
        return {
          'x-trpc-source': 'web-react',
        };
      },
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
    }),
  ],
});
