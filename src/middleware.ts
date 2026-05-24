import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const mustOnboard = req.nextauth.token?.mustOnboard as boolean | undefined;
    const path = req.nextUrl.pathname;
    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Fresher accounts must complete the Add Member form before using the app.
    if (mustOnboard && role !== "ADMIN" && !path.startsWith("/affiliate/dashboard/add-member")) {
      return NextResponse.redirect(new URL("/affiliate/dashboard/add-member", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/account/:path*", "/affiliate/dashboard/:path*", "/affiliate/kyc/:path*", "/affiliate/payouts/:path*", "/admin/:path*", "/checkout"],
};
