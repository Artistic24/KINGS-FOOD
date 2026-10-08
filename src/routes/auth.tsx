import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { isNativeApp, startNativeGoogleSignIn } from "@/lib/native-auth";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — KINGS FOOD" },
      { name: "description", content: "Sign in securely to KINGS FOOD and track your orders." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        navigate({ to: redirect ?? "/", replace: true });
      }
    });
    return () => {
      active = false;
    };
  }, [navigate, redirect]);

  const goAfterAuth = () => {
    navigate({ to: redirect ?? "/", replace: true });
  };

  const onGoogle = async () => {
    if (loading) return;
    setLoading(true);

    try {
      if (isNativeApp()) {
        // IMPORTANT: Never fall back to web OAuth on Android/iOS.
        // Native Google Credential Manager keeps the entire sign-in interaction
        // inside the app and prevents Chrome from being launched.
        await startNativeGoogleSignIn();
        toast.success("Welcome to KINGS FOOD!");
        goAfterAuth();
        return;
      }

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.error) throw result.error;
      if (!result.redirected) goAfterAuth();
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
        if (password.length < 6) throw new Error("Password must contain at least 6 characters.");

        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
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

      goAfterAuth();
    } catch (error: any) {
      toast.error(error?.message ?? "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <main className="min-h-[calc(100svh-5rem)] bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <section className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-sm">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background px-6 pb-7 pt-8 text-center sm:px-8">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-sm">
              KF
            </div>

            <h1 className="mt-5 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {isSignup ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
              {isSignup
                ? "Join KINGS FOOD and keep your orders, addresses and deliveries in one place."
                : "Sign in securely to track your KINGS FOOD orders and manage your account."}
            </p>
          </div>

          <div className="px-5 pb-7 sm:px-8 sm:pb-8">
            <button
              type="button"
              onClick={() => void onGoogle()}
              disabled={loading}
              className="mt-2 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background px-5 text-base font-semibold text-foreground shadow-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Continue with Google"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
                  <path fill="#4285F4" d="M21.35 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.26Z" />
                  <path fill="#34A853" d="M12 21.6c2.62 0 4.82-.87 6.43-2.35l-3.14-2.45c-.87.58-1.98.92-3.29.92-2.53 0-4.67-1.71-5.44-4.01H3.32v2.53A9.72 9.72 0 0 0 12 21.6Z" />
                  <path fill="#FBBC05" d="M6.56 13.71a5.83 5.83 0 0 1 0-3.42V7.76H3.32a9.7 9.7 0 0 0 0 8.48l3.24-2.53Z" />
                  <path fill="#EA4335" d="M12 6.28c1.43 0 2.72.49 3.73 1.46l2.8-2.8C16.81 3.39 14.62 2.4 12 2.4a9.72 9.72 0 0 0-8.68 5.36l3.24 2.53C7.33 7.99 9.47 6.28 12 6.28Z" />
                </svg>
              )}
              <span>{loading ? "Signing in…" : "Continue with Google"}</span>
            </button>

            {isNativeApp() && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Google sign-in opens in KINGS FOOD's secure native sign-in surface. Chrome is not used.</span>
              </div>
            )}

            <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onSubmit} className="space-y-3.5">
              {isSignup && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium">Full name</span>
                  <input
                    autoComplete="name"
                    className="h-14 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="Your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Email</span>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  className="h-14 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Password</span>
                <input
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  className="h-14 w-full rounded-2xl border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {isSignup ? "Create account" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {isSignup ? "Already have an account?" : "New to KINGS FOOD?"}{" "}
              <button
                type="button"
                onClick={() => setMode(isSignup ? "signin" : "signup")}
                className="font-semibold text-primary hover:underline"
              >
                {isSignup ? "Sign in" : "Create an account"}
              </button>
            </p>

            <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
              Your account is protected by KINGS FOOD authentication. We never ask for your Google password inside the app.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
