import 'server-only';

import { cookies } from 'next/headers';

/**
 * Lightweight server-side tRPC caller for React Server Components.
 *
 * This module provides helpers for RSC data fetching. Once the API's
 * `appRouter` and `createCallerFactory` are wired up, replace the
 * placeholder implementations below.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Retrieve the current session from the API by forwarding the session cookie.
 * Returns the session payload, or `null` if unauthenticated.
 */
export async function getServerSession(): Promise<{
  userId: string;
  email: string;
  orgId: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) return null;

    const res = await fetch(`${API_URL}/auth/session`, {
      headers: {
        Cookie: `session=${sessionCookie}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data as { userId: string; email: string; orgId: string };
  } catch {
    return null;
  }
}

/**
 * Server-side fetch wrapper that forwards session cookies to the API.
 * Use this for RSC data fetching until a proper tRPC server caller
 * is integrated.
 */
export async function serverFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionCookie ? { Cookie: `session=${sessionCookie}` } : {}),
      ...options?.headers,
    },
    cache: options?.cache ?? 'no-store',
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}
