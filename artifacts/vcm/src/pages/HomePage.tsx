import { useState, useEffect, useRef } from "react";
import { useListPosts, useGetTrending } from "@workspace/api-client-react";
import PostCard from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { TrendingUp, Flame } from "lucide-react";
import vcmLogo from "/vcm-logo.png";

function Masthead() {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 80);
    }
    // Set correct initial state based on current scroll (e.g. page refresh while scrolled)
    setCompact(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (compact) {
    return (
      <div
        className="w-full py-2 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #0f1b4d 0%, #1D4ED8 60%, #2563EB 100%)" }}
        data-testid="home-masthead"
      >
        <div className="flex items-center gap-2.5">
          <img src={vcmLogo} alt="" className="h-7 w-7 object-contain rounded-sm shrink-0" />
          <span className="text-white font-extrabold text-sm tracking-[0.15em] uppercase">
            Vawulence City Media
          </span>
        </div>
      </div>
    );
  }

  return (
    // aspect-square reserves space before the image loads → prevents layout-shift white flash
    <div className="w-full aspect-square bg-black" data-testid="home-masthead">
      <img
        src="/vcm-flyer.jpeg"
        alt="Vawulence City Media"
        className="w-full h-full object-cover block"
      />
    </div>
  );
}

function TrendingFeed() {
  const { data: trending, isLoading } = useGetTrending();

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="trending-loading">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 border border-border rounded-lg">
            <Skeleton className="w-24 h-20 rounded-md shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-3 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!trending?.length) {
    return (
      <div className="text-center py-16" data-testid="trending-empty">
        <TrendingUp className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No trending content yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="trending-feed">
      {trending.map((item, idx) => (
        <Link key={`${item.type}-${item.id}`} href={item.type === "post" ? `/post/${item.id}` : `/vote-cards/${item.id}`}>
          <div className="flex gap-3 p-3 border border-border rounded-xl bg-white hover:border-primary/30 transition-colors cursor-pointer">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
              <span className="text-sm font-extrabold text-primary">#{idx + 1}</span>
            </div>
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.title} className="w-16 h-14 rounded-md object-cover shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.type === "vote_card" ? "bg-purple-100 text-purple-700" : "bg-primary/10 text-primary"
                }`}>
                  {item.type === "vote_card" ? "Vote Card" : item.category ?? "Post"}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">{item.title}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" />
                  {item.engagementScore.toLocaleString()} engagement
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"feed" | "trending">("feed");
  const { data: posts, isLoading } = useListPosts({});

  return (
    <div className="min-h-screen">
      <Masthead />

      {/* WhatsApp floating button — fixed above bottom nav */}
      <a
        href="https://wa.me/2348030430681"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
        style={{
          bottom: "calc(56px + env(safe-area-inset-bottom) + 12px)",
          background: "#25D366",
        }}
      >
        {/* WhatsApp SVG icon */}
        <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.003 2.667C8.639 2.667 2.667 8.638 2.667 16c0 2.364.627 4.674 1.817 6.694L2.667 29.333l6.823-1.789A13.27 13.27 0 0 0 16.003 29.333C23.365 29.333 29.333 23.362 29.333 16S23.365 2.667 16.003 2.667zm0 2.4c5.94 0 10.93 4.99 10.93 10.933 0 5.94-4.99 10.933-10.93 10.933a10.896 10.896 0 0 1-5.564-1.524l-.398-.237-4.05 1.062 1.08-3.937-.26-.41A10.892 10.892 0 0 1 5.07 16c0-5.944 4.99-10.933 10.933-10.933zm-3.04 5.6c-.19-.002-.392.003-.58.008-.215.006-.564.08-.86.4-.298.32-1.137 1.11-1.137 2.706 0 1.597 1.162 3.139 1.323 3.355.163.216 2.254 3.588 5.548 4.888.775.307 1.38.49 1.851.627.777.227 1.485.195 2.044.118.623-.086 1.92-.785 2.19-1.543.272-.757.272-1.406.19-1.542-.08-.136-.297-.216-.621-.378-.324-.162-1.917-.946-2.214-1.054-.298-.108-.514-.162-.73.162-.216.324-.838 1.054-1.027 1.27-.19.216-.378.243-.702.081-.324-.162-1.367-.504-2.604-1.607-.963-.859-1.613-1.918-1.803-2.242-.188-.324-.02-.5.142-.661.146-.146.324-.378.487-.567.162-.189.216-.324.324-.54.108-.216.054-.405-.027-.567-.08-.162-.73-1.76-1.003-2.408-.243-.577-.49-.575-.68-.583z"/>
        </svg>
      </a>

      <div className="max-w-2xl mx-auto px-3 py-4">
        {/* Feed / Trending toggle */}
        <div className="flex gap-1 mb-4 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setActiveTab("feed")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "feed" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-feed"
          >
            Feed
          </button>
          <button
            onClick={() => setActiveTab("trending")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "trending" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-trending"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Trending
          </button>
        </div>

        {activeTab === "trending" ? (
          <TrendingFeed />
        ) : (
          <>
            {isLoading ? (
              <div className="space-y-3" data-testid="posts-loading">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 border border-border rounded-lg">
                    <Skeleton className="w-24 h-20 rounded-md shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-28 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !posts || posts.length === 0 ? (
              <div className="text-center py-16" data-testid="posts-empty">
                <p className="text-muted-foreground text-sm">No posts yet in this category.</p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="posts-feed">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
