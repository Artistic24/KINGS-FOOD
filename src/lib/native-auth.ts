import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

let googleInitPromise: Promise<void> | null = null;

export async function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function initializeNativeGoogleSignIn() {
  if (!Capacitor.isNativePlatform()) return;
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Google native sign-in is not configured. Set VITE_GOOGLE_WEB_CLIENT_ID to the Google Web OAuth client ID.");
  }

  if (!googleInitPromise) {
    googleInitPromise = SocialLogin.initialize({
      google: { webClientId: GOOGLE_WEB_CLIENT_ID, mode: "online" },
    }).catch((error) => {
      googleInitPromise = null;
      throw error;
    });
  }

  await googleInitPromise;
}

export async function startNativeGoogleSignIn(redirect?: string) {
  if (!Capacitor.isNativePlatform()) throw new Error("Native Google sign-in is only available in the Android app");

  await initializeNativeGoogleSignIn();

  // Android uses Google Credential Manager. "bottom" keeps the Google account
  // picker as an in-app bottom sheet instead of sending the user to a browser.
  const response = await SocialLogin.login({
    provider: "google",
    options: {
      scopes: ["email", "profile"],
      style: "bottom",
      filterByAuthorizedAccounts: false,
    },
  });

  const result = response.result as { responseType?: string; idToken?: string; accessToken?: string };
  if (!result?.idToken) throw new Error("Google did not return an ID token");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: result.idToken,
    access_token: result.accessToken,
  });
  if (error) throw error;

  toast.success("Welcome to KINGS FOOD!");
  return redirect ?? "/";
}
