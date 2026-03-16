import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

/**
 * Vanilla (non-React) tRPC client.
 * Used for server-side calls and imperative usage outside of React components.
 *
 * NOTE: The `AppRouter` type should be imported from the API package once it
 * is available. For now we use `any` to avoid a circular workspace dependency.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppRouter = any;

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/trpc';

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_URL,
      transformer: superjson,
      headers() {
        return {
          'x-trpc-source': 'web-client',
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
