import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Clock, Lock, Reply, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStoredUser } from "@/lib/user";
import { useToast } from "@/hooks/use-toast";

interface ReplyInfo {
  id: number;
  senderName: string | null;
  messageText: string;
}

interface ChatMessage {
  id: number;
  userId: string;
  messageText: string;
  senderName: string | null;
  createdAt: string;
  replyTo: ReplyInfo | null;
  reactions: Record<string, number>;
  myReaction: string | null;
}

interface ChatStatus {
  isOpen: boolean;
  msUntilOpen: number;
}

const REACTION_EMOJIS = ["👍", "😂", "😡"] as const;

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

// ── Swipeable message wrapper ──────────────────────────────────────────────────
function SwipeableMessage({ children, onSwipe }: { children: React.ReactNode; onSwipe: () => void }) {
  const startXRef = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const swipedRef = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    startXRef.current = e.touches[0].clientX;
    swipedRef.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startXRef.current === null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    if (dx > 0) setOffset(Math.min(dx, 60));
  }

  function onTouchEnd() {
    if (offset >= 40 && !swipedRef.current) {
      swipedRef.current = true;
      onSwipe();
    }
    setOffset(0);
    startXRef.current = null;
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ transform: `translateX(${offset}px)`, transition: offset === 0 ? "transform 0.2s ease" : "none" }}
    >
      {children}
    </div>
  );
}

// ── Reaction Picker ────────────────────────────────────────────────────────────
function ReactionPicker({ isMe, onReact, onClose }: { isMe: boolean; onReact: (emoji: string) => void; onClose: () => void }) {
  return (
    <div className={`absolute z-20 bottom-full mb-1 flex gap-1 bg-white border border-border rounded-full shadow-lg px-2 py-1 ${isMe ? "right-0" : "left-0"}`}>
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => { e.stopPropagation(); onReact(emoji); onClose(); }}
          className="text-lg hover:scale-125 active:scale-110 transition-transform leading-none p-0.5"
        >
          {emoji}
        </button>
      ))}
      <button onClick={onClose} className="text-muted-foreground ml-1 text-xs self-center">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Scroll to message + flash highlight ───────────────────────────────────────
