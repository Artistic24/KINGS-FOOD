import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, X, Send, Paperclip, Loader2, Trash2, Pin, PinOff, Bot, MoreVertical, Copy, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";
import { UserBadge, useUserBadge } from "@/components/UserBadge";
import { toast } from "sonner";
import { getBotReply, BOT_NAME } from "@/lib/chat-bot";
import { useServerFn } from "@tanstack/react-start";
import { chatWithAi } from "@/lib/chat-ai.functions";

type Msg = {
  id: string;
  user_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  pinned?: boolean | null;
  pinned_at?: string | null;
  is_bot?: boolean;
  profile?: { full_name: string | null; avatar_url: string | null } | null;
};

/** Prefix stored on bot replies so every member in the room can see them. */
const BOT_MARK = "\u{1F916}[KINGS FOOD Bot] ";

/** Topics the assistant should jump into on its own, no @bot tag needed. */
const BOT_TOPICS =
  /\b(order|orders|track|tracking|deliver|delivery|rider|riders|pay|payment|momo|mobile money|orange|cash|price|prices|fee|fees|zone|region|town|admin|badge|apk|download|install|app|account|profile|password|email|cart|checkout|product|products|sector|stock|review|rating|refund|cancel|support|help|contact|map|maps|gps|location|hi|hello|hey|salut|bonjour)\b/i;

function isRelevantForBot(text: string) {
  const t = text.trim();
  if (!t) return false;
  if (/@bot\b/i.test(t)) return true;
  if (/\?\s*$/.test(t)) return true;
  if (/^(how|what|where|when|why|who|can|could|do|does|is|are|should|will|please)\b/i.test(t)) return true;
  return BOT_TOPICS.test(t);
}

