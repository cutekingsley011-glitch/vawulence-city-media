import { useState, useEffect } from "react";
import { Crown, CheckCircle, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getStoredUser } from "@/lib/user";
import { openPaystackCheckout, generateReference, totalNaira, formatNaira, SERVICE_FEE } from "@/lib/paystack";

interface SubscriptionPlan { id: number; name: string; durationDays: number; price: number; }
interface SubStatus { isSubscriber: boolean; subscriptionExpiresAt: string | null; }

export default function VipPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const { toast } = useToast();
  const user = getStoredUser();

  useEffect(() => {
    Promise.all([
      fetch("/api/subscription-plans").then((r) => r.json()),
      user ? fetch(`/api/users/${user.id}/subscription-status`).then((r) => r.json()) : Promise.resolve(null),
    ]).then(([p, s]) => {
      setPlans(Array.isArray(p) ? p : []);
      setStatus(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id]);

  async function handleSubscribe(plan: SubscriptionPlan) {
    if (!user) { toast({ title: "Join first", description: "Create an account to subscribe", variant: "destructive" }); return; }
    const baseNaira = plan.price / 100;
    const total = totalNaira(baseNaira);
    const ref = generateReference("VIP");
    setPaying(true);
    try {
      await openPaystackCheckout({
        email: user.email,
        amountNaira: total,
        reference: ref,
        metadata: { type: "subscription", planId: plan.id, planName: plan.name, userId: user.id },
        onSuccess: async (reference) => {
          const resp = await fetch("/api/subscriptions/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference, userId: user.id, planId: plan.id }),
          });
          const data = await resp.json();
          if (resp.ok) {
            setStatus({ isSubscriber: data.isSubscriber, subscriptionExpiresAt: data.subscriptionExpiresAt });
            toast({ title: "You're VIP! 👑", description: "Enjoy exclusive content and perks." });
          } else {
            toast({ title: "Error", description: data.error ?? "Could not activate subscription", variant: "destructive" });
          }
          setPaying(false);
        },
        onClose: () => setPaying(false),
      });
    } catch {
      toast({ title: "Payment error", description: "Could not open payment. Try again.", variant: "destructive" });
      setPaying(false);
    }
  }

  if (loading) {
    return <div className="max-w-lg mx-auto px-4 py-16 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-700" /></div>;
  }

  const isActive = status?.isSubscriber && status?.subscriptionExpiresAt && new Date(status.subscriptionExpiresAt) > new Date();

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-blue-700 flex items-center justify-center mx-auto mb-3">
          <Crown className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-1">VCM VIP</h1>
        <p className="text-muted-foreground text-sm">Unlock exclusive gossip, early access, and premium content.</p>
      </div>

      {/* Perks */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 space-y-2">
        {["🔒 Exclusive VIP-only posts and gossip", "⚡ Early access to breaking stories", "👑 VIP badge on your profile & comments", "🎟️ Priority ticketing for events"].map((perk) => (
          <div key={perk} className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-blue-700 shrink-0" /><span>{perk}</span></div>
        ))}
      </div>

      {/* Active status */}
      {isActive && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-center">
          <Star className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
          <div className="font-semibold text-green-800">You're a VIP! 👑</div>
          <div className="text-sm text-green-700 mt-1">
            Active until {new Date(status!.subscriptionExpiresAt!).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <Badge className="mt-2 bg-blue-700">VIP Member</Badge>
        </div>
      )}

      {/* Plans */}
      <div className="space-y-3">
        {plans.map((plan) => {
          const baseNaira = plan.price / 100;
          const total = totalNaira(baseNaira);
          return (
            <div key={plan.id} className="border rounded-xl p-4 hover:border-blue-500 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-semibold">{plan.name}</div>
                  <div className="text-xs text-muted-foreground">{plan.durationDays} days access</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl text-blue-700">{formatNaira(baseNaira)}</div>
                  <div className="text-xs text-muted-foreground">+ {formatNaira(SERVICE_FEE)} fee</div>
                </div>
              </div>
              <Button onClick={() => handleSubscribe(plan)} disabled={paying}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white">
                {paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</> : isActive ? `Extend — Pay ${formatNaira(total)}` : `Subscribe — Pay ${formatNaira(total)}`}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">Subscriptions auto-stack — subscribing while active extends your current expiry.</p>
    </div>
  );
}
