import { useState, useEffect } from "react";
import { Flag, ImageIcon, Send, ChevronDown, ChevronUp, ThumbsUp, MessageSquare, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaUploadMulti } from "@/components/MediaUpload";
import { getStoredUser } from "@/lib/user";
import { toast } from "sonner";

interface ReportCase {
  id: number;
  caseText: string;
  imageUrls: string[];
  status: string;
  createdAt: string;
}

interface Comment {
  id: number;
  userName: string | null;
  content: string;
  likeCount: number;
  createdAt: string;
  parentCommentId: number | null;
  replies: Comment[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Comments section ──────────────────────────────────────────────────────────
function CaseComments({ caseId }: { caseId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: number; name: string } | null>(null);
  const user = getStoredUser();

  useEffect(() => {
    fetch(`/api/report-cases/${caseId}/comments`)
      .then((r) => r.json())
      .then((d) => { setComments(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [caseId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (!user) { toast.error("Join the conversation first."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/report-cases/${caseId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          content: text.trim(),
          parentCommentId: replyTo?.id ?? null,
        }),
      });
      const newComment = await res.json();
      if (replyTo) {
        setComments((prev) => prev.map((c) =>
          c.id === replyTo.id ? { ...c, replies: [...c.replies, newComment] } : c
        ));
      } else {
        setComments((prev) => [newComment, ...prev]);
      }
      setText("");
      setReplyTo(null);
    } catch { toast.error("Failed to post comment."); }
    finally { setSubmitting(false); }
  }

  async function handleLike(commentId: number) {
    await fetch(`/api/report-cases/${caseId}/comments/${commentId}/like`, { method: "POST" });
    setComments((prev) => prev.map((c) => {
      if (c.id === commentId) return { ...c, likeCount: c.likeCount + 1 };
      return { ...c, replies: c.replies.map((r) => r.id === commentId ? { ...r, likeCount: r.likeCount + 1 } : r) };
    }));
  }

  return (
    <div className="mt-3 border-t border-border pt-3 space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={replyTo ? `Replying to ${replyTo.name}…` : "Add a comment…"}
          rows={2}
          className="flex-1 text-sm resize-none"
        />
        <div className="flex flex-col gap-1">
          {replyTo && (
            <Button type="button" variant="ghost" size="sm" className="text-xs px-2" onClick={() => setReplyTo(null)}>Cancel</Button>
          )}
          <Button type="submit" size="sm" disabled={submitting || !text.trim()} className="gap-1">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-2"><Skeleton className="h-8 rounded" /><Skeleton className="h-8 rounded" /></div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No comments yet. Be the first.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="space-y-2">
              <div className="bg-muted/40 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold">{c.userName ?? "Anonymous"}</span>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="text-sm leading-snug">{c.content}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <button onClick={() => handleLike(c.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                    <ThumbsUp className="w-3 h-3" />{c.likeCount > 0 && c.likeCount}
                  </button>
                  <button onClick={() => setReplyTo({ id: c.id, name: c.userName ?? "Anonymous" })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                    <CornerDownRight className="w-3 h-3" /> Reply
                  </button>
                </div>
              </div>
              {c.replies.map((r) => (
                <div key={r.id} className="ml-6 bg-muted/20 rounded-lg px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold">{r.userName ?? "Anonymous"}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(r.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-snug">{r.content}</p>
                  <button onClick={() => handleLike(r.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1">
                    <ThumbsUp className="w-3 h-3" />{r.likeCount > 0 && r.likeCount}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Case card ─────────────────────────────────────────────────────────────────
function CaseCard({ rc }: { rc: ReportCase }) {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);

  return (
    <div className="border border-border rounded-xl bg-white overflow-hidden">
      {rc.imageUrls.length > 0 && (
        <div className="flex gap-1 overflow-x-auto p-2">
          {rc.imageUrls.map((url, i) => (
            <img key={i} src={url} alt="" className="h-40 w-auto rounded-lg object-cover shrink-0" />
          ))}
        </div>
      )}
      <div className="px-4 py-3">
        <p className={`text-sm leading-relaxed whitespace-pre-wrap ${!expanded && rc.caseText.length > 300 ? "line-clamp-5" : ""}`}>
          {rc.caseText}
        </p>
        {rc.caseText.length > 300 && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary font-medium mt-1 flex items-center gap-1">
            {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Read more</>}
          </button>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="text-[11px] text-muted-foreground">{timeAgo(rc.createdAt)}</span>
          <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
            <MessageSquare className="w-3.5 h-3.5" />
            {showComments ? "Hide comments" : "Comments"}
          </button>
        </div>
        {showComments && <CaseComments caseId={rc.id} />}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportCasePage() {
  const [tab, setTab] = useState<"view" | "submit">("view");
  const [cases, setCases] = useState<ReportCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [caseText, setCaseText] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/report-cases")
      .then((r) => r.json())
      .then((d) => { setCases(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseText.trim()) { toast.error("Please describe the case."); return; }
    if (imageUrls.length === 0) { toast.error("Evidence photos are required. Please attach at least one photo."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/report-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseText: caseText.trim(), imageUrls }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(true);
      setCaseText("");
      setImageUrls([]);
    } catch { toast.error("Failed to submit. Try again."); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Flag className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-extrabold leading-none">Report a Case</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Anonymous. Every submission is reviewed before it goes public.</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 mb-5 p-1 bg-muted rounded-xl">
        {(["view", "submit"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSubmitted(false); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "view" ? "View Cases" : "Submit a Case"}
          </button>
        ))}
      </div>

      {/* View Cases */}
      {tab === "view" && (
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
          ) : cases.length === 0 ? (
            <div className="text-center py-16">
              <Flag className="mx-auto w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">No published cases yet. Be the first to report.</p>
              <Button className="mt-4" size="sm" onClick={() => setTab("submit")}>Submit a Case</Button>
            </div>
          ) : (
            cases.map((rc) => <CaseCard key={rc.id} rc={rc} />)
          )}
        </div>
      )}

      {/* Submit a Case */}
      {tab === "submit" && (
        submitted ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Flag className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold mb-2">Case Submitted!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Your report has been sent for review. Once approved, it will appear in the public feed.
            </p>
            <Button variant="outline" size="sm" onClick={() => setSubmitted(false)}>Submit Another</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border border-border rounded-xl p-4 bg-white space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Describe the case *</label>
                <Textarea
                  value={caseText}
                  onChange={(e) => setCaseText(e.target.value)}
                  placeholder="Describe what happened in as much detail as you want. Your submission is completely anonymous."
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">{caseText.length} characters</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold">
                  Attach Evidence <span className="text-destructive">*</span>
                  <span className="font-normal text-muted-foreground text-xs ml-1">(up to 5 photos — required)</span>
                </label>
                <MediaUploadMulti
                  maxMB={10}
                  values={imageUrls}
                  onChange={setImageUrls}
                />
                {imageUrls.length === 0 && (
                  <p className="text-xs text-destructive">At least one photo is required to submit a case.</p>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Before you submit:</p>
              <p>• Your submission is 100% anonymous — no name or identity is stored.</p>
              <p>• All cases are reviewed by our team before appearing publicly.</p>
              <p>• False or defamatory reports may be declined.</p>
            </div>

            <Button type="submit" disabled={submitting || !caseText.trim() || imageUrls.length === 0} className="w-full gap-2">
              <Send className="w-4 h-4" />
              {submitting ? "Submitting…" : "Submit Anonymously"}
            </Button>
          </form>
        )
      )}
    </div>
  );
}
