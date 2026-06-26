import { useState, useEffect, useRef } from "react";
import { useListPosts, useListCategories, useGetTrending, getListPostsQueryKey } from "@workspace/api-client-react";
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
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`w-full transition-all duration-300 overflow-hidden relative ${
        compact ? "max-h-14 py-2" : "max-h-[260px] min-h-[200px] py-8"
      }`}
      style={
        compact
          ? { background: "linear-gradient(135deg, #0f1b4d 0%, #1D4ED8 60%, #2563EB 100%)" }
          : {
              backgroundImage: "url('/vcm-flyer.jpeg')",
              backgroundSize: "cover",
              backgroundPosition: "center 18%",
            }
      }
      data-testid="home-masthead"
    >
      {/* Dark overlay — only in full mode so text stays readable */}
      {!compact && (
        <div className="absolute inset-0 bg-black/55 pointer-events-none" />
      )}

      <div className="relative z-10 max-w-2xl mx-auto px-4 flex items-center justify-center">
        {compact ? (
          /* Compact strip */
          <div className="flex items-center gap-2.5">
            <img
              src={vcmLogo}
              alt=""
              className="h-7 w-7 object-contain rounded-sm shrink-0"
            />
            <span className="text-white font-extrabold text-sm tracking-[0.15em] uppercase">
              Vawulence City Media
            </span>
          </div>
        ) : (
          /* Full hero */
          <div className="text-center">
            <img
              src={vcmLogo}
              alt="VCM Logo"
              className="h-16 mx-auto object-contain mb-3 drop-shadow-lg"
              data-testid="masthead-logo"
            />
            <p
              className="text-white font-extrabold tracking-[0.18em] uppercase drop-shadow"
              style={{ fontSize: "1.1rem", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}
              data-testid="masthead-brand"
            >
              Vawulence City Media
            </p>
            <p
              className="text-white/90 text-xs tracking-[0.22em] uppercase font-medium mt-1.5"
              style={{ textShadow: "0 1px 6px rgba(0,0,0,0.65)" }}
            >
              Entertainment Without Border.
            </p>
            <div className="mt-3 h-px w-16 mx-auto bg-white/30 rounded-full" />
          </div>
        )}
      </div>
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
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const { data: categories } = useListCategories();
  const { data: posts, isLoading } = useListPosts(
    activeCategory ? { category: activeCategory } : {},
    { query: { queryKey: getListPostsQueryKey(activeCategory ? { category: activeCategory } : {}) } }
  );

  return (
    <div className="min-h-screen">
      <Masthead />

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
            {/* Category filter */}
            <div
              className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar"
              data-testid="category-filter"
              style={{ scrollbarWidth: "none" }}
            >
              <button
                onClick={() => setActiveCategory(undefined)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  !activeCategory
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-muted-foreground border-border hover:border-primary hover:text-primary"
                }`}
                data-testid="filter-all"
              >
                All
              </button>
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.name === activeCategory ? undefined : cat.name)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    activeCategory === cat.name
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-muted-foreground border-border hover:border-primary hover:text-primary"
                  }`}
                  data-testid={`filter-${cat.name.toLowerCase()}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

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
