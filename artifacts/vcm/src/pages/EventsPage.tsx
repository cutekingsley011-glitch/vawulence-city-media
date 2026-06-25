import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Calendar, MapPin, Tag, Ticket, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface Event {
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
  ticketsSold?: number;
}

export default function EventsPage() {
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/events?status=${filter}`)
      .then((r) => r.json())
      .then((data) => { setEvents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Events Hub</h1>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="mx-auto mb-3 w-12 h-12 opacity-40" />
          <p className="text-lg">No {filter === "all" ? "" : filter} events yet.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {events.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`}>
              <div className="bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                {event.imageUrl ? (
                  <img src={event.imageUrl} alt={event.title} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-200" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                    <Calendar className="w-12 h-12 text-white/60" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="font-semibold text-foreground text-base leading-snug line-clamp-2">{event.title}</h2>
                    <Badge variant={event.status === "upcoming" ? "default" : "secondary"} className="shrink-0 text-xs">
                      {event.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{new Date(event.eventDate).toLocaleDateString("en-NG", { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>

                  {event.restrictionTags && event.restrictionTags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap mb-3">
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      {event.restrictionTags.map((t) => (
                        <span key={t} className="text-xs bg-secondary px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    {event.isPaid ? (
                      <div className="flex items-center gap-1 text-sm font-medium text-blue-700">
                        <Ticket className="w-4 h-4" />
                        <span>₦{((event.ticketPrice ?? 0) / 100).toLocaleString("en-NG")}</span>
                        <span className="text-xs text-muted-foreground font-normal">+ ₦500 fee</span>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-green-600">Free Entry</span>
                    )}
                    <Button size="sm" variant="ghost" className="text-blue-700 hover:text-blue-800 hover:bg-blue-50">
                      {event.status === "upcoming" ? "Get Ticket →" : "View →"}
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
