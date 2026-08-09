import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, Loader2, Ban, RotateCcw, Bike } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  rider_id: string;
  full_name: string;
  phone: string | null;
  region: string | null;
  town: string | null;
  banned: boolean;
  delivered_count: number;
  cancelled_count: number;
  active_count: number;
  total_orders: number;
  cancel_rate_pct: number;
  delivery_rate_pct: number;
  avg_delivery_minutes: number;
  speed_score_pct: number;
  overall_rating_pct: number;
};

export function RiderLeaderboardTab() {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ["rider-leaderboard"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("rider_leaderboard");
      if (error) throw error;
      return (data as Row[]) ?? [];
    },
  });

  const ban = useMutation({
    mutationFn: async (rider_id: string) => {
      const { error } = await (supabase as any).rpc("admin_remove_rider", { _rider_id: rider_id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rider removed"); qc.invalidateQueries({ queryKey: ["rider-leaderboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const restore = useMutation({
    mutationFn: async (rider_id: string) => {
      const { error } = await (supabase as any).rpc("admin_restore_rider", { _rider_id: rider_id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rider restored"); qc.invalidateQueries({ queryKey: ["rider-leaderboard"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-saffron" />
        <h2 className="font-display text-xl font-bold">Rider leaderboard</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Overall rating = 60% delivery success + 40% delivery speed. Riders below expectations can be removed.
      </p>

      {isLoading ? (
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No riders yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">#</th>
                <th>Rider</th>
                <th>Rating</th>
                <th>Delivered</th>
                <th>Cancelled</th>
                <th>Cancel %</th>
                <th>Avg time</th>
                <th>Speed</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.rider_id} className={`border-t border-border ${r.banned ? "opacity-50" : ""}`}>
                  <td className="p-3 font-bold">{i + 1}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Bike className="h-4 w-4 text-primary" />
                      <div>
                        <div className="font-medium">{r.full_name}</div>
                        <div className="text-xs text-muted-foreground">{r.phone} · {r.town || "—"}</div>
                        {r.banned && <span className="mt-1 inline-block rounded-full bg-destructive/10 px-2 text-[10px] text-destructive">Removed</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-forest" style={{ width: `${r.overall_rating_pct}%` }} />
                      </div>
                      <span className="text-xs font-bold">{r.overall_rating_pct}%</span>
                    </div>
                  </td>
                  <td className="font-semibold text-forest">{r.delivered_count}</td>
                  <td className="text-destructive">{r.cancelled_count}</td>
                  <td>{r.cancel_rate_pct}%</td>
                  <td>{r.avg_delivery_minutes ? `${r.avg_delivery_minutes}m` : "—"}</td>
                  <td>{r.speed_score_pct}%</td>
                  <td className="text-right pr-3">
                    {r.banned ? (
                      <button
                        onClick={() => restore.mutate(r.rider_id)}
                        className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1 text-xs font-semibold hover:bg-muted"
                      >
                        <RotateCcw className="h-3 w-3" /> Restore
                      </button>
                    ) : (
                      <button
                        onClick={() => { if (confirm(`Remove ${r.full_name}?`)) ban.mutate(r.rider_id); }}
                        className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-3 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <Ban className="h-3 w-3" /> Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
