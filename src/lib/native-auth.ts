import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";

const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

let googleInitPromise: Promise<void> | null = null;

export function isNativeApp() {
  return Capacitor.getPlatform() === "android" || Capacitor.getPlatform() === "ios";
}

export async function initializeNativeGoogleSignIn() {
  if (!isNativeApp()) return;

  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Native Google sign-in is not configured in this build.");
  }

  if (!googleInitPromise) {
    googleInitPromise = SocialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        mode: "online",
      },
    }).catch((error) => {
      googleInitPromise = null;
      throw error;
    });
  }

  await googleInitPromise;
}

export async function startNativeGoogleSignIn() {
  if (!isNativeApp()) {
    throw new Error("Native Google sign-in is only available inside the KINGS FOOD mobile app.");
  }

  await initializeNativeGoogleSignIn();

  // Android uses Google Credential Manager. This is a native Google surface;
  // it does not navigate to Chrome or an OAuth page inside the WebView.
  const response = await SocialLogin.login({
    provider: "google",
    options: {
      scopes: ["email", "profile"],
      style: "bottom",
      filterByAuthorizedAccounts: false,
      autoSelectEnabled: false,
    },
  });

  const result = response.result as {
    idToken?: string;
    accessToken?: string;
  };

  if (!result?.idToken) {
    throw new Error("Google did not return an ID token. Please try again.");
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: result.idToken,
    access_token: result.accessToken,
  });

  if (error) throw error;

  return supabase.auth.getSession();
}
