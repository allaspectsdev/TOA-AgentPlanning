// ---------------------------------------------------------------------------
// RBAC Permission Definitions
// ---------------------------------------------------------------------------
//
// Re-exports the shared permission matrix and provides API-layer helpers
// for checking permissions in route handlers and middleware.
// ---------------------------------------------------------------------------

import {
  DEFAULT_PERMISSION_MATRIX,
  hasPermission,
  type OrgRole,
  type Resource,
  type Action,
  type PermissionMatrix,
} from '@toa/shared';

export { DEFAULT_PERMISSION_MATRIX, hasPermission };
export type { OrgRole, Resource, Action, PermissionMatrix };

/**
 * Check whether the given role is allowed to perform an action on a resource.
 * Uses the built-in default permission matrix.
 */
export function checkPermission(
  role: OrgRole,
  resource: Resource,
  action: Action,
): boolean {
  return hasPermission(DEFAULT_PERMISSION_MATRIX, role, resource, action);
}

/**
 * Assert that a role has a permission, throwing a tRPC-compatible error
 * message if not. This is used by the `requirePermission` middleware.
 */
export function assertPermission(
  role: OrgRole,
  resource: Resource,
  action: Action,
): void {
  if (!checkPermission(role, resource, action)) {
    throw new Error(
      `Insufficient permissions: role '${role}' cannot '${action}' on '${resource}'`,
    );
  }
}
