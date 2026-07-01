import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ShoppingBag, Tag, Plus, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MediaUploadMulti } from "@/components/MediaUpload";
import { getStoredUser } from "@/lib/user";
import { toast } from "sonner";

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

const CATEGORIES = ["All", "Electronics", "Cars", "General"];
const SELL_CATEGORIES = CATEGORIES.filter((c) => c !== "All");

const EMPTY_FORM = {
  name: "", description: "", price: "", category: "General", imageUrls: [] as string[],
  howLongUsed: "", location: "", reasonForSale: "", sellerWhatsapp: "",
};

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("All");
  const [sellOpen, setSellOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/marketplace")
      .then((r) => r.json())
      .then((d) => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = cat === "All" ? items : items.filter((i) => i.category === cat);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Product name is required.";
    if (!form.price || Number(form.price) <= 0) e.price = "Enter a valid price.";
    if (!form.description.trim()) e.description = "Description is required.";
    if (!form.howLongUsed.trim()) e.howLongUsed = "How long used is required.";
    if (!form.location.trim()) e.location = "Location is required.";
    if (!form.reasonForSale.trim()) e.reasonForSale = "Reason for sale is required.";
    if (!form.sellerWhatsapp.trim()) e.sellerWhatsapp = "WhatsApp number is required.";
    if (form.imageUrls.length === 0) e.imageUrls = "At least one photo is required.";
    return e;
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please complete all required fields.");
      return;
    }
    setErrors({});
    const user = getStoredUser();
    setSubmitting(true);
    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price: Math.round(Number(form.price) * 100),
          category: form.category,
          imageUrls: form.imageUrls,
          submittedByName: user?.name ?? null,
          submittedByEmail: user?.email ?? null,
          howLongUsed: form.howLongUsed.trim(),
          location: form.location.trim(),
          lastPrice: null,
          reasonForSale: form.reasonForSale.trim(),
          sellerWhatsapp: form.sellerWhatsapp.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      setForm(EMPTY_FORM);
      setErrors({});
    } catch { toast.error("Failed to submit listing. Try again."); }
    finally { setSubmitting(false); }
  }

  function F(label: string, key: keyof typeof form, input: React.ReactNode) {
    return (
      <div className="space-y-1.5">
        <Label>{label} <span className="text-destructive">*</span></Label>
        {input}
        {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Marketplace</h1>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setSubmitted(false); setErrors({}); setSellOpen(true); }}>
          <Plus className="w-4 h-4" />
          Sell Something
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Buy quality items from the community. Tap a listing to see contact details.</p>

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
          <Button className="mt-4" size="sm" onClick={() => { setSubmitted(false); setErrors({}); setSellOpen(true); }}>Be the first to sell</Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {filtered.map((item) => (
            <Link key={item.id} href={`/marketplace/${item.id}`}>
              <div className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                {item.imageUrls && item.imageUrls.length > 0 ? (
                  <img src={item.imageUrls[0]} alt={item.name} className="w-full h-auto object-contain bg-muted" />
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
                    <span className="text-base font-bold text-primary">₦{(item.price / 100).toLocaleString("en-NG")}</span>
                    <Button size="sm" variant="ghost" className="text-blue-700 text-xs hover:bg-blue-50">View →</Button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={sellOpen} onOpenChange={(o) => { if (!o) { setSellOpen(false); setSubmitted(false); setErrors({}); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              List a Product
            </DialogTitle>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">Listing Submitted!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Your listing is under review. It will appear publicly once approved by our team.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>List Another</Button>
                <Button size="sm" onClick={() => setSellOpen(false)}>Done</Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSell} className="space-y-4">
              {F("Product Name", "name",
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. iPhone 14 Pro" />
              )}

              <div className="grid grid-cols-2 gap-3">
                {F("Price (₦)", "price",
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="e.g. 150000" />
                )}
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SELL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {F("Description", "description",
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Condition, specs, why you're selling…" rows={3} />
              )}

              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Product Details</p>
                <div className="grid grid-cols-2 gap-3">
                  {F("How Long Used", "howLongUsed",
                    <Input value={form.howLongUsed} onChange={(e) => setForm({ ...form, howLongUsed: e.target.value })} placeholder="e.g. 6 months" />
                  )}
                  {F("Location", "location",
                    <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Lagos" />
                  )}
                </div>

                {F("Reason for Sale", "reasonForSale",
                  <Input value={form.reasonForSale} onChange={(e) => setForm({ ...form, reasonForSale: e.target.value })} placeholder="e.g. Upgrading, no longer needed" />
                )}
              </div>

              {F("WhatsApp Number", "sellerWhatsapp",
                <>
                  <Input type="tel" value={form.sellerWhatsapp} onChange={(e) => setForm({ ...form, sellerWhatsapp: e.target.value })} placeholder="e.g. 08012345678" />
                  <p className="text-[11px] text-muted-foreground">Buyers contact you via WhatsApp. Not shown publicly.</p>
                </>
              )}

              <div className="space-y-1.5">
                <Label>Photos <span className="text-destructive">*</span> <span className="text-muted-foreground font-normal">(up to 5)</span></Label>
                <MediaUploadMulti maxMB={10} values={form.imageUrls} onChange={(urls) => setForm({ ...form, imageUrls: urls })} />
                {errors.imageUrls && <p className="text-xs text-destructive">{errors.imageUrls}</p>}
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                Listings are reviewed before going public. We'll contact you on WhatsApp to confirm details.
              </p>
              <Button type="submit" disabled={submitting} className="w-full gap-2">
                <Send className="w-4 h-4" />
                {submitting ? "Submitting…" : "Submit for Review"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
