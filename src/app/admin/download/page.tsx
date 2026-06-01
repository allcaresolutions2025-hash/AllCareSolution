import { Smartphone, Download, ShieldCheck, Info, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mobile App (Internal) — ACHT MART Admin",
  description: "Internal Android APK download for staff testing.",
};

export default function AdminDownloadPage() {
  // APKs are too large for git; we host them on Expo's CDN (or your own bucket)
  // and point the page at the URL via env var. Set MOBILE_APK_URL in Vercel.
  const apkUrl = process.env.MOBILE_APK_URL?.trim();
  const apkVersion = process.env.MOBILE_APK_VERSION?.trim() ?? "0.1.0";

  return (
    <div className="max-w-3xl">
      <div className="card p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-brand-600 text-white p-3 shrink-0">
            <Smartphone className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ACHT MART Mobile (Internal)</h1>
            <p className="text-muted-foreground mt-1">
              Pre-release Android build for staff testing. Not yet linked from the
              public site — share the APK only with internal testers.
            </p>
            {apkUrl ? (
              <p className="text-xs text-muted-foreground mt-2">
                Current build: <code className="bg-muted px-1 py-0.5 rounded">v{apkVersion}</code>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 p-4 flex items-start gap-2">
          <Info className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Internal use only</div>
            <p className="text-sm">
              This page is admin-only. Once testing is complete, re-add a public
              link from the site footer to make the app available to members.
            </p>
          </div>
        </div>

        <div className="mt-8">
          {apkUrl ? (
            <a
              href={apkUrl}
              target="_blank"
              rel="noopener"
              className="btn-primary inline-flex items-center gap-2 py-3 px-6 text-base"
            >
              <Download className="h-5 w-5" />
              Download APK
              <ExternalLink className="h-4 w-4 opacity-70" />
            </a>
          ) : (
            <div className="rounded-lg border border-slate-300 bg-slate-50 text-slate-800 p-4 flex items-start gap-2">
              <Info className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">APK URL not configured</div>
                <p className="text-sm mt-1">
                  Set the <code className="bg-white px-1 py-0.5 rounded border">MOBILE_APK_URL</code>{" "}
                  environment variable in Vercel to the download URL of your latest{" "}
                  <a
                    href="https://expo.dev"
                    target="_blank"
                    rel="noopener"
                    className="underline"
                  >
                    EAS build
                  </a>
                  . Optionally also set{" "}
                  <code className="bg-white px-1 py-0.5 rounded border">MOBILE_APK_VERSION</code>{" "}
                  (e.g.{" "}
                  <code className="bg-white px-1 py-0.5 rounded border">0.1.0</code>
                  ).
                </p>
                <p className="text-xs text-slate-600 mt-3">
                  After updating env vars in Vercel, redeploy or wait for the next
                  auto-deploy to pick them up.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="font-semibold text-lg">Tester install steps</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
            <li>Tap <strong>Download APK</strong> above on your Android phone.</li>
            <li>
              When prompted, allow installs from this site (Settings → Apps → Special
              access → Install unknown apps).
            </li>
            <li>Open the downloaded file and tap <strong>Install</strong>.</li>
            <li>Launch ACHT MART and sign in with your test credentials.</li>
          </ol>
        </div>

        <div className="mt-8 rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-2 text-sm">
          <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-emerald-700" />
          <p className="text-emerald-900">
            The APK is signed and built from our own source. The unknown-developer
            warning on first install is expected for direct-download Android apps.
          </p>
        </div>
      </div>
    </div>
  );
}
