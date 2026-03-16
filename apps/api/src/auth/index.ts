// ---------------------------------------------------------------------------
// Better-Auth Server Setup
// ---------------------------------------------------------------------------

import { betterAuth } from 'better-auth';
import { organization, createAccessControl, role } from 'better-auth/plugins';
import { getDb } from '@toa/db';
import { DEFAULT_PERMISSION_MATRIX, type OrgRole, type Resource, type Action } from './permissions.js';

// ---------------------------------------------------------------------------
// Build access-control definitions from the permission matrix for Better-Auth
// ---------------------------------------------------------------------------

/** All resources and their possible actions, derived from the permission matrix. */
const allStatements = {
  workflow: ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
  execution: ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
  template: ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
  credential: ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
  team: ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
  project: ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
  org_settings: ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
  billing: ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
  api_key: ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
  audit_log: ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
} as const;

const ac = createAccessControl(allStatements);

/**
 * Build a role map from the permission matrix for the organization plugin.
 */
function buildRoles(): Record<string, ReturnType<typeof ac.newRole>> {
  const roles: Record<string, ReturnType<typeof ac.newRole>> = {};
  for (const [roleName, perms] of Object.entries(DEFAULT_PERMISSION_MATRIX)) {
    // Group permissions by resource
    const grouped: Record<string, string[]> = {};
    for (const p of perms) {
      if (!grouped[p.resource]) grouped[p.resource] = [];
      grouped[p.resource]!.push(p.action);
    }
    roles[roleName] = ac.newRole(grouped as any);
  }
  return roles;
}

// ---------------------------------------------------------------------------
// Auth Instance
// ---------------------------------------------------------------------------

export const auth = betterAuth({
  database: {
    type: 'postgres',
    url: process.env.DATABASE_URL!,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day — extend session on activity
  },
  plugins: [
    organization({
      ac,
      roles: buildRoles(),
    }),
  ],
});

export type Auth = typeof auth;

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/**
 * Validate an Authorization header token and return the session + user,
 * or null if the token is invalid / expired.
 */
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
