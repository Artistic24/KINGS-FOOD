import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Google blocks OAuth inside embedded WebViews, so the Android app runs the
// sign-in in an in-app browser tab and receives the session back through the
// com.kingsfood.app://auth-callback deep link (see public/native-auth-callback.html).
const CALLBACK_PREFIX = "com.kingsfood.app://auth-callback";
const STATE_KEY = "kf-native-oauth-state";
const REDIRECT_KEY = "kf-native-oauth-redirect";

export async function isNativeApp() {
  if (typeof window === "undefined") return false;
  const { Capacitor } = await import("@capacitor/core");
  return Capacitor.isNativePlatform();
}

function randomState() {
  return [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function startNativeGoogleSignIn(redirect?: string) {
  const state = randomState();
  localStorage.setItem(STATE_KEY, state);
  if (redirect) localStorage.setItem(REDIRECT_KEY, redirect);
  else localStorage.removeItem(REDIRECT_KEY);

  const origin = window.location.origin;
  const params = new URLSearchParams({
    provider: "google",
    redirect_uri: `${origin}/native-auth-callback.html`,
    state,
  });
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url: `${origin}/~oauth/initiate?${params.toString()}` });
}

async function handleCallbackUrl(url: string, onSignedIn: (to: string) => void) {
  if (!url.startsWith(CALLBACK_PREFIX)) return;

  const expectedState = localStorage.getItem(STATE_KEY);
  const redirect = localStorage.getItem(REDIRECT_KEY) ?? "/";
  if (!expectedState) return;
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(REDIRECT_KEY);

  const { Browser } = await import("@capacitor/browser");
  Browser.close().catch(() => {});

  const params = new URL(url).searchParams;
  const state = params.get("state");
  if (state && state !== expectedState) {
    toast.error("Google sign-in failed: invalid state");
    return;
  }
  const error = params.get("error_description") ?? params.get("error");
  if (error) {
    toast.error(error);
    return;
  }
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    toast.error("Google sign-in failed: no session received");
    return;
  }
  const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
  if (sessionError) {
    toast.error(sessionError.message ?? "Google sign-in failed");
    return;
  }
  toast.success("Welcome!");
  onSignedIn(redirect);
}

export function listenForNativeAuth(onSignedIn: (to: string) => void) {
  let removed = false;
  let remove: (() => void) | undefined;

  (async () => {
    if (!(await isNativeApp())) return;
    const { App } = await import("@capacitor/app");
    const handle = await App.addListener("appUrlOpen", ({ url }) => {
      void handleCallbackUrl(url, onSignedIn);
    });
    remove = () => void handle.remove();
    if (removed) remove();
    const launch = await App.getLaunchUrl();
    if (launch?.url) void handleCallbackUrl(launch.url, onSignedIn);
  })();

  return () => {
    removed = true;
    remove?.();
  };
}
