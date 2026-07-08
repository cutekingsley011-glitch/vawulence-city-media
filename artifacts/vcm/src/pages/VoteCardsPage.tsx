import { useState, useRef, useEffect } from "react";
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
import { Vote, Plus, MessageSquare, Minus, ImagePlus, Loader2 } from "lucide-react";

type VoteCard = {
  id: number;
  title: string;
  option1Label: string;
  option2Label: string;
  option3Label?: string | null;
  option4Label?: string | null;
  option1Count: number;
  option2Count: number;
  option3Count?: number | null;
  option4Count?: number | null;
  isActive: boolean;
  totalVotes: number;
  createdAt: string;
  commentCount?: number;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  userVote?: number | null;
};

function getOptions(card: VoteCard) {
  const opts: { num: number; label: string; count: number }[] = [
    { num: 1, label: card.option1Label, count: card.option1Count },
    { num: 2, label: card.option2Label, count: card.option2Count },
  ];
  if (card.option3Label) opts.push({ num: 3, label: card.option3Label, count: card.option3Count ?? 0 });
  if (card.option4Label) opts.push({ num: 4, label: card.option4Label, count: card.option4Count ?? 0 });
  return opts;
}

function VoteCardItem({ card }: { card: VoteCard }) {
  const castVote = useCastVote();
  const queryClient = useQueryClient();
  const user = getStoredUser();
  const [voted, setVoted] = useState<number | null>(card.userVote ?? null);
  const [counts, setCounts] = useState<Record<number, number>>({
    1: card.option1Count,
    2: card.option2Count,
    3: card.option3Count ?? 0,
    4: card.option4Count ?? 0,
  });
  const [total, setTotal] = useState(card.totalVotes);

  // Server is authoritative — resync whenever the underlying card data refreshes
  // (e.g. after invalidation on refresh/refetch), so a vote never appears to "reset".
  useEffect(() => {
    setCounts({
      1: card.option1Count,
      2: card.option2Count,
      3: card.option3Count ?? 0,
      4: card.option4Count ?? 0,
    });
    setTotal(card.totalVotes);
    if (card.userVote != null && card.userVote > 0) {
      setVoted(card.userVote);
    }
  }, [card.userVote, card.option1Count, card.option2Count, card.option3Count, card.option4Count, card.totalVotes]);

  const options = getOptions(card);

  function handleVote(choice: number) {
    if (voted !== null || !card.isActive) return;
    const prevCounts = { ...counts };
    const prevTotal = total;
    setCounts((c) => ({ ...c, [choice]: (c[choice] ?? 0) + 1 }));
    setTotal((v) => v + 1);
    setVoted(choice);

    castVote.mutate(
      { id: card.id, data: { userId: user?.id ?? "", chosenOption: choice } },
      {
        onError: (err) => {
          const status = (err as { status?: number })?.status;
          if (status === 409) {
            // Already voted server-side — don't unlock the UI, just resync from the server.
            queryClient.invalidateQueries({ queryKey: getListVoteCardsQueryKey() });
            return;
          }
          setCounts(prevCounts);
          setTotal(prevTotal);
          setVoted(null);
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVoteCardsQueryKey() });
        },
      }
    );
  }

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

      {/* Images for option 1 & 2 */}
      {(card.imageUrl || card.imageUrl2) && (
        <div className="flex gap-2 mb-3">
          {card.imageUrl && <img src={card.imageUrl} alt={card.option1Label} className="flex-1 h-24 object-cover rounded-lg" />}
          {card.imageUrl2 && <img src={card.imageUrl2} alt={card.option2Label} className="flex-1 h-24 object-cover rounded-lg" />}
        </div>
      )}

      {/* Dynamic option buttons */}
      <div className={`grid gap-2 mb-3 ${options.length === 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {options.map(({ num, label, count }) => {
          const pct = total > 0 ? Math.round((counts[num] / total) * 100) : Math.round(100 / options.length);
          const isSelected = voted === num;

          return (
            <button
              key={num}
              disabled={voted !== null || !card.isActive}
              onClick={() => handleVote(num)}
              className={`relative overflow-hidden rounded-lg border py-3 text-sm font-semibold transition-all text-center ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : voted !== null || !card.isActive
                  ? "border-border bg-muted/30 text-muted-foreground"
                  : "border-border hover:border-primary hover:bg-primary/5"
              }`}
              data-testid={`vote-option-${card.id}-${num}`}
            >
              {showResults && (
                <div
                  className="absolute inset-0 bg-primary/8 transition-all"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative">{label}</span>
              {showResults && (
                <div className="relative text-xs font-bold mt-0.5 opacity-70">{pct}%</div>
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
        <Link href={`/vote-cards/${card.id}`}>
          <span className="flex items-center gap-1 hover:text-primary cursor-pointer">
            <MessageSquare className="w-3.5 h-3.5" />
            {(card.commentCount ?? 0) > 0 ? `${card.commentCount} comments` : "Drop a comment"}
          </span>
        </Link>
      </div>
    </div>
  );
}

const OPTION_LABELS = ["Option 1", "Option 2", "Option 3", "Option 4"];

function ImageUploadSlot({
  idx,
  preview,
  uploading,
  onFile,
}: {
  idx: number;
  preview: string;
  uploading: boolean;
  onFile: (idx: number, file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex-shrink-0">
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(idx, f); }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        title="Add photo (optional)"
        className={`w-11 h-11 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors overflow-hidden ${
          preview ? "border-primary/40" : "border-border hover:border-primary/60 bg-muted/20"
        }`}
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        ) : preview ? (
          <img src={preview} alt={`Option ${idx + 1}`} className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

function CreateVoteCardForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [opts, setOpts] = useState(["", "", "", ""]);
  const [imgUrls, setImgUrls] = useState(["", "", "", ""]);
  const [previews, setPreviews] = useState(["", "", "", ""]);
  const [uploading, setUploading] = useState([false, false, false, false]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const createVoteCard = useCreateVoteCard();
  const queryClient = useQueryClient();

  function setOpt(idx: number, val: string) {
    setOpts((prev) => { const next = [...prev]; next[idx] = val; return next; });
  }

  async function handleFile(idx: number, file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError(`Photo ${idx + 1} is too large — maximum size is 5 MB.`);
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setPreviews((p) => { const n = [...p]; n[idx] = localUrl; return n; });
    setUploading((u) => { const n = [...u]; n[idx] = true; return n; });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/storage/uploads", { method: "POST", body: form });
      const data = await res.json() as { objectPath?: string };
      if (!data.objectPath) throw new Error("no url");
      setImgUrls((u) => { const n = [...u]; n[idx] = data.objectPath!; return n; });
    } catch {
      setError(`Failed to upload photo ${idx + 1}. Try again.`);
      setPreviews((p) => { const n = [...p]; n[idx] = ""; return n; });
    } finally {
      setUploading((u) => { const n = [...u]; n[idx] = false; return n; });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) { setError("Title is required."); return; }
    for (let i = 0; i < 4; i++) {
      if (!opts[i].trim()) { setError(`Option ${i + 1} label is required.`); return; }
    }
    if (uploading.some(Boolean)) { setError("Please wait for all photos to finish uploading."); return; }

    createVoteCard.mutate(
      {
        data: {
          title: title.trim(),
          option1Label: opts[0].trim(),
          option2Label: opts[1].trim(),
          option3Label: opts[2].trim(),
          option4Label: opts[3].trim(),
          imageUrl: imgUrls[0] || undefined,
          imageUrl2: imgUrls[1] || undefined,
          imageUrl3: imgUrls[2] || undefined,
          imageUrl4: imgUrls[3] || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVoteCardsQueryKey() });
          setSubmitted(true);
        },
        onError: () => setError("Failed to submit vote card. Please try again."),
      }
    );
  }

  if (submitted) {
    return (
      <div className="bg-white border border-border rounded-xl p-6 text-center space-y-3">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-green-600 text-xl font-bold">✓</span>
        </div>
        <p className="font-semibold text-foreground">Vote card submitted for review!</p>
        <p className="text-sm text-muted-foreground">
          Our team will review and publish it once approved.
        </p>
        <Button size="sm" onClick={onDone}>Done</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border rounded-xl p-4 space-y-4">
      <h3 className="font-bold text-sm">Create Vote Card</h3>

      <div className="space-y-1">
        <Label>Title / Question</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Who would you pick?" data-testid="input-vote-title" />
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-3">4 options required · tap the icon to add a photo (optional, max 5 MB)</p>
        <div className="space-y-2">
          {[0, 1, 2, 3].map((idx) => (
            <div key={idx} className="flex items-center gap-2">
              <ImageUploadSlot
                idx={idx}
                preview={previews[idx]}
                uploading={uploading[idx]}
                onFile={handleFile}
              />
              <Input
                value={opts[idx]}
                onChange={(e) => setOpt(idx, e.target.value)}
                placeholder={OPTION_LABELS[idx]}
                data-testid={`input-vote-option-${idx + 1}`}
                className="flex-1 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={createVoteCard.isPending || uploading.some(Boolean)} data-testid="button-create-vote-card">
          {createVoteCard.isPending ? "Submitting..." : "Submit for Review"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}

export default function VoteCardsPage() {
  const [showAll, setShowAll] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const user = getStoredUser();
  const { data: cards, isLoading } = useListVoteCards({
    ...(showAll ? { all: true } : {}),
    ...(user?.id ? { userId: user.id } : {}),
  });

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
        {user && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)} data-testid="button-new-vote-card">
            {showCreate ? <Minus className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
            {showCreate ? "Cancel" : "New"}
          </Button>
        )}
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
          {(cards as VoteCard[]).map((card) => <VoteCardItem key={card.id} card={card} />)}
        </div>
      )}
    </div>
  );
}
