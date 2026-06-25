import { useState, useEffect } from "react";
import { Briefcase, MapPin, CheckCircle, MessageCircle, Copy, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface JobPosting {
  id: number;
  title: string;
  companyName: string;
  description: string;
  flyerImageUrl: string | null;
  requirements: string[];
  applyMethod: "whatsapp" | "office_address";
  applyContact: string;
  status: "open" | "closed";
  createdAt: string;
}

function JobCard({ job }: { job: JobPosting }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  function copyAddress() {
    navigator.clipboard.writeText(job.applyContact).then(() => {
      toast({ title: "Address copied!", description: job.applyContact });
    });
  }

  const waText = encodeURIComponent(`Hi, I'd like to apply for the ${job.title} position at ${job.companyName} (seen on VCM)`);

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      {job.flyerImageUrl && (
        <img src={job.flyerImageUrl} alt={`${job.companyName} flyer`} className="w-full h-48 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h2 className="font-bold text-foreground text-base">{job.title}</h2>
            <p className="text-sm text-muted-foreground">{job.companyName}</p>
          </div>
          <Badge className="shrink-0 bg-green-100 text-green-700 border-green-200">Open</Badge>
        </div>

        {job.requirements && job.requirements.length > 0 && (
          <ul className="mt-3 space-y-1">
            {job.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                {req}
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => setExpanded((x) => !x)}
          className="flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Hide details" : "Show full description"}
        </button>

        {expanded && (
          <div className="mt-3 bg-muted/40 rounded-lg p-3">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{job.description}</p>
          </div>
        )}

        <div className="mt-4">
          {job.applyMethod === "whatsapp" ? (
            <a href={`https://wa.me/${job.applyContact.replace(/\D/g, "")}?text=${waText}`} target="_blank" rel="noopener noreferrer">
              <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white">
                <MessageCircle className="w-4 h-4" /> Apply via WhatsApp
              </Button>
            </a>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-3 bg-muted/40 rounded-lg">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{job.applyContact}</p>
              </div>
              <Button variant="outline" className="w-full gap-2" onClick={copyAddress}>
                <Copy className="w-4 h-4" /> Copy Address
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecruitmentPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/recruitment")
      .then((r) => r.json())
      .then((d) => { setJobs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Recruitment</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Browse open job opportunities posted on VCM.</p>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Briefcase className="mx-auto mb-3 w-12 h-12 opacity-40" />
          <p className="text-lg font-semibold mb-1">No open positions right now</p>
          <p className="text-sm">Check back soon — new opportunities are posted regularly.</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}
