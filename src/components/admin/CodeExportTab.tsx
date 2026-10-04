import { Smartphone } from "lucide-react";
import { ApkDownloadButton } from "@/components/ApkDownloadButton";

export function CodeExportTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest">
            <Smartphone className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Android app (APK)</p>
            <p className="text-xs text-muted-foreground">
              Everything needed to build the KINGS FOOD Android app is in the repository:
              <code className="mx-1">capacitor.config.json</code>, the build workflow in
              <code className="mx-1">.github/workflows/android-apk.yml</code> and full instructions in
              <code className="mx-1">ANDROID_APK.md</code>. Push the project to GitHub and the APK is built
              automatically and attached to the <span className="font-semibold">apk-latest</span> release for
              users to download, extract and install.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ApkDownloadButton variant="compact" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Once the APK is hosted, paste its link under <span className="font-semibold">Support → APK download URL</span>
              {" "}so the home-page download button serves it to every user.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
