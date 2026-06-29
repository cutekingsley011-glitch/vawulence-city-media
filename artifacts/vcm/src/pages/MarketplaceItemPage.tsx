import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, ShoppingBag, MessageCircle, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ADMIN_WA = import.meta.env.VITE_ADMIN_WA ?? "2348000000000";

interface MarketplaceItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrls: string[];
  category: string;
  status: "available" | "sold";
  howLongUsed: string | null;
  location: string | null;
  lastPrice: number | null;
  reasonForSale: string | null;
  createdAt: string;
}

export default function MarketplaceItemPage() {
  const [, params] = useRoute("/marketplace/:id");
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/marketplace/${params.id}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => { setItem(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
        <p className="text-muted-foreground">Item not found or no longer available.</p>
        <Link href="/marketplace">
          <Button variant="outline" className="mt-4">Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  const photos = item.imageUrls && item.imageUrls.length > 0 ? item.imageUrls : [];
  const ogUrl = `${window.location.origin}/api/og/market/${item.id}`;
  const waText = encodeURIComponent(`Hi, I'm interested in ${item.name} for ₦${(item.price / 100).toLocaleString("en-NG")} on VCM Marketplace`);
  const waShare = encodeURIComponent(`🛒 ${item.name} — ₦${(item.price / 100).toLocaleString("en-NG")}\n${ogUrl}`);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/marketplace">
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </button>
      </Link>

      {/* Photo carousel */}
      {photos.length > 0 ? (
        <div className="relative rounded-xl overflow-hidden mb-5 bg-muted">
          <img src={photos[photoIdx]} alt={item.name} className="w-full h-auto object-contain bg-muted" />
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
                onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === photoIdx ? "bg-white" : "bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="w-full h-72 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center mb-5">
          <ShoppingBag className="w-16 h-16 text-blue-400" />
        </div>
      )}

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            <button key={i} onClick={() => setPhotoIdx(i)} className={`shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${i === photoIdx ? "border-primary" : "border-transparent"}`}>
              <img src={url} alt="" className="w-16 h-16 object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Details */}
      <div className="space-y-4">
        <div>
          <div className="flex items-start justify-between gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{item.name}</h1>
            <Badge variant="secondary">{item.category}</Badge>
          </div>
          <p className="text-2xl font-extrabold text-primary">₦{(item.price / 100).toLocaleString("en-NG")}</p>
        </div>

        <div className="bg-muted/40 rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-2 text-foreground">Description</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.description}</p>
        </div>

        {/* Extra seller details */}
        {(item.howLongUsed || item.location || item.lastPrice || item.reasonForSale) && (
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            {item.howLongUsed && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">How Long Used</span>
                <span className="text-sm font-semibold">{item.howLongUsed}</span>
              </div>
            )}
            {item.location && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">Location</span>
                <span className="text-sm font-semibold">{item.location}</span>
              </div>
            )}
            {item.lastPrice && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">Last Price</span>
                <span className="text-sm font-semibold">₦{(item.lastPrice / 100).toLocaleString("en-NG")}</span>
              </div>
            )}
            {item.reasonForSale && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs font-medium text-muted-foreground">Reason for Sale</span>
                <span className="text-sm font-semibold text-right max-w-[60%]">{item.reasonForSale}</span>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <a
            href={`https://wa.me/${ADMIN_WA}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="contents"
          >
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white h-12 text-base">
              <MessageCircle className="w-5 h-5" />
              Buy via WhatsApp
            </Button>
          </a>
          <a
            href={`https://wa.me/?text=${waShare}`}
            target="_blank"
            rel="noopener noreferrer"
            className="contents"
          >
            <Button variant="outline" className="w-full gap-2 h-12 text-base">
              <Share2 className="w-5 h-5" />
              Share Listing
            </Button>
          </a>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          "Buy via WhatsApp" messages our admin directly to complete your purchase.
        </p>
      </div>
    </div>
  );
}
