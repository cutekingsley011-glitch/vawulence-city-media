import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Megaphone } from "lucide-react";

interface LiveAd { id: number; imageUrl: string; linkUrl: string | null; advertiserName: string; }

export default function AdsBanner() {
  const [ads, setAds] = useState<LiveAd[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/ads/live")
      .then((r) => r.json())
      .then((d) => setAds(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [ads.length]);

  if (ads.length === 0) {
    // Placeholder promoting the ads page
    return (
      <Link href="/advertise">
        <div className="mx-4 mb-4 rounded-xl overflow-hidden border border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center shrink-0">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-blue-800 text-sm">Advertise on VCM</div>
              <div className="text-xs text-blue-600">Reach thousands of Nigerian entertainment fans. Click to place your ad.</div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  const ad = ads[current];
  const content = (
    <div className="mx-4 mb-4 rounded-xl overflow-hidden shadow-sm border border-border relative">
      <img src={ad.imageUrl} alt={ad.advertiserName} className="w-full h-32 sm:h-40 object-cover" />
      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">Ad</div>
      {ads.length > 1 && (
        <div className="absolute bottom-2 left-2 flex gap-1">
          {ads.map((_, i) => (
            <button key={i} onClick={(e) => { e.preventDefault(); setCurrent(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? "bg-white" : "bg-white/40"}`} />
          ))}
        </div>
      )}
    </div>
  );

  if (ad.linkUrl) {
    return <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
}
