# KINGS FOOD — Android APK

The APK is a native Android shell (Capacitor) that runs the live KINGS FOOD
site inside a full-screen app window, so GPS tracking, camera-based ID and
face verification, voice turn-by-turn alerts and the arrival alarm all work
exactly like they do on the website — with an app icon on the home screen.

## Getting the APK

**Option A — GitHub (automatic).** Push this project to GitHub. The workflow
in `.github/workflows/android-apk.yml` builds the APK on every push to `main`
and attaches it to the `apk-latest` release. Users download it from the
repository's **Releases** page.

**Option B — Build it yourself** (needs Node 20 + Java 17 + Android SDK):

```bash
npm i --no-save @capacitor/cli @capacitor/core @capacitor/android
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

## Publishing it in the app

Upload the `.apk` somewhere public (GitHub release asset works) and paste the
link into **Admin control center → Support → APK download URL**. The
"Download APK" button on the home page then serves it to every user.

## Installing on an Android device

1. Download the `.apk`.
2. Allow "Install unknown apps" for your browser/file manager when prompted.
3. Tap the file and install — KINGS FOOD appears in the app drawer.
4. Accept the location and camera permissions on first launch.

## Notes

- The shell points at `https://kings-marketplace.lovable.app` (see
  `capacitor.config.json`). Change that URL if you deploy elsewhere.
- The debug APK is unsigned for the Play Store; it installs fine by sideload.
  For Play Store distribution run `./gradlew bundleRelease` with your own
  keystore.
