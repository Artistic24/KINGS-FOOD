import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
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
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>email and password</span>
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
