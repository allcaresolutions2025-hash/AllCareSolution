// Single source of truth for where an account lands after signing in. Used by
// every login page (base /login, AF /af/login) so an account always reaches
// the correct portal no matter which login page it used.
//
// Priority:
//   1. Admin          → /admin
//   2. AF account     → /af/dashboard
//   3. Fresher member → /affiliate/dashboard/add-member (must onboard)
//   4. Base member    → /affiliate/dashboard
type LoginUser = {
  role?: string;
  isAf?: boolean;
  mustOnboard?: boolean;
};

export function loginDestination(
  user: LoginUser | undefined,
  callbackUrl?: string | null,
): string {
  if (user?.role === "ADMIN") return "/admin";
  if (user?.isAf) return "/af/dashboard";
  if (user?.mustOnboard) return "/affiliate/dashboard/add-member";
  return callbackUrl ?? "/affiliate/dashboard";
}
