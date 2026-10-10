import { useState } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { isNativeApp, startNativeGoogleSignIn } from "@/lib/native-auth";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AuthDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const finish = () => {
    onOpenChange(false);
    setPassword("");
  };

  const onGoogle = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (isNativeApp()) {
        // Native Android/iOS only. Never fall back to browser OAuth.
        await startNativeGoogleSignIn();
        toast.success("Welcome to KINGS FOOD!");
        finish();
        navigate({ to: "/", replace: true });
        return;
      }

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) finish();
    } catch (error: any) {
      toast.error(error?.message ?? "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created successfully.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
      }
      finish();
    } catch (error: any) {
      toast.error(error?.message ?? "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[94vh] rounded-t-[30px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="relative px-2 pb-3 pt-5 text-center">
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Close authentication"
              className="absolute right-1 top-3 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          </DrawerClose>
          <DrawerTitle className="font-display text-3xl font-bold">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </DrawerTitle>
          <DrawerDescription>
            {mode === "signin"
              ? "Sign in securely to KINGS FOOD."
              : "Join KINGS FOOD and manage your orders easily."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="mx-auto w-full max-w-md space-y-4 px-2 pb-5 pt-2">
          <Button
            type="button"
            onClick={() => void onGoogle()}
            disabled={loading}
            className="h-14 w-full rounded-2xl border border-input bg-card text-base font-semibold text-foreground hover:bg-muted"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z" />
                <path fill="#34A853" d="M12 21.6c2.62 0 4.82-.87 6.43-2.35l-3.14-2.45c-.87.58-1.98.92-3.29.92-2.53 0-4.67-1.71-5.44-4.01H3.32v2.53A9.72 9.72 0 0 0 12 21.6Z" />
                <path fill="#FBBC05" d="M6.56 13.71a5.83 5.83 0 0 1 0-3.42V7.76H3.32a9.7 9.7 0 0 0 0 8.48l3.24-2.53Z" />
                <path fill="#EA4335" d="M12 6.28c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.81 3.39 14.62 2.4 12 2.4a9.72 9.72 0 0 0-8.68 5.36l3.24 2.53 3.24 2.53C7.33 7.99 9.47 6.28 12 6.28Z" />
              </svg>
            )}
            {loading ? "Signing in…" : "Continue with Google"}
          </Button>

          {isNativeApp() && (\n            <div className="flex items-start gap-2.5 rounded-2xl border border-primary/15 bg-primary/5 px-3.5 py-3 text-xs leading-5 text-muted-foreground">\n              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />\n              <span>Choose your Google account in the secure in-app account sheet. It slides up from the bottom; KINGS FOOD will not open Chrome for Google sign-in.</span>\n            </div>\n          )}\n\n          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" required />
            )}
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" required />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={6} required />
            <Button type="submit" disabled={loading} className="h-14 w-full rounded-2xl">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to KINGS FOOD?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-semibold text-primary hover:underline"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
