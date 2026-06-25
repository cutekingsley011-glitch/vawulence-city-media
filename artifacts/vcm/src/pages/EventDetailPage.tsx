import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Calendar, MapPin, Tag, Ticket, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { getStoredUser } from "@/lib/user";
import { openPaystackCheckout, generateReference, totalNaira, formatNaira, SERVICE_FEE } from "@/lib/paystack";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EventDetail {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  venue: string;
  eventDate: string;
  restrictionTags: string[];
  isPaid: boolean;
  ticketPrice: number | null;
  status: "upcoming" | "past";
  ticketsSold: number;
}

interface IssuedTicket {
  ticketCode: string;
  createdAt: string;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [ticket, setTicket] = useState<IssuedTicket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/events/${id}`)
      .then((r) => r.json())
      .then((data) => { setEvent(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  const user = getStoredUser();

  async function handleGetTicket() {
    if (!user) {
      toast({ title: "Join first", description: "Please join VCM to get a ticket.", variant: "destructive" });
      return;
    }
    if (!event) return;

    const ref = generateReference("EVT");
    const baseNaira = (event.ticketPrice ?? 0) / 100;
    const total = totalNaira(baseNaira);

    setPaying(true);
    try {
      await openPaystackCheckout({
        email: user.email,
        amountNaira: total,
        reference: ref,
        metadata: { eventId: event.id, eventTitle: event.title, userId: user.id, userName: user.name },
        onSuccess: async (reference) => {
          const resp = await fetch(`/api/events/${event.id}/verify-ticket-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference, userId: user.id, userName: user.name, userEmail: user.email }),
          });
          const data = await resp.json();
          if (resp.ok) {
            setTicket(data.ticket);
            setShowTicketModal(true);
          } else {
            toast({ title: "Error", description: data.error ?? "Could not issue ticket", variant: "destructive" });
          }
          setPaying(false);
        },
        onClose: () => { setPaying(false); },
      });
    } catch {
      toast({ title: "Error", description: "Payment failed. Try again.", variant: "destructive" });
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="h-64 bg-muted rounded-xl animate-pulse" />
        <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
      </div>
    );
  }

  if (!event) {
    return <div className="text-center py-20 text-muted-foreground">Event not found.</div>;
  }

  const baseNaira = (event.ticketPrice ?? 0) / 100;
  const totalNairaVal = totalNaira(baseNaira);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/events">
        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Events
        </button>
      </Link>

      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} className="w-full h-56 object-cover rounded-xl mb-5" />
      ) : (
        <div className="w-full h-56 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl mb-5 flex items-center justify-center">
          <Calendar className="w-16 h-16 text-white/50" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
        <Badge variant={event.status === "upcoming" ? "default" : "secondary"}>{event.status}</Badge>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground mb-4">
        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 shrink-0" /><span>{event.venue}</span></div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 shrink-0" />
          <span>{new Date(event.eventDate).toLocaleDateString("en-NG", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        {event.restrictionTags?.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 shrink-0" />
            <div className="flex gap-1 flex-wrap">
              {event.restrictionTags.map((t) => <span key={t} className="bg-secondary px-2 py-0.5 rounded text-xs">{t}</span>)}
            </div>
          </div>
        )}
      </div>

      <p className="text-foreground/80 text-sm leading-relaxed mb-6 whitespace-pre-line">{event.description}</p>

      {event.isPaid && event.status === "upcoming" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-foreground">Ticket Price</span>
            <span className="text-xl font-bold text-blue-700">{formatNaira(baseNaira)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
            <span>Service fee</span>
            <span>{formatNaira(SERVICE_FEE)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold border-t pt-2">
            <span>Total</span>
            <span className="text-blue-700">{formatNaira(totalNairaVal)}</span>
          </div>
        </div>
      )}

      {event.status === "upcoming" && (
        event.isPaid ? (
          <Button onClick={handleGetTicket} disabled={paying} className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 text-base font-semibold">
            {paying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><Ticket className="w-4 h-4 mr-2" /> Get Ticket</>}
          </Button>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center text-green-700 font-semibold">
            <CheckCircle className="w-5 h-5 inline mr-2" />Free event — just show up!
          </div>
        )
      )}

      {/* Ticket modal */}
      <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Your Ticket 🎉</DialogTitle></DialogHeader>
          {ticket && (
            <div className="text-center space-y-4">
              <div className="bg-blue-50 rounded-xl p-6">
                <div className="text-xs text-muted-foreground mb-1">Ticket Code</div>
                <div className="text-2xl font-bold text-blue-700 tracking-widest font-mono">{ticket.ticketCode}</div>
              </div>
              <p className="text-sm text-muted-foreground">Screenshot this ticket code. You'll need it at the event entrance.</p>
              <p className="text-xs text-muted-foreground">{event.title} · {event.venue}</p>
              <Button onClick={() => setShowTicketModal(false)} className="w-full bg-blue-700 hover:bg-blue-800">Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
