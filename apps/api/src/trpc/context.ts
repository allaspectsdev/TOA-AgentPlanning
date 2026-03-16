// ---------------------------------------------------------------------------
// tRPC Context
// ---------------------------------------------------------------------------

import type { FastifyRequest, FastifyReply } from 'fastify';
import { getDb, type Database, type User, type Session, type Organization, type OrganizationMember } from '@toa/db';
import { users, sessions, organizations, organizationMembers } from '@toa/db';
import { eq, and } from 'drizzle-orm';
import type { OrgRole } from '../auth/permissions';

// ---------------------------------------------------------------------------
// Context Type
// ---------------------------------------------------------------------------

export interface Context {
  db: Database;
  user: User | null;
  session: Session | null;
  organization: Organization | null;
  orgMembership: OrganizationMember | null;
  orgRole: OrgRole | null;
  req: FastifyRequest;
  res: FastifyReply;
}

// ---------------------------------------------------------------------------
// Context Factory
// ---------------------------------------------------------------------------

export async function createContext(
  req: FastifyRequest,
  res: FastifyReply,
): Promise<Context> {
  const db = getDb();

  let user: User | null = null;
  let session: Session | null = null;
  let organization_: Organization | null = null;
  let orgMembership: OrganizationMember | null = null;
  let orgRole: OrgRole | null = null;

  // ── Extract session from Authorization header ───────────────────────────
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (token) {
      const [foundSession] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, token))
        .limit(1);

      if (foundSession && foundSession.expiresAt > new Date()) {
        session = foundSession;

        const [foundUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, foundSession.userId))
          .limit(1);

        user = foundUser ?? null;
      }
    }
  }

  // ── Resolve organization from x-org-id header ──────────────────────────
  const orgId = req.headers['x-org-id'] as string | undefined;
  if (orgId && user) {
    const [foundOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (foundOrg) {
      organization_ = foundOrg;

      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.userId, user.id),
          ),
        )
        .limit(1);

      if (membership) {
        orgMembership = membership;
        orgRole = membership.role as OrgRole;
      }
    }
  }

  return {
    db,
    user,
    session,
    organization: organization_,
    orgMembership,
    orgRole,
    req,
    res,
  };
}
