import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import {
  useGetVoteCard,
  useCastVote,
  useListVoteCardComments,
  useCreateVoteCardComment,
  getGetVoteCardQueryKey,
  getListVoteCardCommentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getStoredUser } from "@/lib/user";
import { Vote, ArrowLeft, Heart, MessageCircle } from "lucide-react";

type CommentDto = {
  id: number;
  userId?: string | null;
  userName?: string | null;
  parentCommentId?: number | null;
  content: string;
  likeCount: number;
  createdAt: string;
  replies?: CommentDto[];
};

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

function getOptions(card: VoteCardDetail) {
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
  const userId = user?.id;

  // Pass userId so the server returns the authoritative userVote from the DB
  const queryParams = userId ? { userId } : undefined;
  const { data: cardRaw, isLoading: cardLoading } = useGetVoteCard(id, queryParams);
  const card = cardRaw as VoteCardDetail | undefined;
  const { data: comments, isLoading: commentsLoading } = useListVoteCardComments(id);

  const castVote = useCastVote();
  const createComment = useCreateVoteCardComment();
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");

  // The query key must stay consistent for invalidation
  const voteCardQueryKey = getGetVoteCardQueryKey(id, queryParams);

  // localStorage as fast initial hint; server is the real authority
  const LS_KEY = `vcm_voted_${id}`;
  const [voted, setVoted] = useState<number | null>(
    () => Number(localStorage.getItem(LS_KEY)) || null
  );
  // Optimistic count overrides (null = use server counts)
  const [counts, setCounts] = useState<{ [key: number]: number } | null>(null);
  const [totalOverride, setTotalOverride] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");

  // Sync voted from server — this is the fix for cross-browser / cleared-storage cases.
  // When the server confirms the user already voted (card.userVote > 0), lock the UI.
  useEffect(() => {
    if (card?.userVote != null && card.userVote > 0) {
      setVoted(card.userVote);
      localStorage.setItem(LS_KEY, String(card.userVote));
      // Server data is authoritative; drop any stale optimistic overrides
      setCounts(null);
      setTotalOverride(null);
    }
  }, [card?.userVote, LS_KEY]);

  const displayCounts: { [key: number]: number } = counts ?? {
    1: card?.option1Count ?? 0,
    2: card?.option2Count ?? 0,
    3: card?.option3Count ?? 0,
    4: card?.option4Count ?? 0,
  };
  const displayTotal = totalOverride ?? card?.totalVotes ?? 0;

  const options = card ? getOptions(card) : [];
  const showResults = voted !== null || !card?.isActive;

  function handleVote(choice: number) {
    if (voted !== null || !card?.isActive) return;
    if (!user) {
      window.dispatchEvent(new CustomEvent("vcm:open-join"));
      return;
    }

    // Optimistically lock the UI immediately
    localStorage.setItem(LS_KEY, String(choice));
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
      { id, data: { userId: user.id, chosenOption: choice } },
      {
        onSuccess: (data) => {
          // Server returns the real updated counts — use them, drop optimistic state
          const updated = data as VoteCardDetail;
          if (updated?.option1Count !== undefined) {
            setCounts({
              1: updated.option1Count,
              2: updated.option2Count,
              3: updated.option3Count ?? 0,
              4: updated.option4Count ?? 0,
            });
            setTotalOverride(updated.totalVotes);
          }
          queryClient.invalidateQueries({ queryKey: voteCardQueryKey });
        },
        onError: (err) => {
          const status = (err as { status?: number })?.status;
          if (status === 409) {
            // Server says "already voted" — the vote IS recorded in the DB.
            // Do NOT revert the UI. Re-fetch so we get the real userVote + counts.
            queryClient.invalidateQueries({ queryKey: voteCardQueryKey });
            // Keep voted locked — the useEffect above will sync userVote from refetch.
          } else {
            // Genuine error (network, 500, etc.) — revert the optimistic update
            localStorage.removeItem(LS_KEY);
            setCounts(null);
            setTotalOverride(null);
            setVoted(null);
          }
        },
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

  function handleReply(parentCommentId: number) {
    if (!replyText.trim() || !user) return;
    createComment.mutate(
      { voteCardId: id, data: { content: replyText.trim(), userId: user.id, parentCommentId } },
      {
        onSuccess: () => {
          setReplyText("");
          setReplyingTo(null);
          queryClient.invalidateQueries({ queryKey: getListVoteCardCommentsQueryKey(id) });
        },
      }
    );
  }

  async function handleLikeComment(commentId: number) {
    await fetch(`/api/comments/${commentId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorName: user?.name ?? null, actorUserId: user?.id ?? null }),
    });
    queryClient.invalidateQueries({ queryKey: getListVoteCardCommentsQueryKey(id) });
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

        {/* Vote buttons */}
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Vote className="w-3.5 h-3.5" />
            <span>{displayTotal.toLocaleString()} total votes</span>
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${card.title} — Vote now on Vawulence City Media!\n${window.location.href}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-green-700 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Share
          </a>
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
            {(comments as CommentDto[]).map((c) => (
              <div key={c.id} className="border border-border rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-foreground">{c.userName ?? "Anonymous"}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{c.content}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => handleLikeComment(c.id)}
                    data-testid={`button-like-comment-${c.id}`}
                  >
                    <Heart className="w-3 h-3" />
                    {c.likeCount}
                  </button>
                  {user && (
                    <button
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                      onClick={() => {
                        setReplyingTo(replyingTo === c.id ? null : c.id);
                        setReplyText("");
                      }}
                      data-testid={`button-reply-comment-${c.id}`}
                    >
                      <MessageCircle className="w-3 h-3" />
                      Reply
                    </button>
                  )}
                </div>

                {replyingTo === c.id && (
                  <div className="mt-2 pl-3 border-l-2 border-border">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to ${c.userName ?? "Anonymous"}...`}
                      rows={2}
                      className="mb-2 text-sm"
                      data-testid={`input-reply-${c.id}`}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={!replyText.trim() || createComment.isPending}
                        onClick={() => handleReply(c.id)}
                        data-testid={`button-submit-reply-${c.id}`}
                      >
                        {createComment.isPending ? "Posting..." : "Reply"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {!!c.replies?.length && (
                  <div className="mt-3 pl-3 border-l-2 border-border space-y-3">
                    {c.replies.map((r) => (
                      <div key={r.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-foreground">{r.userName ?? "Anonymous"}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{r.content}</p>
                        <button
                          className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => handleLikeComment(r.id)}
                          data-testid={`button-like-comment-${r.id}`}
                        >
                          <Heart className="w-3 h-3" />
                          {r.likeCount}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
