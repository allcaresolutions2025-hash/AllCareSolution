import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// MAINTENANCE MODE
// Flip this to `false` and redeploy to bring the site back online. While `true`,
// every request (pages, login, API) gets a 503 maintenance notice — no database
// is read or written, and no data is changed. This is a pure request-layer gate.
// ─────────────────────────────────────────────────────────────────────────────
const MAINTENANCE_MODE = false;

// Routes that require authentication — middleware only runs the auth check on
// these. Everything else is public and passes straight through.
const PROTECTED_PREFIXES = [
  "/account",
  "/affiliate/dashboard",
  "/affiliate/kyc",
  "/affiliate/payouts",
  "/admin",
  "/checkout",
];

const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ACHT MART — Under Maintenance</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(1200px 500px at 100% -10%, rgba(13,148,136,0.10), transparent),
                radial-gradient(900px 500px at -10% 0%, rgba(41,129,67,0.10), transparent), #f6faf7;
    color: #1d2b22; padding: 24px;
  }
  .card {
    max-width: 480px; width: 100%; background: #fff; border: 1px solid #e2e8f0;
    border-radius: 24px; padding: 40px 32px; text-align: center;
    box-shadow: 0 16px 48px -16px rgba(15,23,42,0.18);
  }
  .badge {
    display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;
    color: #298143; background: #ecfdf3; border: 1px solid #bbe6c5;
    padding: 6px 14px; border-radius: 999px; margin-bottom: 20px;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; }
  h1 { font-size: 26px; margin: 0 0 12px; color: #194329; }
  p { font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 8px; }
  .brand { margin-top: 28px; font-weight: 700; letter-spacing: 0.04em; color: #298143; }
  .tag { font-size: 12px; color: #94a3b8; font-weight: 500; }
</style>
</head>
<body>
  <div class="card">
    <div class="badge"><span class="dot"></span> Under maintenance</div>
    <h1>We&rsquo;ll be back soon</h1>
    <p>Our website is temporarily down for scheduled maintenance.</p>
    <p>Please check back in a little while — thank you for your patience.</p>
    <div class="brand">ACHT MART</div>
    <div class="tag">Pure Nature, Pure Wellness</div>
  </div>
</body>
</html>`;

function maintenanceResponse(): NextResponse {
  return new NextResponse(MAINTENANCE_HTML, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "Retry-After": "3600",
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}

const authMiddleware = withAuth(
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
  },
);

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  // Maintenance gate runs first, for every route — pages, login and API alike.
  if (MAINTENANCE_MODE) {
    return maintenanceResponse();
  }

  const path = req.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(p + "/"),
  );
  if (isProtected) {
    // Delegate to next-auth's withAuth wrapper for the protected routes only.
    return (authMiddleware as unknown as (
      req: NextRequest,
      event: NextFetchEvent,
    ) => ReturnType<typeof authMiddleware>)(req, event);
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals and the favicon so the maintenance
  // gate can cover the whole site. When maintenance is off this is a no-op for
  // public routes (returns next()).
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
