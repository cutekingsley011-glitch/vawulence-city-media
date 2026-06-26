import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredUser } from "@/lib/user";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id: number;
  userId: string;
  messageText: string;
  senderName: string | null;
  createdAt: string;
}

interface ChatStatus {
  isOpen: boolean;
  msUntilOpen: number;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Opening...";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-NG", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Africa/Lagos",
  });
}

export default function ChatRoomPage() {
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [inputError, setInputError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const user = getStoredUser();

  // ── Fetch status ──────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/status");
      const s: ChatStatus = await r.json();
      setStatus(s);
      setCountdown(s.msUntilOpen);
    } catch { /* ignore */ }
  }, []);

  // ── Fetch messages ────────────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/messages");
      if (r.ok) setMessages(await r.json());
    } catch { /* ignore */ }
  }, []);

  // Initial load + status poll (30s)
  useEffect(() => {
    fetchStatus();
    fetchMessages();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus, fetchMessages]);

  // Message poll every 3s when open
  useEffect(() => {
    if (!status?.isOpen) return;
    const id = setInterval(fetchMessages, 3_000);
    return () => clearInterval(id);
  }, [status?.isOpen, fetchMessages]);

  // Countdown tick every second
  useEffect(() => {
    if (status?.isOpen || countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1000)), 1_000);
    return () => clearInterval(id);
  }, [status?.isOpen, countdown]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;
    setSending(true);
    setInputError(null);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, messageText: text.trim() }),
      });
      if (res.status === 403) {
        const { error } = await res.json();
        setInputError(error);
        return;
      }
      if (!res.ok) throw new Error();
      setText("");
      await fetchMessages();
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  // ── Closed screen ─────────────────────────────────────────────────────────
  if (!status) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-muted-foreground">
        <MessageCircle className="w-10 h-10 opacity-30 animate-pulse" />
        <p className="text-sm">Loading Chat Room…</p>
      </div>
    );
  }

  const chatEnded = !status.isOpen && messages.length > 0 && countdown > 0;

  if (!status.isOpen) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold mb-1">VCM Chat Room</h1>
          {messages.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              Tonight's chat has ended. See you tomorrow at 6PM!
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Chat opens at 6:00 PM — come back then!
            </p>
          )}
        </div>
        {countdown > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-8 py-5">
            <p className="text-xs text-muted-foreground mb-1">Opens in</p>
            <p className="text-3xl font-mono font-bold text-primary">{formatCountdown(countdown)}</p>
          </div>
        )}
        {/* Show archived messages read-only */}
        {messages.length > 0 && (
          <div className="w-full mt-4">
            <p className="text-xs text-muted-foreground mb-3 text-left font-medium">Tonight's messages (read-only)</p>
            <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
              {messages.map((m) => (
                <div key={m.id} className="bg-muted/40 rounded-xl px-4 py-2.5 text-left">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-xs font-bold text-primary">{m.senderName ?? "Anonymous"}</span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(m.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground">{m.messageText}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Open chat ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-white shrink-0">
        <div className="relative">
          <MessageCircle className="w-5 h-5 text-primary" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold leading-none">VCM Chat Room</h1>
          <p className="text-[10px] text-green-600 font-medium">Live · Closes 8:00 PM</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-10">
            No messages yet. Be the first to say something! 🔥
          </div>
        )}
        {messages.map((m) => {
          const isMe = user && m.userId === user.id;
          return (
            <div key={m.id} className={`flex flex-col max-w-[80%] ${isMe ? "self-end items-end" : "self-start items-start"}`}>
              {!isMe && (
                <span className="text-[10px] font-semibold text-primary mb-0.5 px-1">
                  {m.senderName ?? "Anonymous"}
                </span>
              )}
              <div className={`rounded-2xl px-3.5 py-2 text-sm ${isMe ? "bg-primary text-white rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                {m.messageText}
              </div>
              <span className="text-[9px] text-muted-foreground mt-0.5 px-1">
                {formatTime(m.createdAt)}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-4 py-3 bg-white">
        {inputError ? (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-2.5">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{inputError}</span>
          </div>
        ) : !user ? (
          <div className="text-center text-sm text-muted-foreground py-1">
            <a href="/" className="text-primary underline">Join VCM</a> to chat
          </div>
        ) : (
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Say something…"
              maxLength={500}
              className="flex-1"
              autoComplete="off"
            />
            <Button type="submit" size="icon" disabled={!text.trim() || sending} className="shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
