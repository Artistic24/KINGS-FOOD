# KINGS FOOD — Android APK

The Android app is a native Capacitor build of the KINGS FOOD web application. The web application is bundled into the APK, so the app does not depend on Chrome to render the application shell.

## Google sign-in

Google sign-in is native on Android.

When the user taps **Continue with Google**:

1. KINGS FOOD calls Google Credential Manager through `@capgo/capacitor-social-login`.
2. Google account selection is shown using the native Android Google sign-in surface.
3. The returned Google ID token is exchanged directly with Supabase Auth.
4. The user returns to KINGS FOOD already signed in.

There is **no Lovable OAuth browser redirect and no Chrome launch** in the Android app. Google does not support normal Google Sign-In inside an ordinary Android WebView, so the native Credential Manager integration is used instead.

### Required GitHub Actions secret

The Android build requires:

- `VITE_GOOGLE_WEB_CLIENT_ID`

This must contain the **Google Web application OAuth client ID**, not the Android client ID. The Android package/signing SHA-1 must also be registered in the same Google Cloud project.

### Local build

Run `npm install`, then `npm run build`, install the Capacitor Android runtime, run `npx cap add android`, run `npx cap sync android`, and build with `cd android && ./gradlew assembleDebug`.

The APK is produced at `android/app/build/outputs/apk/debug/app-debug.apk`.

## App icon and splash screen

The launcher icon and splash screen are generated from the KF logo in `assets/` (`icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png`).

## Automatic GitHub build

The workflow in `.github/workflows/android-apk.yml` builds the production web bundle first, generates the Capacitor Android project, verifies that the bundled `dist/index.html` is present in the APK assets, and then builds the debug APK.

The workflow publishes the resulting APK to the `apk-latest` GitHub release.

## Connection requirements

The application still needs an internet connection for Supabase APIs, authentication, product data, orders, maps and other server-backed features. Bundling the web application removes the unnecessary dependency on an external browser for the app shell; it does not make the backend offline.

## Installing the APK

1. Download the APK.
2. Allow installation from the browser/file manager when Android asks.
3. Install KINGS FOOD.
4. Open the app and test **Continue with Google**.

For Google Sign-In troubleshooting, verify the installed APK's package name and signing SHA-1 in Google Cloud Console and make sure they match the Android OAuth client for the KINGS FOOD app.