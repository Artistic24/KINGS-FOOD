import { useEffect, useState } from "react";
import { Camera, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { UserBadge, useUserBadge } from "@/components/UserBadge";

export function ProfileEditor() {
  const { user } = useAuth();
  const tier = useUserBadge(user?.id);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    supabase.from("profiles").select("full_name, phone, avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) { setFullName(data.full_name || ""); setPhone(data.phone || ""); setAvatarUrl(data.avatar_url || null); }
      });
  }, [user]);

  const onAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5 MB");
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: uerr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uerr) { setUploading(false); return toast.error(uerr.message); }
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    const url = signed?.signedUrl || "";
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setAvatarUrl(url); setUploading(false);
    toast.success("Profile picture updated");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error: pErr } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", user.id);
    if (pErr) { setSaving(false); return toast.error(pErr.message); }

    const updates: { email?: string; password?: string } = {};
    if (email !== user.email) updates.email = email;
    if (password.length >= 6) updates.password = password;
    if (Object.keys(updates).length) {
      const { error: aErr } = await supabase.auth.updateUser(updates);
      if (aErr) { setSaving(false); return toast.error(aErr.message); }
      if (updates.email) toast.message("Email change: check your inbox to confirm.");
      if (updates.password) toast.success("Password updated");
      setPassword("");
    } else {
      toast.success("Profile saved");
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <div className="relative">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="grid h-20 w-20 place-items-center rounded-full bg-muted text-2xl font-bold">{(fullName || email)[0]?.toUpperCase()}</div>
          )}
          <label className="absolute -bottom-1 -right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90">
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatar(f); }} />
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </label>
        </div>
        <div>
          <p className="flex items-center gap-1 font-display text-lg font-bold">{fullName || "Your profile"} <UserBadge tier={tier} /></p>
          <p className="text-xs text-muted-foreground">Edit any field. No re-authentication required.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Full name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></Field>
        <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></Field>
        <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></Field>
        <Field label="New password (leave blank to keep)"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /></Field>
      </div>

      <button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>{children}</label>;
}