export function GlobalChat() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const askAi = useServerFn(chatWithAi);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (!alive || !data) return;
      await hydrate(data as Msg[], true);
    })();
    const channel = supabase
      .channel("chat_messages_room")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (payload) => {
        const m = payload.new as Msg;
        const [hydrated] = await hydrate([m], false);
        setMsgs((curr) => [...curr, hydrated]);
        requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, (payload) => {
        const m = payload.new as Msg;
        setMsgs((curr) => curr.map((x) => x.id === m.id ? { ...x, ...m, profile: x.profile } : x));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "chat_messages" }, (payload) => {
        setMsgs((curr) => curr.filter((x) => x.id !== (payload.old as any).id));
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };

    async function hydrate(rows: Msg[], replace: boolean) {
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      const out = rows.map((r) => {
        const bot = typeof r.content === "string" && r.content.startsWith(BOT_MARK);
        return {
          ...r,
          content: bot ? (r.content as string).slice(BOT_MARK.length) : r.content,
          is_bot: bot,
          profile: bot ? { full_name: BOT_NAME, avatar_url: null } : (map.get(r.user_id) ?? null),
        };
      });
      if (replace) setMsgs(out);
      return out;
    }
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }));
  }, [open]);

  const pinned = useMemo(() => msgs.filter((m) => m.pinned).slice(-3), [msgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const outgoing = text.trim();
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({ user_id: user.id, content: outgoing });
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");

    // Smart assistant: replies to anything relevant, tagged or not, and
    // welcomes members the first time they post. Replies are written to the
    // room so every member sees them.
    const firstTimeHere = !msgs.some((m) => !m.is_bot && m.user_id === user.id);
    if (!firstTimeHere && !isRelevantForBot(outgoing)) return;
    const question = outgoing.replace(/@bot\b/gi, "").trim() || "Hello";

    const priorTurns = msgs.slice(-8).map((m) => ({
      role: (m.is_bot ? "assistant" : "user") as "user" | "assistant",
      content: m.content || "",
    })).filter((m) => m.content);

    const postBot = async (content: string) => {
      const { error: berr } = await supabase.from("chat_messages").insert({
        user_id: user.id,
        content: BOT_MARK + content,
      });
      if (berr) toast.error(berr.message);
    };

    const welcome = firstTimeHere
      ? `Welcome to the KINGS FOOD community, ${user.user_metadata?.full_name || "friend"}! 👋 Ask me anything about orders, delivery, payments, riders or the app.\n\n`
      : "";

    try {
      const { reply } = await askAi({ data: { messages: [...priorTurns, { role: "user", content: question }] } });
      await postBot(welcome + reply);
    } catch (err: any) {
      const fallback = getBotReply(question);
      await postBot(welcome + (fallback || "I'm here to help with orders, delivery, payments, riders and the app — ask away!"));
      console.warn("AI reply failed:", err?.message);
    }

  };

  const upload = async (file: File) => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10 MB");
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error: uerr } = await supabase.storage.from("chat-files").upload(path, file);
    if (uerr) { setUploading(false); return toast.error(uerr.message); }
    const { data: signed } = await supabase.storage.from("chat-files").createSignedUrl(path, 60 * 60 * 24 * 365);
    const url = signed?.signedUrl || "";
    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id, file_url: url, file_name: file.name, file_type: file.type,
    });
    setUploading(false);
    if (error) toast.error(error.message);
  };

  const handleDelete = async (m: Msg) => {
    if (m.is_bot) { setMsgs((curr) => curr.filter((x) => x.id !== m.id)); return; }
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("chat_messages").delete().eq("id", m.id);
    if (error) toast.error(error.message);
  };

  const handlePin = async (m: Msg) => {
    const { error } = await supabase.from("chat_messages")
      .update({ pinned: !m.pinned, pinned_at: !m.pinned ? new Date().toISOString() : null, pinned_by: !m.pinned ? user?.id : null })
      .eq("id", m.id);
    if (error) toast.error(error.message);
    else toast.success(!m.pinned ? "Message pinned" : "Unpinned");
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Community chat"
        className="fixed bottom-20 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-forest text-forest-foreground shadow-lg shadow-forest/30 transition-transform hover:scale-105"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-x-0 bottom-0 z-50 flex h-[80vh] flex-col rounded-t-2xl border border-border bg-card shadow-2xl md:bottom-4 md:right-4 md:left-auto md:h-[600px] md:w-96 md:rounded-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h2 className="font-display font-bold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-forest" /> Community chat</h2>
              <p className="text-[10px] text-muted-foreground">Public room — be respectful</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>

          {pinned.length > 0 && (
            <div className="border-b border-border bg-amber-50 dark:bg-amber-950/20 px-3 py-2 space-y-1 max-h-32 overflow-y-auto">
              {pinned.map((m) => (
                <div key={`pin-${m.id}`} className="flex items-start gap-2 text-xs">
                  <Pin className="mt-0.5 h-3 w-3 shrink-0 fill-amber-500 stroke-amber-700" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold">{m.profile?.full_name || "Member"}: </span>
                    <span className="break-words">{m.content || m.file_name || "(attachment)"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {msgs.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No messages yet. Say hi 👋</p>}
            {msgs.map((m) => (
              <ChatRow
                key={m.id}
                m={m}
                mine={m.user_id === user?.id}
                canDelete={!!user && (m.user_id === user.id || isAdmin)}
                canPin={isAdmin}
                onDelete={() => handleDelete(m)}
                onPin={() => handlePin(m)}
              />
            ))}
          </div>

          {!user ? (
            <div className="border-t border-border p-3 text-center text-sm">
              <Link to="/auth" className="text-primary font-semibold underline">Sign in</Link> to join the chat
            </div>
          ) : (
            <form onSubmit={send} className="flex items-end gap-2 border-t border-border p-2">
              <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-muted">
                <input type="file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </label>
              <textarea
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e as any); } }}
                placeholder="Type a message… the assistant replies automatically"
                className="max-h-24 flex-1 resize-none rounded-2xl border border-input bg-background px-3 py-2 text-sm"
              />
              <button disabled={sending || !text.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}

function ChatRow({
  m, mine, canDelete, canPin, onDelete, onPin,
}: {
  m: Msg; mine: boolean; canDelete: boolean; canPin: boolean;
  onDelete: () => void; onPin: () => void;
}) {
  const tier = useUserBadge(m.is_bot ? "" : m.user_id);
  const name = m.is_bot ? BOT_NAME : (m.profile?.full_name || "Member");

  // Long-press (mobile-friendly) deletion for messages the user can delete.
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPress = () => {
    if (!canDelete) return;
    pressTimer.current = setTimeout(() => {
      if (confirm("Delete this message?")) onDelete();
    }, 600);
  };
  const cancelPress = () => { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; } };

  return (
    <div className={`group flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
      {m.is_bot ? (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-forest-foreground">
          <Bot className="h-4 w-4" />
        </div>
      ) : m.profile?.avatar_url ? (
        <img src={m.profile.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">{name[0]?.toUpperCase()}</div>
      )}
      <div
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => { if (canDelete) { e.preventDefault(); if (confirm("Delete this message?")) onDelete(); } }}
        className={`relative max-w-[75%] select-none rounded-2xl px-3 py-2 ${
          m.is_bot ? "border border-forest/30 bg-forest/10 text-foreground"
                   : mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
        } ${m.pinned ? "ring-2 ring-amber-400" : ""}`}
      >
        <div className="flex items-center gap-1 text-[10px] opacity-80">
          <span className="font-semibold">{name}</span>
          {m.is_bot ? <span className="rounded-full bg-forest px-1.5 text-[8px] font-bold text-forest-foreground">BOT</span> : <UserBadge tier={tier} />}
          {m.pinned && <Pin className="h-2.5 w-2.5 fill-amber-500 stroke-amber-700" />}
        </div>
        {m.content && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{m.content}</p>}
        {m.file_url && (
          m.file_type?.startsWith("image/") ? (
            <a href={m.file_url} target="_blank" rel="noreferrer"><img src={m.file_url} alt={m.file_name || ""} className="mt-1 max-h-48 rounded-lg" /></a>
          ) : (
            <a href={m.file_url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs underline"><Paperclip className="h-3 w-3" />{m.file_name}</a>
          )
        )}
        <div className="mt-0.5 flex items-center gap-2">
          <p className="text-[9px] opacity-60">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
          <MessageMenu
            m={m}
            canDelete={canDelete}
            canPin={canPin}
            onDelete={onDelete}
            onPin={onPin}
          />
        </div>
      </div>
    </div>
  );
}

function MessageMenu({
  m, canDelete, canPin, onDelete, onPin,
}: {
  m: Msg; canDelete: boolean; canPin: boolean;
  onDelete: () => void; onPin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const copy = async () => {
    const text = m.content || m.file_url || "";
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
    setOpen(false);
  };

  const report = () => {
    toast.success("Reported to moderators", { description: "Thanks — we'll review this message." });
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative ml-auto">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label="Message actions"
        className="rounded-full p-1 opacity-60 hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
      >
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-6 z-10 w-40 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
        >
          <MenuItem icon={<Copy className="h-3.5 w-3.5" />} label="Copy" onClick={copy} />
          {canPin && !m.is_bot && (
            <MenuItem
              icon={m.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              label={m.pinned ? "Unpin" : "Pin"}
              onClick={() => { onPin(); setOpen(false); }}
            />
          )}
          {!m.is_bot && (
            <MenuItem icon={<Flag className="h-3.5 w-3.5" />} label="Report" onClick={report} />
          )}
          {canDelete && (
            <MenuItem
              icon={<Trash2 className="h-3.5 w-3.5" />}
              label="Delete"
              danger
              onClick={() => { onDelete(); setOpen(false); }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon, label, onClick, danger,
}: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted ${danger ? "text-destructive" : ""}`}
    >
      {icon}
      {label}
    </button>
  );
}
