import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: redirect ?? "/", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate, redirect]);

  const goAfterAuth = () => navigate({ to: redirect ?? "/", replace: true });


  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <main className="relative isolate flex min-h-[calc(100svh-4rem)] items-center justify-center overflow-hidden bg-background px-4 py-7 sm:px-6 sm:py-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="grid w-full max-w-5xl overflow-hidden rounded-[30px] border border-border/70 bg-card shadow-[0_24px_90px_-38px_rgba(0,0,0,0.28)] md:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden min-h-[650px] flex-col justify-between overflow-hidden bg-primary p-9 text-primary-foreground md:flex lg:p-12">
          <div aria-hidden="true" className="absolute -right-20 top-20 h-72 w-72 rounded-full border-[42px] border-white/10" />
          <div aria-hidden="true" className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-black/10" />
          <div className="relative">
            <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/20 bg-white/10 text-lg font-black tracking-tight">KF</div>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.28em] text-primary-foreground/70">Good food. Good life.</p>
            <h2 className="mt-4 max-w-sm text-4xl font-bold leading-[1.12] tracking-tight lg:text-5xl">
              Your next favourite meal is closer.
            </h2>
            <p className="mt-5 max-w-sm text-base leading-7 text-primary-foreground/80">
              Sign in to keep your orders, delivery details and favourites together in one place.
            </p>
          </div>
          <div className="relative space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">Simple and secure</p>
                <p className="mt-0.5 text-xs text-primary-foreground/70">Your account, your orders, all in one place.</p>
              </div>
            </div>
            <p className="text-xs text-primary-foreground/60">KINGS FOOD · Made for Cameroon</p>
          </div>
        </aside>

        <section className="min-w-0 px-5 py-7 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-7 flex items-center gap-3 md:hidden">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-base font-black text-primary-foreground">KF</div>
              <div>
                <p className="font-display text-lg font-bold leading-tight">KINGS FOOD</p>
                <p className="text-xs text-muted-foreground">Good food. Good life.</p>
              </div>
            </div>

            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{isSignup ? "Join the family" : "Welcome back"}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {isSignup ? "Create your account" : "Sign in to your account"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {isSignup
                  ? "Create an account to make your next order easier."
                  : "Your favourite meals and order updates are waiting for you."}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-2 rounded-2xl bg-muted p-1" role="tablist" aria-label="Account access">
              <button
                type="button"
                role="tab"
                aria-selected={!isSignup}
                onClick={() => setMode("signin")}
                className={`h-11 rounded-xl text-sm font-semibold transition ${!isSignup ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Sign in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignup}
                onClick={() => setMode("signup")}
                className={`h-11 rounded-xl text-sm font-semibold transition ${isSignup ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Create account
              </button>
            </div>

            <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>"sign in with email"</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {isSignup && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold">Full name</span>
                  <span className="relative block">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      autoComplete="name"
                      className="h-14 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                      placeholder="Your full name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </span>
                </label>
              )}

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Email address</span>
                <span className="relative block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="h-14 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold">Password</span>
                <span className="relative block">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    className="h-14 w-full rounded-2xl border border-border bg-background py-2 pl-12 pr-12 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    placeholder={isSignup ? "At least 6 characters" : "Enter your password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
                {isSignup && <span className="mt-1.5 block text-xs text-muted-foreground">Use at least 6 characters.</span>}
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-base font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                {isSignup ? "Create my account" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
              By continuing, you agree to use KINGS FOOD responsibly. Your sign-in details are handled securely.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
