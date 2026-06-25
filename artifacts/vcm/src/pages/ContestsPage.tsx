import { useState, useEffect } from "react";
import { Trophy, Users, Calendar, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getStoredUser } from "@/lib/user";
import { openPaystackCheckout, generateReference, totalNaira, formatNaira, SERVICE_FEE } from "@/lib/paystack";

interface Contest {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  entryFee: number;
  maxEntrants: number;
  currentEntrants: number;
  spotsRemaining: number;
  options: string[] | null;
  status: "open" | "closed";
  closesAt: string;
  createdAt: string;
}

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Contest | null>(null);
  const [form, setForm] = useState({ choice: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const user = getStoredUser();

  useEffect(() => {
    fetch("/api/contests")
      .then((r) => r.json())
      .then((d) => { setContests(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function openContest(c: Contest) {
    setSelected(c);
    setForm({ choice: "" });
    setSubmitted(false);
  }

  async function handleEnter() {
    if (!selected) return;
    if (!user) { toast({ title: "Join first", description: "Create an account to enter contests", variant: "destructive" }); return; }

    const baseNaira = selected.entryFee / 100;
    const total = totalNaira(baseNaira);
    const ref = generateReference("CTST");

    setSubmitting(true);
    try {
      await openPaystackCheckout({
        email: user.email,
        amountNaira: total,
        reference: ref,
        metadata: { type: "contest_entry", contestId: selected.id, contestTitle: selected.title, userId: user.id },
        onSuccess: async (reference) => {
          const resp = await fetch(`/api/contests/${selected.id}/verify-entry-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference, userId: user.id, userName: user.name, predictionOrNomineeChoice: form.choice || null }),
          });
          const data = await resp.json();
          if (resp.ok) {
            setSubmitted(true);
            setContests((prev) => prev.map((c) => c.id === selected.id ? { ...c, currentEntrants: c.currentEntrants + 1, spotsRemaining: c.spotsRemaining - 1 } : c));
          } else {
            toast({ title: "Error", description: data.error ?? "Entry failed", variant: "destructive" });
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

  const baseNaira = selected ? selected.entryFee / 100 : 0;
  const totalVal = totalNaira(baseNaira);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="w-6 h-6 text-blue-700" />
        <h1 className="text-2xl font-bold">Contests</h1>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : contests.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="mx-auto mb-3 w-12 h-12 opacity-40" />
          <p>No active contests yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {contests.map((c) => (
            <div key={c.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
              {c.imageUrl && <img src={c.imageUrl} alt={c.title} className="w-full h-36 object-cover" />}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="font-semibold text-base leading-snug">{c.title}</h2>
                  <Badge variant={c.status === "open" ? "default" : "secondary"} className="shrink-0 text-xs">{c.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{c.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{c.currentEntrants}/{c.maxEntrants} entered</div>
                  <div className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Closes {new Date(c.closesAt).toLocaleDateString("en-NG")}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-700">{formatNaira(c.entryFee / 100)}</span>
                    <span className="text-xs text-muted-foreground ml-1">entry + ₦500 fee</span>
                  </div>
                  <Button size="sm" onClick={() => openContest(c)} disabled={c.status === "closed" || c.spotsRemaining <= 0}
                    className="bg-blue-700 hover:bg-blue-800 text-white text-xs">
                    {c.status === "closed" || c.spotsRemaining <= 0 ? "Closed" : "Enter Now"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{submitted ? "You're Entered! 🎉" : selected?.title}</DialogTitle></DialogHeader>
          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Good luck! Winners will be announced once the contest closes.</p>
              <Button className="mt-4 w-full bg-blue-700 hover:bg-blue-800" onClick={() => setSelected(null)}>Close</Button>
            </div>
          ) : selected ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{selected.description}</p>
              {selected.options && selected.options.length > 0 && (
                <div>
                  <Label>Your Pick</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {selected.options.map((opt) => (
                      <button key={opt} onClick={() => setForm({ choice: opt })}
                        className={`border rounded-lg px-3 py-2 text-sm transition-all text-left ${form.choice === opt ? "border-blue-700 bg-blue-50 font-medium" : "hover:border-blue-300"}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(!selected.options || selected.options.length === 0) && (
                <div>
                  <Label htmlFor="choice">Your prediction / answer (optional)</Label>
                  <Input id="choice" value={form.choice} onChange={(e) => setForm({ choice: e.target.value })} placeholder="Enter your answer..." />
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <div className="flex justify-between"><span>Entry fee</span><span>{formatNaira(baseNaira)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Service fee</span><span>{formatNaira(SERVICE_FEE)}</span></div>
                <div className="flex justify-between font-bold border-t mt-1 pt-1"><span>Total</span><span className="text-blue-700">{formatNaira(totalVal)}</span></div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />{selected.spotsRemaining} spot{selected.spotsRemaining !== 1 ? "s" : ""} remaining
              </div>
              <Button onClick={handleEnter} disabled={submitting} className="w-full bg-blue-700 hover:bg-blue-800 text-white">
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : `Pay ${formatNaira(totalVal)} & Enter`}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
