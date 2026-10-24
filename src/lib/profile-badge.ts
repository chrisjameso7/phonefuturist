export type ProfileBadge = 'gold' | 'green' | null;

// Call only with foundation_access roles, never user-editable metadata.
export function badgeForAccess(access: { active: boolean; verified: boolean; roles: string[] } | null): ProfileBadge {
  if (!access?.active || !access.verified) return null;
  if (access.roles.includes('admin')) return 'gold';
  return access.roles.some(role => ['writer', 'editor', 'publisher', 'moderator'].includes(role)) ? 'green' : null;
}

export function badgeLabel(badge: unknown): string | null {
  return badge === 'gold' ? 'Verified administrator' : badge === 'green' ? 'Verified staff' : null;
}
