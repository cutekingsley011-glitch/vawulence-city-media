import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetPost,
  useGetReactions,
  useListComments,
  useAddReaction,
  useCreateComment,
  useLikeComment,
  getGetPostQueryKey,
  getGetReactionsQueryKey,
  getListCommentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getStoredUser } from "@/lib/user";
import { ArrowLeft, ThumbsUp, Laugh, Frown, Zap, MessageCircle, Heart, Share2 } from "lucide-react";

const FALLBACK = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format";

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=0&rel=0`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=0&rel=0`;
    }
    if (u.hostname.includes("youtube.com") && u.pathname.includes("/embed/")) {
      return url;
    }
  } catch { /* noop */ }
  return null;
}

function VideoEmbed({ url }: { url: string }) {
  const embedUrl = getYouTubeEmbedUrl(url);
  if (embedUrl) {
    return (
      <div className="rounded-xl overflow-hidden mb-4 bg-black aspect-video">
        <iframe
          src={embedUrl}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }
  // Cloudinary or direct video URL
  return (
    <div className="rounded-xl overflow-hidden mb-4 bg-black aspect-video">
      <video
        src={url}
        controls
        autoPlay
        muted
        playsInline
        className="w-full h-full object-contain"
        data-testid="video-post"
      />
    </div>
  );
}

const REACTIONS = [
  { type: "like" as const, label: "Like", icon: ThumbsUp, color: "text-blue-600" },
  { type: "laugh" as const, label: "Laugh", icon: Laugh, color: "text-yellow-500" },
  { type: "shock" as const, label: "Shock", icon: Zap, color: "text-orange-500" },
  { type: "angry" as const, label: "Angry", icon: Frown, color: "text-red-600" },
];

interface CommentDto {
  id: number;
  postId: number;
  userId?: string | null;
  userName?: string | null;
  parentCommentId?: number | null;
  content: string;
  likeCount: number;
  createdAt: string;
  replies?: CommentDto[];
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

function CommentItem({
  comment,
  postId,
  onReply,
}: {
  comment: CommentDto;
  postId: number;
  onReply: (parentId: number) => void;
}) {
  const queryClient = useQueryClient();
  const likeComment = useLikeComment();

  function handleLike() {
    likeComment.mutate(
      { id: comment.id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) }) }
    );
  }

  return (
    <div className="py-3 border-b border-border last:border-0" data-testid={`comment-${comment.id}`}>
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-primary">
            {(comment.userName ?? "A")[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {comment.userName ?? "Anonymous"}
            </span>
            <span className="text-xs text-muted-foreground">{formatRelative(comment.createdAt)}</span>
          </div>
          <p className="text-sm text-foreground mt-1 leading-relaxed">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={handleLike}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              data-testid={`button-like-comment-${comment.id}`}
            >
              <Heart className="w-3 h-3" />
              <span>{comment.likeCount}</span>
            </button>
            <button
              onClick={() => onReply(comment.id)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
              data-testid={`button-reply-${comment.id}`}
            >
              Reply
            </button>
          </div>
          {comment.replies && comment.replies.length > 0 && (
            <div className="ml-3 mt-2 pl-3 border-l-2 border-border space-y-2">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="py-1" data-testid={`reply-${reply.id}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{reply.userName ?? "Anonymous"}</span>
                    <span className="text-xs text-muted-foreground">{formatRelative(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm mt-0.5">{reply.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: post, isLoading } = useGetPost(postId, {
    query: { enabled: !!postId, queryKey: getGetPostQueryKey(postId) },
  });
  const { data: reactions } = useGetReactions(postId, {
    query: { enabled: !!postId, queryKey: getGetReactionsQueryKey(postId) },
  });
  const { data: comments, isLoading: commentsLoading } = useListComments(postId, {
    query: { enabled: !!postId, queryKey: getListCommentsQueryKey(postId) },
  });

  const addReaction = useAddReaction();
  const createComment = useCreateComment();

  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const user = getStoredUser();

  function handleReaction(type: "like" | "laugh" | "shock" | "angry") {
    if (!user) return;
    addReaction.mutate(
      { postId, data: { type, userId: user.id } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetReactionsQueryKey(postId) }) }
    );
  }

  function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    createComment.mutate(
      {
        postId,
        data: {
          content: commentText.trim(),
          userId: user.id,
          parentCommentId: replyingTo ?? undefined,
        },
      },
      {
        onSuccess: () => {
          setCommentText("");
          setReplyingTo(null);
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
        },
      }
    );
  }

  function handleShare() {
    const ogUrl = `${window.location.origin}/api/og/post/${postId}`;
    const shareText = encodeURIComponent(`${post?.title ?? ""} 🔥\n${ogUrl}`);
    window.open(`https://wa.me/?text=${shareText}`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-3 py-4 space-y-4" data-testid="post-loading">
        <Skeleton className="h-6 w-24 rounded" />
        <Skeleton className="h-8 w-full rounded" />
        <Skeleton className="h-56 w-full rounded-lg" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto px-3 py-16 text-center" data-testid="post-not-found">
        <p className="text-muted-foreground">Post not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/")}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4" data-testid="post-page">
      {/* Back button */}
      <button
        onClick={() => setLocation("/")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Category & date */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full capitalize">
          {post.category}
        </span>
        {post.isBreaking && (
          <span className="text-xs font-semibold bg-red-600 text-white px-3 py-1 rounded-full">
            Breaking
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {new Date(post.createdAt).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      </div>

      {/* Title */}
      <h1 className="text-xl md:text-2xl font-extrabold text-foreground leading-tight mb-3" data-testid="text-post-title">
        {post.title}
      </h1>

      {/* Video or Image */}
      {(post as { videoUrl?: string | null }).videoUrl ? (
        <VideoEmbed url={(post as { videoUrl?: string | null }).videoUrl!} />
      ) : (
        <div className="rounded-xl overflow-hidden mb-4 bg-muted aspect-video">
          <img
            src={post.imageUrl ?? FALLBACK}
            alt={post.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK; }}
            data-testid="img-post"
          />
        </div>
      )}

      {/* Content */}
      <div
        className="prose prose-sm max-w-none text-foreground leading-relaxed mb-6"
        data-testid="text-post-content"
        dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, "<br/>") }}
      />

      {/* Reactions */}
      <div className="border border-border rounded-xl p-4 mb-6 bg-card" data-testid="reactions-section">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          React to this story
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {REACTIONS.map(({ type, label, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-white hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium"
              data-testid={`button-reaction-${type}`}
            >
              <Icon className={`w-4 h-4 ${color}`} />
              <span>{label}</span>
              <span className="text-muted-foreground text-xs ml-0.5">
                {reactions?.[type] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp share */}
      <Button
        onClick={handleShare}
        variant="outline"
        className="w-full mb-6 border-green-500 text-green-700 hover:bg-green-50"
        data-testid="button-whatsapp-share"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share to WhatsApp
      </Button>

      {/* Comments */}
      <div data-testid="comments-section">
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          Comments ({comments?.length ?? 0})
        </h2>

        {/* Comment form */}
        {user ? (
          <form onSubmit={handleComment} className="mb-4" data-testid="comment-form">
            {replyingTo && (
              <div className="text-xs text-primary mb-1 flex items-center gap-1">
                Replying to comment
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="underline hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="mb-2"
              data-testid="input-comment"
            />
            <Button
              type="submit"
              size="sm"
              disabled={createComment.isPending || !commentText.trim()}
              data-testid="button-submit-comment"
            >
              {createComment.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted/40 rounded-lg">
            Join the conversation to leave a comment.
          </p>
        )}

        {/* Comments list */}
        {commentsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2 py-3">
                <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : !comments || comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No comments yet. Be the first to react.
          </p>
        ) : (
          <div data-testid="comments-list">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment as CommentDto}
                postId={postId}
                onReply={setReplyingTo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
