import fs from "node:fs";
import path from "node:path";
import { Smartphone, Download, ShieldCheck, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mobile App (Internal) — ACHT MART Admin",
  description: "Internal Android APK download for staff testing.",
};

const APK_PATH = "/downloads/achtmart.apk";

function apkAvailable() {
  try {
    const full = path.join(process.cwd(), "public", "downloads", "achtmart.apk");
    return fs.existsSync(full);
  } catch {
    return false;
  }
}

export default function AdminDownloadPage() {
  const available = apkAvailable();
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
          {available ? (
            <a
              href={APK_PATH}
              download
              className="btn-primary inline-flex items-center gap-2 py-3 px-6 text-base"
            >
              <Download className="h-5 w-5" />
              Download APK
            </a>
          ) : (
            <div className="rounded-lg border border-slate-300 bg-slate-50 text-slate-800 p-4 flex items-start gap-2">
              <Info className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">APK not uploaded yet</div>
                <p className="text-sm">
                  Build the app with{" "}
                  <code className="bg-white px-1 py-0.5 rounded border">
                    npm run build:apk
                  </code>{" "}
                  in <code className="bg-white px-1 py-0.5 rounded border">achtmart-mobile</code>,
                  then drop the resulting file at{" "}
                  <code className="bg-white px-1 py-0.5 rounded border">
                    public/downloads/achtmart.apk
                  </code>{" "}
                  and redeploy.
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
