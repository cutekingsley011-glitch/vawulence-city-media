import { useState, useEffect } from "react";
import { MediaUpload } from "@/components/MediaUpload";
import { Heart, MessageCircle, User, MapPin, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
  lookingForAge: string | null;
  preferredLocation: string | null;
  bioText: string;
  createdAt: string;
}

interface FormState {
  name: string; ageBracket: string; gender: string; state: string;
  photoUrl: string; lookingFor: string; lookingForAge: string;
  preferredLocation: string; whatsappNumber: string; bioText: string; consent: boolean;
}

const EMPTY_FORM: FormState = {
  name: "", ageBracket: "", gender: "", state: "", photoUrl: "",
  lookingFor: "", lookingForAge: "", preferredLocation: "",
  whatsappNumber: "", bioText: "", consent: false,
};

function BioText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 160;
  return (
    <div className="mb-3">
      <p className="text-xs text-muted-foreground whitespace-pre-wrap">
        {isLong && !expanded ? text.slice(0, 160) + "…" : text}
      </p>
      {isLong && (
        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-0.5 text-xs text-primary font-medium mt-1">
          {expanded ? <><ChevronUp className="w-3 h-3" /> See less</> : <><ChevronDown className="w-3 h-3" /> See more</>}
        </button>
      )}
    </div>
  );
}

export default function ConnectionsPage() {
  const [profiles, setProfiles] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "photo", string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((d) => { setProfiles(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function validate() {
    const e: Partial<Record<keyof FormState | "photo", string>> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.ageBracket) e.ageBracket = "Age bracket is required.";
    if (!form.gender) e.gender = "Gender is required.";
    if (!form.state) e.state = "State is required.";
    if (!form.lookingFor) e.lookingFor = "Looking for is required.";
    if (!form.lookingForAge) e.lookingForAge = "Preferred age range is required.";
    if (!form.preferredLocation) e.preferredLocation = "Preferred location is required.";
    if (!form.whatsappNumber.trim()) e.whatsappNumber = "WhatsApp number is required.";
    if (!form.photoUrl.trim()) e.photo = "A photo is required.";
    if (!form.bioText.trim()) e.bioText = "About you is required.";
    if (!form.consent) e.consent = "You must confirm the consent statement.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please complete all required fields.");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(), ageBracket: form.ageBracket,
          gender: form.gender, state: form.state,
          photoUrl: form.photoUrl.trim() || null, lookingFor: form.lookingFor,
          lookingForAge: form.lookingForAge || null,
          preferredLocation: form.preferredLocation || null,
          whatsappNumber: form.whatsappNumber.trim(),
          bioText: form.bioText.trim(), consentGiven: true,
        }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      setForm(EMPTY_FORM);
      setErrors({});
    } catch {
      toast.error("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function Err({ field }: { field: keyof typeof errors }) {
    return errors[field] ? <p className="text-xs text-destructive mt-0.5">{errors[field]}</p> : null;
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
                      <img src={p.photoUrl} alt={p.name} className="w-full h-auto object-contain bg-muted" />
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
                      {p.lookingForAge && (
                        <div className="text-xs text-muted-foreground mb-1">
                          Preferred age: <span className="font-medium text-foreground">{p.lookingForAge}</span>
                        </div>
                      )}
                      {p.preferredLocation && (
                        <div className="text-xs text-muted-foreground mb-2">
                          Preferred location: <span className="font-medium text-foreground">{p.preferredLocation}</span>
                        </div>
                      )}
                      <BioText text={p.bioText} />
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
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Err field="name" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Age Bracket <span className="text-destructive">*</span></Label>
                  <Select value={form.ageBracket} onValueChange={(v) => setForm({ ...form, ageBracket: v })}>
                    <SelectTrigger className={errors.ageBracket ? "border-destructive" : ""}><SelectValue placeholder="Select age range" /></SelectTrigger>
                    <SelectContent>
                      {AGE_BRACKETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Err field="ageBracket" />
                </div>
                <div className="space-y-1">
                  <Label>Gender <span className="text-destructive">*</span></Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger className={errors.gender ? "border-destructive" : ""}><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Err field="gender" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>State <span className="text-destructive">*</span></Label>
                <Select value={form.state} onValueChange={(v) => setForm({ ...form, state: v })}>
                  <SelectTrigger className={errors.state ? "border-destructive" : ""}><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {NG_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Err field="state" />
              </div>

              <div className="space-y-1">
                <Label>Looking for <span className="text-destructive">*</span></Label>
                <Select value={form.lookingFor} onValueChange={(v) => setForm({ ...form, lookingFor: v })}>
                  <SelectTrigger className={errors.lookingFor ? "border-destructive" : ""}><SelectValue placeholder="Select preference" /></SelectTrigger>
                  <SelectContent>
                    {LOOKING_FOR.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Err field="lookingFor" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Preferred Age Range <span className="text-destructive">*</span></Label>
                  <Select value={form.lookingForAge} onValueChange={(v) => setForm({ ...form, lookingForAge: v })}>
                    <SelectTrigger className={errors.lookingForAge ? "border-destructive" : ""}><SelectValue placeholder="Select range" /></SelectTrigger>
                    <SelectContent>
                      {AGE_BRACKETS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Err field="lookingForAge" />
                </div>
                <div className="space-y-1">
                  <Label>Preferred Location <span className="text-destructive">*</span></Label>
                  <Select value={form.preferredLocation} onValueChange={(v) => setForm({ ...form, preferredLocation: v })}>
                    <SelectTrigger className={errors.preferredLocation ? "border-destructive" : ""}><SelectValue placeholder="Select state" /></SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {NG_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Err field="preferredLocation" />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Your WhatsApp Number <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. 08012345678"
                  value={form.whatsappNumber}
                  onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">Never shown publicly. Admin uses it to connect interested parties.</p>
                <Err field="whatsappNumber" />
              </div>

              <div className="space-y-1">
                <Label>Your Photo <span className="text-destructive">*</span></Label>
                <MediaUpload
                  accept="image/*"
                  maxMB={10}
                  label="Upload Photo"
                  value={form.photoUrl}
                  onChange={(v) => setForm({ ...form, photoUrl: v })}
                />
                <Err field="photo" />
              </div>

              <div className="space-y-1">
                <Label>About You <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Write a short bio — hobbies, personality, what you're looking for..."
                  rows={4}
                  value={form.bioText}
                  onChange={(e) => setForm({ ...form, bioText: e.target.value })}
                />
                <Err field="bioText" />
              </div>

              <div>
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
                <Err field="consent" />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Profile for Review"}
              </Button>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
