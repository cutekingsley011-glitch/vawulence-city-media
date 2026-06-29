import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, ThumbsUp, PlayCircle } from "lucide-react";

interface Post {
  id: number;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  category?: string | null;
  isBreaking: boolean;
  createdAt: string;
  reactionCount: number;
  commentCount: number;
}

interface Props {
  post: Post;
}

const FALLBACK =
  "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format";

export default function PostCard({ post }: Props) {
  const date = new Date(post.createdAt);
  const relative = formatRelative(date);

  return (
    <Link href={`/post/${post.id}`}>
      <article
        className="flex gap-3 p-3 bg-card border border-border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
        data-testid={`card-post-${post.id}`}
      >
        <div className="shrink-0 w-24 h-20 md:w-32 md:h-24 rounded-md overflow-hidden bg-muted relative">
          <img
            src={post.imageUrl ?? FALLBACK}
            alt={post.title}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = FALLBACK;
            }}
          />
          {post.videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <PlayCircle className="w-8 h-8 text-white drop-shadow" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {post.category && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-0 capitalize"
                  data-testid={`badge-category-${post.id}`}
                >
                  {post.category}
                </Badge>
              )}
              {post.isBreaking && (
                <Badge className="text-xs px-2 py-0.5 bg-red-600 text-white border-0">
                  Breaking
                </Badge>
              )}
            </div>
            <h3
              className="text-sm font-semibold text-foreground leading-snug line-clamp-2"
              data-testid={`text-title-${post.id}`}
            >
              {post.title}
            </h3>
            {post.excerpt && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 hidden md:block">
                {post.excerpt}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span data-testid={`text-date-${post.id}`}>{relative}</span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              <span data-testid={`text-reactions-${post.id}`}>{post.reactionCount}</span>
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              <span data-testid={`text-comments-${post.id}`}>{post.commentCount}</span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}
