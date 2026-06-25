import { useState, useEffect } from "react";
import { Megaphone, Upload, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { openPaystackCheckout, generateReference, totalNaira, formatNaira, SERVICE_FEE } from "@/lib/paystack";
import { getStoredUser } from "@/lib/user";

interface AdSetting { id: number; tier: string; price: number; }

const TIER_LABELS: Record<string, string> = {
  "1week": "1 Week",
  "2weeks": "2 Weeks",
  "1month": "1 Month",
  "2months": "2 Months",
};

export default function AdsPage() {
  const [settings, setSettings] = useState<AdSetting[]>([]);
  const [form, setForm] = useState({ advertiserName: "", contactInfo: "", imageUrl: "", linkUrl: "", durationTier: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const user = getStoredUser();

  useEffect(() => {
    fetch("/api/ad-settings")
      .then((r) => r.json())
      .then((d) => setSettings(Array.isArray(d) ? d : []));
  }, []);

  const selectedTier = settings.find((s) => s.tier === form.durationTier);
  const baseNaira = selectedTier ? selectedTier.price / 100 : 0;
  const totalVal = totalNaira(baseNaira);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.advertiserName || !form.contactInfo || !form.imageUrl || !form.durationTier) {
      toast({ title: "Fill all required fields", variant: "destructive" }); return;
    }
    if (!selectedTier) { toast({ title: "Select a duration", variant: "destructive" }); return; }

    const email = user?.email ?? prompt("Enter your email for payment receipt:") ?? "";
    if (!email) return;

    const ref = generateReference("AD");
    setSubmitting(true);
    try {
      await openPaystackCheckout({
        email,
        amountNaira: totalVal,
        reference: ref,
        metadata: { type: "ad", advertiserName: form.advertiserName, tier: form.durationTier },
        onSuccess: async (reference) => {
          const resp = await fetch("/api/ads/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference,
              advertiserName: form.advertiserName,
              contactInfo: form.contactInfo,
              imageUrl: form.imageUrl,
              linkUrl: form.linkUrl || null,
              durationTier: form.durationTier,
              userId: user?.id ?? "anon",
              userName: user?.name ?? form.advertiserName,
            }),
          });
          const data = await resp.json();
          if (resp.ok) {
            setDone(true);
          } else {
            toast({ title: "Error", description: data.error ?? "Submission failed", variant: "destructive" });
          }
          setSubmitting(false);
        },
        onClose: () => setSubmitting(false),
      });
    } catch {
      toast({ title: "Payment error", description: "Could not open payment. Try again.", variant: "destructive" });
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Ad Submitted!</h2>
        <p className="text-muted-foreground text-sm">Your ad is under review. Once approved, it will go live on VCM. You'll be notified via the contact info you provided.</p>
        <Button className="mt-6 bg-blue-700 hover:bg-blue-800" onClick={() => { setDone(false); setForm({ advertiserName: "", contactInfo: "", imageUrl: "", linkUrl: "", durationTier: "" }); }}>
          Submit Another Ad
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-2">
        <Megaphone className="w-6 h-6 text-blue-700" />
        <h1 className="text-2xl font-bold">Advertise on VCM</h1>
      </div>
      <p className="text-muted-foreground text-sm mb-6">Reach thousands of Nigerian entertainment fans. Your ad will appear in the homepage rotating banner.</p>

      {/* Pricing */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {settings.map((s) => (
          <div key={s.id} className={`border rounded-lg p-3 text-center cursor-pointer transition-all ${form.durationTier === s.tier ? "border-blue-700 bg-blue-50" : "hover:border-blue-300"}`}
            onClick={() => setForm((f) => ({ ...f, durationTier: s.tier }))}>
            <div className="text-xs text-muted-foreground mb-1">{TIER_LABELS[s.tier] ?? s.tier}</div>
            <div className="font-bold text-blue-700">{formatNaira(s.price / 100)}</div>
            <div className="text-xs text-muted-foreground">+ ₦500 fee</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="advertiserName">Advertiser / Brand Name *</Label>
          <Input id="advertiserName" value={form.advertiserName} onChange={(e) => setForm((f) => ({ ...f, advertiserName: e.target.value }))} placeholder="e.g. Chike's Superstore" />
        </div>
        <div>
          <Label htmlFor="contactInfo">Contact Info (WhatsApp / Email) *</Label>
          <Input id="contactInfo" value={form.contactInfo} onChange={(e) => setForm((f) => ({ ...f, contactInfo: e.target.value }))} placeholder="e.g. 08012345678 or you@email.com" />
        </div>
        <div>
          <Label htmlFor="imageUrl">Ad Image URL *</Label>
          <Input id="imageUrl" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
          {form.imageUrl && <img src={form.imageUrl} alt="Preview" className="mt-2 rounded-lg h-24 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
        </div>
        <div>
          <Label htmlFor="linkUrl">Landing Page URL (optional)</Label>
          <Input id="linkUrl" value={form.linkUrl} onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))} placeholder="https://..." />
        </div>
        <div>
          <Label>Duration *</Label>
          <Select value={form.durationTier} onValueChange={(v) => setForm((f) => ({ ...f, durationTier: v }))}>
            <SelectTrigger><SelectValue placeholder="Choose duration" /></SelectTrigger>
            <SelectContent>
              {settings.map((s) => (
                <SelectItem key={s.tier} value={s.tier}>{TIER_LABELS[s.tier] ?? s.tier} — {formatNaira(s.price / 100)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedTier && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
            <div className="flex justify-between"><span>Base price</span><span>{formatNaira(baseNaira)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Service fee</span><span>{formatNaira(SERVICE_FEE)}</span></div>
            <div className="flex justify-between font-bold border-t mt-1 pt-1"><span>Total</span><span className="text-blue-700">{formatNaira(totalVal)}</span></div>
          </div>
        )}

        <Button type="submit" disabled={submitting || !form.durationTier} className="w-full bg-blue-700 hover:bg-blue-800 text-white">
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : <><Upload className="w-4 h-4 mr-2" />Pay & Submit Ad</>}
        </Button>
      </form>
    </div>
  );
}
