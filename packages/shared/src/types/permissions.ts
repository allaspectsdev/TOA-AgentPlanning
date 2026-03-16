// ---------------------------------------------------------------------------
// RBAC Permission Types
// ---------------------------------------------------------------------------

/** Roles assignable at the organisation level. */
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer' | 'billing';

/** Resources that can be governed by permissions. */
export type Resource =
  | 'workflow'
  | 'execution'
  | 'template'
  | 'credential'
  | 'team'
  | 'project'
  | 'org_settings'
  | 'billing'
  | 'api_key'
  | 'audit_log';

/** CRUD + special actions. */
export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'publish'
  | 'manage_members'
  | 'view_logs';

/** A single permission entry. */
export interface Permission {
  resource: Resource;
  action: Action;
}

/** Complete permission matrix — maps each OrgRole to its allowed permissions. */
export type PermissionMatrix = Record<OrgRole, Permission[]>;

// ---------------------------------------------------------------------------
// Default Permission Matrix
// ---------------------------------------------------------------------------

const ALL_RESOURCES: Resource[] = [
  'workflow',
  'execution',
  'template',
  'credential',
  'team',
  'project',
  'org_settings',
  'billing',
  'api_key',
  'audit_log',
];

const ALL_ACTIONS: Action[] = [
  'create',
  'read',
  'update',
  'delete',
  'execute',
  'publish',
  'manage_members',
  'view_logs',
];

function allPermissions(): Permission[] {
  const perms: Permission[] = [];
  for (const resource of ALL_RESOURCES) {
    for (const action of ALL_ACTIONS) {
      perms.push({ resource, action });
    }
  }
  return perms;
}

function permissionsFor(
  resources: Resource[],
  actions: Action[],
): Permission[] {
  const perms: Permission[] = [];
  for (const resource of resources) {
    for (const action of actions) {
      perms.push({ resource, action });
    }
  }
  return perms;
}

/** The built-in permission matrix shipped with every organisation. */
export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = {
  owner: allPermissions(),

  admin: [
    ...permissionsFor(
      ['workflow', 'execution', 'template', 'credential', 'team', 'project', 'api_key'],
      ['create', 'read', 'update', 'delete', 'execute', 'publish', 'manage_members', 'view_logs'],
    ),
    { resource: 'org_settings', action: 'read' },
    { resource: 'org_settings', action: 'update' },
    { resource: 'audit_log', action: 'read' },
    { resource: 'audit_log', action: 'view_logs' },
    { resource: 'billing', action: 'read' },
  ],

  member: [
    ...permissionsFor(
      ['workflow', 'execution', 'template'],
      ['create', 'read', 'update', 'execute', 'publish'],
    ),
    ...permissionsFor(['credential'], ['read']),
    ...permissionsFor(['team', 'project'], ['read', 'update']),
    { resource: 'api_key', action: 'create' },
    { resource: 'api_key', action: 'read' },
    { resource: 'api_key', action: 'delete' },
    { resource: 'audit_log', action: 'read' },
  ],

  viewer: [
    ...permissionsFor(
      ['workflow', 'execution', 'template', 'team', 'project'],
      ['read'],
    ),
    { resource: 'audit_log', action: 'read' },
  ],

  billing: [
    { resource: 'billing', action: 'read' },
    { resource: 'billing', action: 'update' },
    { resource: 'org_settings', action: 'read' },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check whether a given role has a specific permission. */
export function hasPermission(
  matrix: PermissionMatrix,
  role: OrgRole,
  resource: Resource,
  action: Action,
): boolean {
  const perms = matrix[role];
  return perms.some((p) => p.resource === resource && p.action === action);
}

/** Return all permissions for a role. */
export function getPermissions(
  matrix: PermissionMatrix,
  role: OrgRole,
): Permission[] {
  return matrix[role];
}
