import { useState } from "react";
import { useListPosts, useListCategories, getListPostsQueryKey } from "@workspace/api-client-react";
import PostCard from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);
  const { data: categories } = useListCategories();
  const { data: posts, isLoading } = useListPosts(
    activeCategory ? { category: activeCategory } : {},
    { query: { queryKey: getListPostsQueryKey(activeCategory ? { category: activeCategory } : {}) } }
  );

  return (
    <div className="max-w-2xl mx-auto px-3 py-4">
      {/* Category filter tabs */}
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

      {/* Posts feed */}
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
    </div>
  );
}
