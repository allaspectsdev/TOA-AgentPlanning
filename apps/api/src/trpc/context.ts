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

  // ── Extract session token from cookie or Authorization header ──────────
  let token: string | undefined;

  // 1. Check cookies (browser sessions via Better-Auth)
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, c) => {
      const [key, ...val] = c.trim().split('=');
      if (key) acc[key] = val.join('=');
      return acc;
    }, {});
    token = cookies['better-auth.session_token'];
  }

  // 2. Fall back to Authorization header (API clients)
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;
    }
  }

  // 3. Look up session in DB
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

  // ── Resolve organization ────────────────────────────────────────────────
  // Check x-org-id header first, then auto-resolve the user's first org.
  // If the user has no org, auto-create a personal one.
  if (user) {
    const orgId = req.headers['x-org-id'] as string | undefined;

    if (orgId) {
      // Explicit org requested
      const [foundOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (foundOrg) {
        organization_ = foundOrg;
      }
    }

    // If no explicit org or not found, find user's first org
    if (!organization_) {
      const [firstMembership] = await db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, user.id))
        .limit(1);

      if (firstMembership) {
        const [foundOrg] = await db
          .select()
          .from(organizations)
          .where(eq(organizations.id, firstMembership.organizationId))
          .limit(1);

        if (foundOrg) {
          organization_ = foundOrg;
        }
      }
    }

    // If still no org, auto-create a personal organization
    if (!organization_) {
      const { createId } = await import('@paralleldrive/cuid2');
      const orgSlug = `${user.name?.toLowerCase().replace(/\s+/g, '-') ?? 'user'}-${createId().slice(0, 6)}`;

      const [newOrg] = await db
        .insert(organizations)
        .values({
          id: createId(),
          name: `${user.name ?? 'My'}'s Organization`,
          slug: orgSlug,
          plan: 'free',
        })
        .returning();

      if (newOrg) {
        organization_ = newOrg;

        // Add user as owner
        await db.insert(organizationMembers).values({
          id: createId(),
          organizationId: newOrg.id,
          userId: user.id,
          role: 'owner',
        });
      }
    }

    // Resolve membership and role
    if (organization_) {
      const [membership] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, organization_.id),
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
