import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ShoppingBag, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface MarketplaceItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrls: string[];
  category: string;
  status: "available" | "sold";
  createdAt: string;
}

const CATEGORIES = ["All", "Electronics", "Fashion", "Home", "Food", "Beauty", "Cars", "General"];

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("All");

  useEffect(() => {
    setLoading(true);
    fetch("/api/marketplace")
      .then((r) => r.json())
      .then((d) => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = cat === "All" ? items : items.filter((i) => i.category === cat);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-2">
        <ShoppingBag className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Marketplace</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Buy quality items from verified sellers. Message admin to purchase.</p>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              cat === c ? "bg-primary text-white border-primary" : "bg-white border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingBag className="mx-auto mb-3 w-12 h-12 opacity-40" />
          <p className="text-lg">No items available{cat !== "All" ? ` in ${cat}` : ""} right now.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {filtered.map((item) => (
            <Link key={item.id} href={`/marketplace/${item.id}`}>
              <div className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                {item.imageUrls && item.imageUrls.length > 0 ? (
                  <img
                    src={item.imageUrls[0]}
                    alt={item.name}
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-44 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <ShoppingBag className="w-10 h-10 text-blue-400" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h2 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{item.name}</h2>
                    <Badge variant="secondary" className="shrink-0 text-xs flex items-center gap-1">
                      <Tag className="w-2.5 h-2.5" /> {item.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-primary">
                      ₦{(item.price / 100).toLocaleString("en-NG")}
                    </span>
                    <Button size="sm" variant="ghost" className="text-blue-700 text-xs hover:bg-blue-50">
                      View →
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
