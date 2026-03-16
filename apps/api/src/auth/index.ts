// ---------------------------------------------------------------------------
// Better-Auth Server Setup
// ---------------------------------------------------------------------------

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { getDb, users, sessions, accounts, verifications } from '@toa/db';

// ---------------------------------------------------------------------------
// Auth Instance
// ---------------------------------------------------------------------------

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  basePath: '/api/auth',
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  trustedOrigins: ['http://localhost:3000'],
});

export type Auth = typeof auth;

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

export async function getSessionFromToken(
  token: string | undefined,
): Promise<{ userId: string; sessionId: string } | null> {
  if (!token) return null;

  const bearerToken = token.startsWith('Bearer ') ? token.slice(7) : token;
  if (!bearerToken) return null;

  try {
    const session = await auth.api.getSession({
      headers: new Headers({ Authorization: `Bearer ${bearerToken}` }),
    });
    if (!session?.user) return null;
    return { userId: session.user.id, sessionId: session.session.id };
  } catch {
    return null;
  }
}
