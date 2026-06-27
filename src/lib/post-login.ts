// Single source of truth for where an account lands after signing in. Used by
// every login page (base /login, Pro Max member /promax/login, Pro Max admin
// /promax-admin/login) so an account always reaches the correct portal no matter
// which login page it used.
//
// Priority:
//   1. Pro Max admin   → /promax-admin
//   2. Main admin      → /admin
//   3. Pro Max member  → /promax/dashboard
//   4. Fresher member  → /affiliate/dashboard/add-member (must onboard)
//   5. Base member     → /affiliate/dashboard
type LoginUser = {
  role?: string;
  isProMax?: boolean;
  mustOnboard?: boolean;
};

export function loginDestination(
  user: LoginUser | undefined,
  callbackUrl?: string | null,
): string {
  const role = user?.role;
  if (role === "PROMAX_ADMIN") return "/promax-admin";
  if (role === "ADMIN") return "/admin";
  if (user?.isProMax) return "/promax/dashboard";
  if (user?.mustOnboard) return "/affiliate/dashboard/add-member";
  return callbackUrl ?? "/affiliate/dashboard";
}
