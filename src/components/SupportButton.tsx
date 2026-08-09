import { useEffect, useState } from "react";
import { LifeBuoy, X, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Settings = { support_email: string; button_label: string; intro_text: string; subject_prefix: string };

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.from("support_settings").select("support_email, button_label, intro_text, subject_prefix").maybeSingle()
      .then(({ data }) => data && setSettings(data as Settings));
  }, []);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    if (!subject.trim() || !body.trim()) return toast.error("Please fill in subject and message");
    const full = `${settings.subject_prefix} ${subject.trim()}`;
    const text = `From: ${name || "Anonymous"}\n\n${body}`;
    window.location.href = `mailto:${settings.support_email}?subject=${encodeURIComponent(full)}&body=${encodeURIComponent(text)}`;
    setOpen(false); setSubject(""); setBody("");
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={settings?.button_label || "Support"}
        className="fixed bottom-4 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105"
      >
        <LifeBuoy className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/40 p-4 md:place-items-center" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-primary" /> {settings?.button_label || "Support"}</h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{settings?.intro_text}</p>
            <form onSubmit={send} className="mt-4 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell us how we can help..." required rows={5} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
              <p className="text-xs text-muted-foreground">Opens your email app to send to <span className="font-mono">{settings?.support_email}</span></p>
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                <Send className="h-4 w-4" /> Open email
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
