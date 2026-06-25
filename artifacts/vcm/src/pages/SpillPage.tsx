import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Send, Clock, MessageSquare } from "lucide-react";

interface SpillSession {
  id: number;
  questionText: string;
  scheduledTime: string | null;
  isLive: boolean;
  createdAt: string;
}

interface SpillMessage {
  id: number;
  messageText: string;
  createdAt: string;
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SpillPage() {
  const [session, setSession] = useState<SpillSession | null>(null);
  const [messages, setMessages] = useState<SpillMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadSession() {
    const r = await fetch("/api/spill/sessions/current");
    if (r.ok) {
      const s: SpillSession | null = await r.json();
      setSession(s);
      if (s) loadMessages(s.id);
    }
    setLoading(false);
  }

  async function loadMessages(sessionId: number) {
    const r = await fetch(`/api/spill/sessions/${sessionId}/messages`);
    if (r.ok) setMessages(await r.json());
  }

  useEffect(() => {
    loadSession();
    // Poll every 15s while live
    pollRef.current = setInterval(() => {
      setSession((prev) => {
        if (prev?.isLive) loadMessages(prev.id);
        return prev;
      });
    }, 15000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !session?.isLive) return;
    setSending(true);
    const r = await fetch(`/api/spill/sessions/${session.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageText: text.trim() }),
    });
    if (r.ok) {
      setText("");
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      await loadMessages(session.id);
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-56 rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-bold mb-2">No Session Yet</h2>
        <p className="text-sm text-muted-foreground">Check back tonight at 8 PM for the next Spill the Tea session!</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-3 py-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <Flame className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-lg leading-tight">Spill the Tea Live</h1>
            {session.isLive ? (
              <Badge className="bg-red-500 text-white text-xs animate-pulse">LIVE</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">Ended</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Anonymous · No receipts 🔥</p>
        </div>
      </div>

      {/* Tonight's question */}
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-5">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Tonight's Question</p>
        <p className="text-base font-bold text-foreground leading-snug">{session.questionText}</p>
        {session.scheduledTime && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <Clock className="w-3 h-3" />
            {new Date(session.scheduledTime).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>

      {/* Submit box (only when live) */}
      {session.isLive ? (
        <form onSubmit={handleSubmit} className="mb-5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Spill your tea anonymously… 👀"
            rows={3}
            maxLength={500}
            className="mb-2 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{text.length}/500</span>
            <div className="flex items-center gap-2">
              {sent && <span className="text-xs text-green-600 font-medium">Poured! ✓</span>}
              <Button type="submit" size="sm" disabled={sending || !text.trim()} className="gap-1.5">
                <Send className="w-3.5 h-3.5" />
                {sending ? "Pouring..." : "Pour the Tea"}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-muted/50 rounded-2xl p-4 mb-5 text-center">
          <p className="text-sm font-medium text-muted-foreground">Tonight's session has ended.</p>
          <p className="text-xs text-muted-foreground mt-1">Check back tomorrow at 8 PM 🕗</p>
        </div>
      )}

      {/* Messages feed */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">{messages.length} message{messages.length !== 1 ? "s" : ""}</span>
        </div>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {session.isLive ? "Be the first to spill! 👆" : "No messages were submitted."}
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map((m) => (
              <div key={m.id} className="bg-white border border-border rounded-xl px-4 py-3">
                <p className="text-sm text-foreground leading-relaxed">{m.messageText}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{formatRelative(m.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
