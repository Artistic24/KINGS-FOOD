import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GOOGLE_WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined;

export async function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function startNativeGoogleSignIn(redirect?: string) {
  if (!Capacitor.isNativePlatform()) throw new Error("Native Google sign-in is only available in the Android app");
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Google native sign-in is not configured. Set VITE_GOOGLE_WEB_CLIENT_ID to the Google Web OAuth client ID.");
  }

  await SocialLogin.initialize({
    google: { webClientId: GOOGLE_WEB_CLIENT_ID, mode: "online" },
  });

  const response = await SocialLogin.login({
    provider: "google",
    options: { scopes: ["email", "profile"] },
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
