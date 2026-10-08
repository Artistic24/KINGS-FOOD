import { useState } from "react";
import { Loader2, X } from "lucide-react";
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
    setLoading(true);
    try {
      if (await isNativeApp()) {
        await startNativeGoogleSignIn("/");
        toast.success("Welcome to KINGS FOOD!");
        finish();
        return;
      }

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        toast.success("Google sign-in started");
        finish();
      }
    } catch (error: any) {
      toast.error(error?.message ?? "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Welcome to KINGS FOOD!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
      finish();
    } catch (error: any) {
      toast.error(error?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] rounded-t-[28px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <DrawerHeader className="relative px-2 pb-2 pt-5 text-center">
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Close authentication"
              className="absolute right-1 top-3 inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-5" />
            </button>
          </DrawerClose>
          <DrawerTitle className="font-display text-3xl font-normal">
            {mode === "signin" ? "Log in" : "Sign up"}
          </DrawerTitle>
          <DrawerDescription className="text-sm">
            {mode === "signin" ? "Welcome back to KINGS FOOD." : "Create your KINGS FOOD account."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="mx-auto w-full max-w-md space-y-4 px-2 pb-4 pt-2">
          <Button
            type="button"
            onClick={() => void onGoogle()}
            disabled={loading}
            className="h-14 w-full rounded-full border border-input bg-card text-base font-semibold text-foreground hover:bg-muted"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4.2-5.5 4.2-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.7 2.5 2.5 6.7 2.5 12s4.2 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"/>
            </svg>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue with Google"}
          </Button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" && (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" required />
            )}
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" required />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" minLength={6} required />
            <Button type="submit" disabled={loading} className="h-12 w-full rounded-full">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Continue" : "Create account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to KINGS FOOD?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="font-semibold text-primary hover:underline">
              {mode === "signin" ? "Sign up" : "Log in"}
            </button>
          </p>

          <p className="text-center text-xs leading-5 text-muted-foreground">
            On Android, Google account selection uses the native Credential Manager bottom sheet, so the user stays in the KINGS FOOD app.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