function scrollToMessage(id: number) {
  const el = document.getElementById(`msg-${id}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("chat-highlight");
  setTimeout(() => el.classList.remove("chat-highlight"), 1200);
}

export default function ChatRoomPage() {
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [inputError, setInputError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isNearBottomRef = useRef(true);

  const { toast } = useToast();
  const user = getStoredUser();

  // ── Track whether user is near the bottom ────────────────────────────────
  function handleScroll() {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distFromBottom < 100;
  }

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
      const url = user ? `/api/chat/messages?userId=${encodeURIComponent(user.id)}` : "/api/chat/messages";
      const r = await fetch(url);
      if (r.ok) setMessages(await r.json());
    } catch { /* ignore */ }
  }, [user?.id]);

  useEffect(() => {
    fetchStatus();
    fetchMessages();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus, fetchMessages]);

  useEffect(() => {
    if (!status?.isOpen) return;
    const id = setInterval(fetchMessages, 3_000);
    return () => clearInterval(id);
  }, [status?.isOpen, fetchMessages]);

  useEffect(() => {
    if (status?.isOpen || countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1000)), 1_000);
    return () => clearInterval(id);
  }, [status?.isOpen, countdown]);

  // ── Smart auto-scroll: only pull down if user is already near bottom ──────
  useEffect(() => {
    if (messages.length === 0) return;
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  // Close reaction picker on outside click
  useEffect(() => {
    if (pickerFor === null) return;
    const handler = () => setPickerFor(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [pickerFor]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    setInputError(null);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          messageText: text.trim(),
          replyToId: replyTo?.id ?? null,
        }),
      });
      if (res.status === 403) {
        const { error } = await res.json();
        setInputError(error);
        return;
      }
      if (!res.ok) throw new Error();
      setText("");
      setReplyTo(null);
      // After own send, always scroll to bottom
      isNearBottomRef.current = true;
      await fetchMessages();
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  // ── React to message ──────────────────────────────────────────────────────
  async function reactToMessage(messageId: number, emoji: string) {
    if (!user) return;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const reactions = { ...m.reactions };
        const prevMy = m.myReaction;
        if (prevMy && reactions[prevMy]) {
          reactions[prevMy] = Math.max(0, reactions[prevMy] - 1);
          if (reactions[prevMy] === 0) delete reactions[prevMy];
        }
        const isToggle = prevMy === emoji;
        if (!isToggle) reactions[emoji] = (reactions[emoji] ?? 0) + 1;
        return { ...m, reactions, myReaction: isToggle ? null : emoji };
      })
    );
    try {
      await fetch(`/api/chat/messages/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, emoji }),
      });
    } catch {
      await fetchMessages();
    }
  }

  // ── Long press ────────────────────────────────────────────────────────────
  function startLongPress(messageId: number) {
    longPressRef.current = setTimeout(() => setPickerFor(messageId), 400);
  }
  function cancelLongPress() {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  }

  // ── Reply ────────────────────────────────────────────────────────────────
  function startReply(msg: ChatMessage) {
    setReplyTo({ id: msg.id, senderName: msg.senderName, messageText: msg.messageText });
    textareaRef.current?.focus();
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

  if (!status.isOpen) {
    return (
      <div className="max-w-lg mx-auto px-4 py-10 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Clock className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold mb-1">VCM Chat Room</h1>
          {messages.length > 0 ? (
            <p className="text-muted-foreground text-sm">Tonight's chat has ended. See you tomorrow at 6PM!</p>
          ) : (
            <p className="text-muted-foreground text-sm">Chat opens daily 6:00 PM – 10:00 PM. Come back then!</p>
          )}
        </div>
        {countdown > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-8 py-5">
            <p className="text-xs text-muted-foreground mb-1">Opens in</p>
            <p className="text-3xl font-mono font-bold text-primary">{formatCountdown(countdown)}</p>
          </div>
        )}
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
                  <p className="text-sm text-foreground whitespace-pre-wrap">{m.messageText}</p>
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
    <>
      {/* Highlight flash style */}
      <style>{`
        .chat-highlight {
          animation: chatFlash 1.2s ease;
        }
        @keyframes chatFlash {
          0%   { background-color: transparent; }
          20%  { background-color: rgba(29,78,216,0.18); }
          100% { background-color: transparent; }
        }
      `}</style>

      <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-2xl mx-auto" onClick={() => setPickerFor(null)}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-white shrink-0">
          <div className="relative">
            <MessageCircle className="w-5 h-5 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold leading-none">VCM Chat Room</h1>
            <p className="text-[10px] text-green-600 font-medium">Live · Closes 10:00 PM</p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={scrollAreaRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
        >
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-10">
              No messages yet. Be the first to say something! 🔥
            </div>
          )}
          {messages.map((m) => {
            const isMe = user && m.userId === user.id;
            const hasReactions = Object.keys(m.reactions).length > 0;

            return (
              <SwipeableMessage key={m.id} onSwipe={() => startReply(m)}>
                <div
                  id={`msg-${m.id}`}
                  className={`flex flex-col max-w-[80%] rounded-lg transition-colors ${isMe ? "self-end items-end" : "self-start items-start"}`}
                >
                  {!isMe && (
                    <span className="text-[10px] font-semibold text-primary mb-0.5 px-1">
                      {m.senderName ?? "Anonymous"}
                    </span>
                  )}

                  <div className="relative">
                    {pickerFor === m.id && user && (
                      <ReactionPicker
                        isMe={!!isMe}
                        onReact={(emoji) => reactToMessage(m.id, emoji)}
                        onClose={() => setPickerFor(null)}
                      />
                    )}

                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm cursor-pointer select-none ${isMe ? "bg-primary text-white rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}
                      onMouseDown={() => startLongPress(m.id)}
                      onMouseUp={cancelLongPress}
                      onMouseLeave={cancelLongPress}
                      onTouchStart={() => startLongPress(m.id)}
                      onTouchEnd={cancelLongPress}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Reply quote — tap to jump to original */}
                      {m.replyTo && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); scrollToMessage(m.replyTo!.id); }}
                          className={`w-full text-left mb-1.5 px-2 py-1 rounded-lg text-[11px] border-l-2 active:opacity-70 transition-opacity ${isMe ? "border-white/60 bg-white/15 text-white/80" : "border-primary bg-primary/10 text-muted-foreground"}`}
                        >
                          <span className="font-semibold block">{m.replyTo.senderName ?? "Anonymous"}</span>
                          <span className="line-clamp-1">{m.replyTo.messageText}</span>
                        </button>
                      )}
                      <span className="whitespace-pre-wrap break-words">{m.messageText}</span>
                    </div>

                    {hasReactions && (
                      <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? "justify-end" : "justify-start"}`}>
                        {Object.entries(m.reactions).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={(e) => { e.stopPropagation(); if (user) reactToMessage(m.id, emoji); }}
                            className={`flex items-center gap-0.5 text-xs rounded-full px-2 py-0.5 border transition-colors ${m.myReaction === emoji ? "bg-primary/15 border-primary/40 text-primary font-semibold" : "bg-white border-border text-foreground"}`}
                          >
                            <span>{emoji}</span>
                            <span>{count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className="text-[9px] text-muted-foreground">{formatTime(m.createdAt)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); startReply(m); }}
                      className="text-muted-foreground/50 hover:text-primary transition-colors"
                    >
                      <Reply className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </SwipeableMessage>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border bg-white">
          {replyTo && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-border">
              <Reply className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-primary">{replyTo.senderName ?? "Anonymous"}</p>
                <p className="text-[11px] text-muted-foreground truncate">{replyTo.messageText}</p>
              </div>
              <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="px-4 py-3">
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
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={replyTo ? `Replying to ${replyTo.senderName ?? "Anonymous"}…` : "Say something…"}
                  maxLength={500}
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden leading-5"
                  style={{ minHeight: "40px", maxHeight: "120px" }}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  size="icon"
                  disabled={!text.trim() || sending}
                  onClick={sendMessage}
                  className="shrink-0 self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
