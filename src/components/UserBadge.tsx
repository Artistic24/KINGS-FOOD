import { useEffect, useState } from "react";
import { Crown, ShieldCheck, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type BadgeTier = "super" | "admin" | "user";

const cache = new Map<string, BadgeTier>();

export function useUserBadge(userId?: string | null): BadgeTier {
  const [tier, setTier] = useState<BadgeTier>(() => (userId && cache.get(userId)) || "user");
  useEffect(() => {
    if (!userId) return;
    if (cache.has(userId)) { setTier(cache.get(userId)!); return; }
    let alive = true;
    (async () => {
      const [{ data: role }, { data: superFlag }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
        supabase.rpc("is_user_super_admin", { _uid: userId }),
      ]);
      const t: BadgeTier = superFlag ? "super" : role ? "admin" : "user";
      cache.set(userId, t);
      if (alive) setTier(t);
    })();
    return () => { alive = false; };
  }, [userId]);
  return tier;
}

export function UserBadge({ tier, className = "" }: { tier: BadgeTier; className?: string }) {
  if (tier === "super") {
    return (
      <span title="Super Admin" className={`inline-flex items-center gap-0.5 rounded-full bg-yellow-400/20 px-1.5 py-0.5 text-yellow-600 ring-1 ring-yellow-500/50 ${className}`}>
        <Crown className="h-3 w-3 fill-yellow-400 stroke-yellow-700" />
      </span>
    );
  }
  if (tier === "admin") {
    return (
      <span title="Admin" className={`inline-flex items-center gap-0.5 rounded-full bg-slate-300/30 px-1.5 py-0.5 text-slate-600 ring-1 ring-slate-400/60 ${className}`}>
        <ShieldCheck className="h-3 w-3 fill-slate-300 stroke-slate-700" />
      </span>
    );
  }
  return (
    <span title="Member" className={`inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-emerald-700 ring-1 ring-emerald-500/40 ${className}`}>
      <BadgeCheck className="h-3 w-3" />
    </span>
  );
}
