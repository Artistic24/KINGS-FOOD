import { useEffect, useState } from "react";
import { Download, FolderArchive, Loader2, RefreshCw, Smartphone } from "lucide-react";
import { ApkDownloadButton } from "@/components/ApkDownloadButton";

type Manifest = { generatedAt: string; files: number; bytes: number };

export function CodeExportTab() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/source-manifest.json?t=${Date.now()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => setManifest(m))
      .catch(() => setManifest(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const mb = manifest ? (manifest.bytes / 1024 / 1024).toFixed(2) : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold">Source code</h2>
        <p className="text-sm text-muted-foreground">
          A complete compressed snapshot of the KINGS FOOD website — every route, component, image, asset,
          database migration and config file needed to deploy an identical copy. It is rebuilt automatically
          each time the site is updated.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <FolderArchive className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">kingsfood-source.zip</p>
            {loading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> checking latest snapshot…
              </p>
            ) : manifest ? (
              <p className="text-xs text-muted-foreground">
                {manifest.files} files · {mb} MB · updated{" "}
                {new Date(manifest.generatedAt).toLocaleString()}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Snapshot will be available after the next site update.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/kingsfood-source.zip"
                download
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Download className="h-4 w-4" /> Download ZIP
              </a>
              <button
                onClick={load}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                <RefreshCw className="h-4 w-4" /> Check for update
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest">
            <Smartphone className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Android app (APK)</p>
            <p className="text-xs text-muted-foreground">
              The archive above contains everything needed to build the KINGS FOOD Android app:
              <code className="mx-1">capacitor.config.json</code>, the build workflow in
              <code className="mx-1">.github/workflows/android-apk.yml</code> and full instructions in
              <code className="mx-1">ANDROID_APK.md</code>. Push the project to GitHub and the APK is built
              automatically and attached to the <span className="font-semibold">apk-latest</span> release for
              users to download, extract and install.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/kingsfood-source.zip"
                download
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
              >
                <Download className="h-4 w-4" /> Get build files
              </a>
              <ApkDownloadButton variant="compact" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Once the APK is hosted, paste its link under <span className="font-semibold">Support → APK download URL</span>
              {" "}so the home-page download button serves it to every user.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
        <p className="mb-1 font-semibold text-foreground">How to redeploy from this archive</p>
        <ol className="list-decimal space-y-1 pl-4">
          <li>Unzip the folder on your computer.</li>
          <li>Run <code>bun install</code> (or <code>npm install</code>) inside it.</li>
          <li>Add your backend keys to the <code>.env</code> file, then run <code>bun run dev</code> to preview or <code>bun run build</code> to deploy.</li>
        </ol>
      </div>

    </div>
  );
}
