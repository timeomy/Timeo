export type PortalRole = 'it_admin' | 'admin' | 'staff' | 'coach' | 'vendor' | 'member' | 'day_pass';

export function getPortalRouteForRoles(
  roles: string[] | null | undefined,
  opts: { fallbackToAdmin?: boolean } = { fallbackToAdmin: true },
) {
  const list = (roles ?? []).map((r) => String(r));

  if (list.includes('it_admin') || list.includes('admin')) return '/admin/dashboard';
  if (list.includes('coach')) return '/coach/dashboard';
  if (list.includes('vendor')) return '/vendor/dashboard';
  // Studio users are class instructors - they get member portal like staff
  if (list.includes('studio')) return '/member/dashboard';
  // Staff users should be treated like members - they get member portal
  if (list.includes('staff')) return '/member/dashboard';
  if (list.includes('member')) return '/member/dashboard';
  // Day pass users get member portal (limited access)
  if (list.includes('day_pass')) return '/member/dashboard';

  return opts.fallbackToAdmin ? '/admin/dashboard' : '/dashboard';
}
