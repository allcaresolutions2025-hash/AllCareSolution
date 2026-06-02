import { Smartphone, Download, ShieldCheck, Info, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Download Mobile App — ACHT MART",
  description: "Download the ACHT MART mobile app for Android.",
};

export default function DownloadAppPage() {
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
            <h1 className="text-2xl font-bold">ACHT MART Mobile App</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account, track commissions, and shop — all from your Android phone.
            </p>
            {apkUrl && (
              <p className="text-xs text-muted-foreground mt-2">
                Current version:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">v{apkVersion}</code>
              </p>
            )}
          </div>
        </div>

        <div className="mt-8">
          {apkUrl ? (
            <a
              href={apkUrl}
              target="_blank"
              rel="noopener noreferrer"
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
                <div className="font-semibold">App coming soon</div>
                <p className="text-sm mt-1">
                  The mobile app is currently being prepared. Check back here soon — the download link will appear once it is available.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <h2 className="font-semibold text-lg">How to install on Android</h2>
          <ol className="list-decimal pl-5 space-y-3 text-sm text-muted-foreground">
            <li>
              Tap <strong>Download APK</strong> above on your Android phone. If you are on a desktop, transfer the file to your phone first.
            </li>
            <li>
              Open your phone&apos;s <strong>file manager</strong> or notification panel and tap the downloaded file (it ends in <code className="bg-muted px-1 py-0.5 rounded text-xs">.apk</code>).
            </li>
            <li>
              If prompted with <em>&quot;Install unknown apps&quot;</em>, go to{" "}
              <strong>Settings → Apps → Special access → Install unknown apps</strong>, find your browser or file manager, and enable it.
            </li>
            <li>
              Return to the APK file and tap <strong>Install</strong>.
            </li>
            <li>
              Once installed, open <strong>ACHT MART</strong> from your home screen and sign in with your existing account credentials.
            </li>
          </ol>
        </div>

        <div className="mt-8 rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-2 text-sm">
          <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-emerald-700" />
          <p className="text-emerald-900">
            The APK is signed and built directly from ACHT MART&apos;s official source. Android may show an &quot;unknown developer&quot; warning for direct-download apps — this is normal and safe to proceed.
          </p>
        </div>
      </div>
    </div>
  );
}
