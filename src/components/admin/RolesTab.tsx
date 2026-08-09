import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ADMIN_SECTIONS } from "@/lib/admin-sections";

type AdminRow = {
  user_id: string;
  full_name: string | null;
  region: string;
  town: string;
  is_super_admin: boolean;
};

export function RolesTab() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: admins, isLoading } = useQuery({
    queryKey: ["admin-locations-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_locations")
        .select("user_id, full_name, region, town, is_super_admin")
        .order("is_super_admin", { ascending: false });
      if (error) throw error;
      return (data || []) as AdminRow[];
    },
  });

  const { data: perms } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_admin_permissions");
      if (error) throw error;
      return (data || []) as { user_id: string; section: string; allowed: boolean }[];
    },
  });

  const denied = useMemo(() => {
    const m = new Set<string>();
    (perms || []).forEach((p) => { if (!p.allowed) m.add(`${p.user_id}:${p.section}`); });
    return m;
  }, [perms]);

  const toggle = useMutation({
    mutationFn: async (v: { userId: string; section: string; allowed: boolean }) => {
      const { error } = await supabase.rpc("set_admin_permission", {
        _target: v.userId,
        _section: v.section,
        _allowed: v.allowed,
      });
      if (error) throw error;
    },
    onMutate: (v) => setBusy(`${v.userId}:${v.section}`),
    onSettled: () => setBusy(null),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-permissions"] }); },
    onError: (e: any) => toast.error(e.message || "Could not update permission"),
  });

  if (isLoading) return <div className="grid place-items-center py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><ShieldCheck className="h-5 w-5 text-primary" /> Roles &amp; permissions</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Check a section to allow that admin to open it. Unchecking hides the tab from their control center. Super admins always keep full access.
        </p>
      </div>

      {(admins || []).map((a) => (
        <div key={a.user_id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            {a.is_super_admin
              ? <Crown className="h-4 w-4 fill-yellow-400 stroke-yellow-700" />
              : <ShieldCheck className="h-4 w-4 text-slate-500" />}
            <div>
              <p className="text-sm font-semibold">{a.full_name || "Admin"}</p>
              <p className="text-xs text-muted-foreground">{a.town}, {a.region}</p>
            </div>
          </div>

          {a.is_super_admin ? (
            <p className="mt-3 rounded-lg bg-yellow-400/15 px-3 py-2 text-xs">Super admin — full access to every section.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {ADMIN_SECTIONS.map((s) => {
                const id = `${a.user_id}:${s.key}`;
                const checked = !denied.has(id);
                return (
                  <label key={s.key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy === id}
                      onChange={(e) => toggle.mutate({ userId: a.user_id, section: s.key, allowed: e.target.checked })}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="truncate">{s.label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {(admins || []).length === 0 && <p className="text-sm text-muted-foreground">No admins yet.</p>}
    </div>
  );
}
