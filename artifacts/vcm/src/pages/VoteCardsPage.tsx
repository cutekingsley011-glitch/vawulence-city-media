import { useState } from "react";
import { Link } from "wouter";
import {
  useListVoteCards,
  useCreateVoteCard,
  useCastVote,
  getListVoteCardsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getStoredUser } from "@/lib/user";
import { Vote, Plus, MessageSquare } from "lucide-react";

type VoteCard = {
  id: number;
  title: string;
  optionALabel: string;
  optionBLabel: string;
  optionACount: number;
  optionBCount: number;
  isActive: boolean;
  totalVotes: number;
  createdAt: string;
  commentCount?: number;
  imageUrl?: string | null;
  imageUrl2?: string | null;
};

function VoteCardItem({ card }: { card: VoteCard }) {
  const castVote = useCastVote();
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const [voted, setVoted] = useState<"a" | "b" | null>(null);
  const [optACount, setOptACount] = useState(card.optionACount);
  const [optBCount, setOptBCount] = useState(card.optionBCount);
  const [totalVotes, setTotalVotes] = useState(card.totalVotes);

  function handleVote(choice: "a" | "b") {
    if (voted !== null || !card.isActive) return;
    const prevA = optACount, prevB = optBCount, prevTotal = totalVotes;
    if (choice === "a") setOptACount((v) => v + 1);
    else setOptBCount((v) => v + 1);
    setTotalVotes((v) => v + 1);
    setVoted(choice);

    castVote.mutate(
      { id: card.id, data: { userId: user?.id ?? "", chosenOption: choice } },
      {
        onError: () => {
          setOptACount(prevA); setOptBCount(prevB); setTotalVotes(prevTotal); setVoted(null);
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVoteCardsQueryKey() });
        },
      }
    );
  }

  const total = totalVotes;
  const pctA = total > 0 ? Math.round((optACount / total) * 100) : 50;
  const pctB = total > 0 ? Math.round((optBCount / total) * 100) : 50;
  const showResults = voted !== null || !card.isActive;

  return (
    <div className="bg-white border border-border rounded-xl p-4" data-testid={`vote-card-${card.id}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-sm leading-snug flex-1">{card.title}</h3>
        {card.isActive ? (
          <Badge className="text-xs bg-green-100 text-green-700 border-0 shrink-0">Live</Badge>
        ) : (
          <Badge variant="secondary" className="text-xs shrink-0">Closed</Badge>
        )}
      </div>

      {/* Images */}
      {(card.imageUrl || card.imageUrl2) && (
        <div className="flex gap-2 mb-3">
          {card.imageUrl && <img src={card.imageUrl} alt={card.optionALabel} className="flex-1 h-24 object-cover rounded-lg" />}
          {card.imageUrl2 && <img src={card.imageUrl2} alt={card.optionBLabel} className="flex-1 h-24 object-cover rounded-lg" />}
        </div>
      )}

      {/* A vs B buttons */}
      <div className="flex gap-2 mb-3">
        {(["a", "b"] as const).map((choice) => {
          const label = choice === "a" ? card.optionALabel : card.optionBLabel;
          const pct = choice === "a" ? pctA : pctB;
          const isSelected = voted === choice;

          return (
            <button
              key={choice}
              disabled={voted !== null || !card.isActive}
              onClick={() => handleVote(choice)}
              className={`flex-1 relative overflow-hidden rounded-lg border py-3 text-sm font-semibold transition-all text-center ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : voted !== null || !card.isActive
                  ? "border-border bg-muted/30 text-muted-foreground"
                  : "border-border hover:border-primary hover:bg-primary/5"
              }`}
              data-testid={`vote-option-${card.id}-${choice}`}
            >
              {label}
              {showResults && (
                <div className="text-xs font-bold mt-0.5 opacity-70">{pct}%</div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Vote className="w-3.5 h-3.5" />
          {total.toLocaleString()} votes
        </span>
        {(card.commentCount ?? 0) > 0 && (
          <Link href={`/vote-cards/${card.id}`}>
            <span className="flex items-center gap-1 hover:text-primary cursor-pointer">
              <MessageSquare className="w-3.5 h-3.5" />
              {card.commentCount} comments
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}

function CreateVoteCardForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [imgA, setImgA] = useState("");
  const [imgB, setImgB] = useState("");
  const [error, setError] = useState("");
  const createVoteCard = useCreateVoteCard();
  const queryClient = useQueryClient();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Title is required."); return; }
    if (!optA.trim() || !optB.trim()) { setError("Both options are required."); return; }

    createVoteCard.mutate(
      {
        data: {
          title: title.trim(),
          optionALabel: optA.trim(),
          optionBLabel: optB.trim(),
          imageUrl: imgA.trim() || undefined,
          imageUrl2: imgB.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVoteCardsQueryKey() });
          onDone();
        },
        onError: () => setError("Failed to create vote card."),
      }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl p-4 space-y-3">
      <h3 className="font-bold text-sm">Create Vote Card</h3>
      <div className="space-y-1">
        <Label>Title / Question</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Who would you pick?" data-testid="input-vote-title" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Option A</Label>
          <Input value={optA} onChange={(e) => setOptA(e.target.value)} placeholder="Option A" data-testid="input-vote-option-a" />
          <Input value={imgA} onChange={(e) => setImgA(e.target.value)} placeholder="Image URL (optional)" className="text-xs" />
        </div>
        <div className="space-y-1">
          <Label>Option B</Label>
          <Input value={optB} onChange={(e) => setOptB(e.target.value)} placeholder="Option B" data-testid="input-vote-option-b" />
          <Input value={imgB} onChange={(e) => setImgB(e.target.value)} placeholder="Image URL (optional)" className="text-xs" />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={createVoteCard.isPending} data-testid="button-create-vote-card">
          {createVoteCard.isPending ? "Creating..." : "Create"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export default function VoteCardsPage() {
  const [showAll, setShowAll] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const { data: cards, isLoading } = useListVoteCards(showAll ? { all: true } : undefined);

  return (
    <div className="max-w-2xl mx-auto px-3 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold flex items-center gap-2">
            <Vote className="w-5 h-5 text-primary" />
            Vote Cards
          </h1>
          <p className="text-xs text-muted-foreground">Have your say on hot topics</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} data-testid="button-new-vote-card">
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>

      {showCreate && (
        <div className="mb-4">
          <CreateVoteCardForm onDone={() => setShowCreate(false)} />
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowAll(false)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${!showAll ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground border-border hover:border-primary"}`}
          data-testid="filter-active"
        >
          Live
        </button>
        <button
          onClick={() => setShowAll(true)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${showAll ? "bg-primary text-primary-foreground border-primary" : "bg-white text-muted-foreground border-border hover:border-primary"}`}
          data-testid="filter-all"
        >
          All
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : !cards?.length ? (
        <div className="text-center py-16" data-testid="vote-cards-empty">
          <Vote className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No vote cards yet.</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="vote-cards-list">
          {cards.map((card) => <VoteCardItem key={card.id} card={card} />)}
        </div>
      )}
    </div>
  );
}
