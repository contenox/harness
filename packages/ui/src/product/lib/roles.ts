import type { MembershipRole } from './api/types';


export const ROLE_LABELS: Record<MembershipRole, string> = {
  tenant_owner: 'Owner',
  tenant_admin: 'Admin',
  tenant_user: 'Member',
};

/**
 * roleLabel maps a wire role to its label, passing through anything unknown rather than hiding it.
 */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role as MembershipRole] ?? role;
}

/**
 * Whether this role may invite and remove people — `auth.CanManageMembers`, which is owner or admin.
 */
export function canManageMembers(role: string | undefined): boolean {
  return role === 'tenant_owner' || role === 'tenant_admin';
}


export const ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  tenant_owner:
    'Everything an admin can, plus renaming or deleting the account and granting or taking the owner role.',
  tenant_admin:
    'Invites and removes members, changes non-owner roles, pairs and revokes machines, and manages billing.',
  tenant_user: "Attaches to the account's machines and drives the sessions on them.",
};
