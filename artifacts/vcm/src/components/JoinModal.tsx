import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegisterUser } from "@workspace/api-client-react";
import { setStoredUser } from "@/lib/user";

interface Props {
  open: boolean;
  onJoined: () => void;
}

export default function JoinModal({ open, onJoined }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const register = useRegisterUser();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Both fields are required.");
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
        onError: () => setError("Something went wrong. Please try again."),
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
            <span className="text-2xl font-extrabold text-primary tracking-tight">VCM</span>
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
            <Input
              id="join-name"
              data-testid="input-name"
              placeholder="e.g. Adaeze Okafor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={register.isPending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="join-email">Email Address</Label>
            <Input
              id="join-email"
              type="email"
              data-testid="input-email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
