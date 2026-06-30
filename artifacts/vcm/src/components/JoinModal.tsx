import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterUser } from "@workspace/api-client-react";
import { setStoredUser } from "@/lib/user";
import { Smile } from "lucide-react";

interface Props {
  open: boolean;
  onJoined: () => void;
}

const EMOJI_LIST = [
  "😀","😂","😍","🥰","😎","🤩","🥳","😤","🔥","❤️",
  "💯","✨","🌟","👑","💎","🎉","🎊","🦋","🌹","🦁",
  "🐯","🦅","⚡","🌈","💫","🎯","🏆","💪","🙌","👏",
  "🤣","😭","🥺","😏","🤔","👀","💀","🫶","🤟","✌️",
];

export default function JoinModal({ open, onJoined }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const register = useRegisterUser();

  useEffect(() => { if (!open) { setShowEmoji(false); } }, [open]);

  function insertEmoji(emoji: string) {
    const input = nameRef.current;
    if (!input) { setName((n) => n + emoji); return; }
    const start = input.selectionStart ?? name.length;
    const end = input.selectionEnd ?? name.length;
    const next = name.slice(0, start) + emoji + name.slice(end);
    setName(next);
    requestAnimationFrame(() => {
      input.focus();
      const pos = start + emoji.length;
      input.setSelectionRange(pos, pos);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Both fields are required.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    register.mutate(
      { data: { name: name.trim(), email: email.trim() } },
      {
        onSuccess: (user) => {
          setStoredUser({ id: user.id, name: user.name, email: user.email });
          onJoined();
        },
        onError: (err: unknown) => {
          const status = (err as { status?: number })?.status;
          const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          if (status === 409 || (message && message.toLowerCase().includes("taken"))) {
            setError("That username is already taken — try a different one.");
          } else if (status === 403 || (message && message.toLowerCase().includes("banned"))) {
            setError("This account has been banned from VCM.");
          } else {
            setError(message ?? "Something went wrong. Please try again.");
          }
        },
      }
    );
  }

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-sm mx-auto"
        onInteractOutside={(e) => e.preventDefault()}
        aria-describedby={undefined}
        data-testid="join-modal"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <img src="/vcm-logo.png" alt="VCM" className="h-10 w-auto object-contain" />
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            Join the Conversation
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your name and email to comment, react, and stay connected.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2" data-testid="join-form">
          <div className="space-y-1">
            <Label htmlFor="join-name">Your Name</Label>
            <div className="flex gap-1">
              <Input
                ref={nameRef}
                id="join-name"
                data-testid="input-name"
                placeholder="e.g. Adaeze 🌹 Okafor"
                value={name}
                onChange={(e) => { setError(""); setName(e.target.value); }}
                disabled={register.isPending}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Add emoji"
                className="shrink-0"
                onClick={() => setShowEmoji((v) => !v)}
              >
                <Smile className="w-4 h-4" />
              </Button>
            </div>
            {showEmoji && (
              <div className="flex flex-wrap gap-1 p-2 bg-muted/30 rounded-lg border border-border mt-1 max-h-28 overflow-y-auto">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="text-lg hover:scale-125 transition-transform leading-none p-0.5"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Your username is permanent — choose carefully!</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="join-email">Email Address</Label>
            <Input
              id="join-email"
              type="email"
              data-testid="input-email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setError(""); setEmail(e.target.value); }}
              disabled={register.isPending}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" data-testid="join-error">{error}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={register.isPending}
            data-testid="button-join"
          >
            {register.isPending ? "Joining..." : "Join the Conversation"}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Entertainment Without Border.
        </p>
      </DialogContent>
    </Dialog>
  );
}
