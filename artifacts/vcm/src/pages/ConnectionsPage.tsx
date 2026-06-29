import { useState, useEffect } from "react";
import { MediaUpload } from "@/components/MediaUpload";
import { Heart, MessageCircle, User, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const ADMIN_WA = import.meta.env.VITE_ADMIN_WA ?? "2348000000000";

const AGE_BRACKETS = ["18-20", "20-25", "25-30", "30-35"];
const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const LOOKING_FOR = ["Male", "Female", "Bi", "Gay", "Lesbian"];
const NG_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

interface Connection {
  id: number;
  name: string;
  ageBracket: string;
  gender: string | null;
  state: string;
  photoUrl: string | null;
  lookingFor: string;
  bioText: string;
  createdAt: string;
}

interface FormState {
  name: string; ageBracket: string; gender: string; state: string;
  photoUrl: string; lookingFor: string; bioText: string; consent: boolean;
}

const EMPTY_FORM: FormState = { name: "", ageBracket: "", gender: "", state: "", photoUrl: "", lookingFor: "", bioText: "", consent: false };

export default function ConnectionsPage() {
  const [profiles, setProfiles] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => { setProfiles(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.ageBracket || !form.state || !form.lookingFor || !form.bioText) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" }); return;
    }
    if (!form.consent) {
      toast({ title: "Consent required", description: "You must check the consent box to submit.", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), ageBracket: form.ageBracket,
          gender: form.gender || null, state: form.state,
          photoUrl: form.photoUrl.trim() || null, lookingFor: form.lookingFor,
          bioText: form.bioText.trim(), consentGiven: true,
        }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      setForm(EMPTY_FORM);
    } catch {
      toast({ title: "Error", description: "Submission failed. Please try again.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-2">
        <Heart className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Connections</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Find your match within the VCM community.</p>

      <Tabs defaultValue="browse">
        <TabsList className="mb-6">
          <TabsTrigger value="browse">Browse Profiles</TabsTrigger>
          <TabsTrigger value="submit">Submit Your Profile</TabsTrigger>
        </TabsList>

        {/* ── Browse tab ── */}
        <TabsContent value="browse">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="mx-auto mb-3 w-12 h-12 opacity-40" />
              <p className="text-lg font-semibold mb-1">No profiles yet</p>
              <p className="text-sm">Be the first to submit your profile!</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {profiles.map((p) => {
                const waText = encodeURIComponent(`Hi, I'd like contact info for ${p.name}'s profile on VCM Connections`);
                return (
                  <div key={p.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
                    {p.photoUrl ? (
                      <img src={p.photoUrl} alt={p.name} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center">
                        <User className="w-14 h-14 text-rose-300" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <h2 className="font-bold text-foreground">{p.name}</h2>
                        <Badge variant="outline" className="text-xs">{p.ageBracket}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {p.state}</span>
                        {p.gender && <span className="text-muted-foreground/70">· {p.gender}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Looking for: <span className="font-medium text-foreground">{p.lookingFor}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{p.bioText}</p>
                      <a href={`https://wa.me/${ADMIN_WA}?text=${waText}`} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" className="w-full gap-1.5 bg-green-600 hover:bg-green-700 text-white">
                          <MessageCircle className="w-3.5 h-3.5" /> Request Contact
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Submit tab ── */}
        <TabsContent value="submit">
          {submitted ? (
            <div className="max-w-md mx-auto text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Profile Submitted!</h2>
              <p className="text-muted-foreground text-sm">Your profile is under review. Once approved by admin, it will appear in the Connections feed.</p>
              <Button className="mt-6" onClick={() => setSubmitted(false)}>Submit Another</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Age Bracket *</Label>
                  <Select value={form.ageBracket} onValueChange={(v) => setForm({ ...form, ageBracket: v })}>
                    <SelectTrigger><SelectValue placeholder="Select age range" /></SelectTrigger>
                    <SelectContent>
                      {AGE_BRACKETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>State *</Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {NG_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Looking for *</Label>
                <Select value={form.lookingFor} onValueChange={(v) => setForm({ ...form, lookingFor: v })}>
                  <SelectTrigger><SelectValue placeholder="Select preference" /></SelectTrigger>
                  <SelectContent>
                    {LOOKING_FOR.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Your Photo <span className="text-muted-foreground">(optional)</span></Label>
                <MediaUpload
                  accept="image/*"
                  maxMB={10}
                  label="Upload Photo"
                  value={form.photoUrl}
                  onChange={(v) => setForm({ ...form, photoUrl: v })}
                />
              </div>
              <div className="space-y-1">
                <Label>About You *</Label>
                <Textarea
                  placeholder="Write a short bio — hobbies, personality, what you're looking for..."
                  rows={4}
                  value={form.bioText}
                  onChange={(e) => setForm({ ...form, bioText: e.target.value })}
                />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 accent-primary"
                  checked={form.consent}
                  onChange={(e) => setForm({ ...form, consent: e.target.checked })}
                />
                <span className="text-sm text-muted-foreground">
                  I confirm this is really me and I agree to have this shown publicly on Vawulence City Media. I understand that admin reviews all profiles before they go live.
                </span>
              </label>
              <Button type="submit" className="w-full" disabled={submitting || !form.consent}>
                {submitting ? "Submitting..." : "Submit Profile for Review"}
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
