import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetVoteCard,
  useCastVote,
  useListVoteCardComments,
  useCreateVoteCardComment,
  useLikeComment,
  getGetVoteCardQueryKey,
  getListVoteCardCommentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getStoredUser } from "@/lib/user";
import { Vote, ArrowLeft, Heart } from "lucide-react";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type VoteCardDetail = {
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

function getOptions(card: VoteCardDetail, counts: Record<number, number>) {
  const opts: { num: number; label: string }[] = [
    { num: 1, label: card.option1Label },
    { num: 2, label: card.option2Label },
  ];
  if (card.option3Label) opts.push({ num: 3, label: card.option3Label });
  if (card.option4Label) opts.push({ num: 4, label: card.option4Label });
  return opts;
}

export default function VoteCardDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const user = getStoredUser();

  const { data: cardRaw, isLoading: cardLoading } = useGetVoteCard(id);
  const card = cardRaw as VoteCardDetail | undefined;
  const { data: comments, isLoading: commentsLoading } = useListVoteCardComments(id);

  const castVote = useCastVote();
  const createComment = useCreateVoteCardComment();
  const likeComment = useLikeComment();

  const [voted, setVoted] = useState<number | null>(null);
  const [counts, setCounts] = useState<{ [key: number]: number } | null>(null);
  const [totalOverride, setTotalOverride] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  const displayCounts: { [key: number]: number } = counts ?? {
    1: card?.option1Count ?? 0,
    2: card?.option2Count ?? 0,
    3: card?.option3Count ?? 0,
    4: card?.option4Count ?? 0,
  };
  const displayTotal = totalOverride ?? card?.totalVotes ?? 0;

  const options = card ? getOptions(card, displayCounts) : [];
  const showResults = voted !== null || !card?.isActive;

  function handleVote(choice: number) {
    if (voted !== null || !card?.isActive) return;
    const newCounts: { [key: number]: number } = {
      1: card.option1Count,
      2: card.option2Count,
      3: card.option3Count ?? 0,
      4: card.option4Count ?? 0,
    };
    newCounts[choice] = (newCounts[choice] ?? 0) + 1;
    setCounts(newCounts);
    setTotalOverride((card.totalVotes ?? 0) + 1);
    setVoted(choice);

    castVote.mutate(
      { id, data: { userId: user?.id ?? "", chosenOption: choice } },
      {
        onError: () => { setCounts(null); setTotalOverride(null); setVoted(null); },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetVoteCardQueryKey(id) }); },
      }
    );
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    createComment.mutate(
      { voteCardId: id, data: { content: commentText.trim(), userId: user.id } },
      {
        onSuccess: () => {
          setCommentText("");
          queryClient.invalidateQueries({ queryKey: getListVoteCardCommentsQueryKey(id) });
        },
      }
    );
  }

  if (cardLoading) {
    return (
      <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">
        <Skeleton className="h-8 w-32 rounded" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="max-w-2xl mx-auto px-3 py-4 text-center py-16">
        <p className="text-muted-foreground">Vote card not found.</p>
        <Link href="/vote-cards">
          <Button variant="outline" size="sm" className="mt-4">← Back</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4">
      <Link href="/vote-cards">
        <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Vote Cards
        </button>
      </Link>

      <div className="bg-white border border-border rounded-xl p-4 mb-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h2 className="font-bold text-base leading-snug flex-1">{card.title}</h2>
          {card.isActive ? (
            <Badge className="bg-green-100 text-green-700 border-0">Live</Badge>
          ) : (
            <Badge variant="secondary">Closed</Badge>
          )}
        </div>

        {/* Images */}
        {(card.imageUrl || card.imageUrl2) && (
          <div className="flex gap-2 mb-3">
            {card.imageUrl && <img src={card.imageUrl} alt={card.option1Label} className="flex-1 h-28 object-cover rounded-lg" />}
            {card.imageUrl2 && <img src={card.imageUrl2} alt={card.option2Label} className="flex-1 h-28 object-cover rounded-lg" />}
          </div>
        )}

        {/* Dynamic vote buttons */}
        <div className={`grid gap-2 mb-4 ${options.length === 2 ? "grid-cols-2" : options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {options.map(({ num, label }) => {
            const cnt = displayCounts[num] ?? 0;
            const pct = displayTotal > 0 ? Math.round((cnt / displayTotal) * 100) : Math.round(100 / options.length);
            const isSelected = voted === num;

            return (
              <button
                key={num}
                disabled={voted !== null || !card.isActive}
                onClick={() => handleVote(num)}
                className={`relative overflow-hidden rounded-lg border py-4 text-sm font-semibold transition-all text-center ${
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : voted !== null || !card.isActive
                    ? "border-border bg-muted/30 text-muted-foreground"
                    : "border-border hover:border-primary hover:bg-primary/5"
                }`}
              >
                {showResults && (
                  <div
                    className="absolute inset-0 bg-primary/8 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className="relative">{label}</span>
                {showResults && (
                  <div className="relative text-xs font-bold mt-1 opacity-80">{pct}%</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Progress bar for 2-option cards */}
        {showResults && options.length === 2 && (
          <div className="mb-3">
            <div className="flex rounded-full overflow-hidden h-2">
              {options.map(({ num }, idx) => {
                const cnt = displayCounts[num] ?? 0;
                const pct = displayTotal > 0 ? Math.round((cnt / displayTotal) * 100) : 50;
                return (
                  <div
                    key={num}
                    className={idx === 0 ? "bg-primary transition-all" : "bg-muted-foreground/30 transition-all"}
                    style={{ width: `${pct}%` }}
                  />
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Vote className="w-3.5 h-3.5" />
          <span>{displayTotal.toLocaleString()} total votes</span>
        </div>
      </div>

      {/* Comments */}
      <div>
        <h3 className="font-bold text-sm mb-3">Discussion</h3>

        {user ? (
          <form onSubmit={handleComment} className="mb-4">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={2}
              className="mb-2"
              data-testid="input-vote-comment"
            />
            <Button type="submit" size="sm" disabled={!commentText.trim() || createComment.isPending} data-testid="button-submit-vote-comment">
              {createComment.isPending ? "Posting..." : "Comment"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">Join the community to comment.</p>
        )}

        {commentsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : !comments?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">No comments yet. Start the discussion!</p>
        ) : (
          <div className="space-y-3" data-testid="vote-card-comments">
            {comments.map((c) => (
              <div key={c.id} className="border border-border rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground">{c.userName ?? "Anonymous"}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{c.content}</p>
                <button
                  className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-primary"
                  onClick={() => likeComment.mutate({ id: c.id })}
                >
                  <Heart className="w-3 h-3" />
                  {c.likeCount}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
