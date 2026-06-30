import { useState } from "react";
import {
  useListPublicGists,
  useSubmitGist,
  getListPublicGistsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquarePlus, Clock, Share2 } from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Fire palette — cycles by gist id so each card gets a consistent colour
const FIRE_PALETTES = [
  {
    card: "bg-gradient-to-br from-red-900 to-red-950",
    text: "text-red-50",
    sub: "text-red-300",
    share: "text-red-300 hover:text-red-100",
    border: "border-red-800/40",
  },
  {
    card: "bg-gradient-to-br from-orange-900 to-orange-950",
    text: "text-orange-50",
    sub: "text-orange-300",
    share: "text-orange-300 hover:text-orange-100",
    border: "border-orange-800/40",
  },
  {
    card: "bg-gradient-to-br from-rose-900 to-rose-950",
    text: "text-rose-50",
    sub: "text-rose-300",
    share: "text-rose-300 hover:text-rose-100",
    border: "border-rose-800/40",
  },
  {
    card: "bg-gradient-to-br from-purple-900 to-purple-950",
    text: "text-purple-50",
    sub: "text-purple-300",
    share: "text-purple-300 hover:text-purple-100",
    border: "border-purple-800/40",
  },
  {
    card: "bg-gradient-to-br from-amber-900 to-amber-950",
    text: "text-amber-50",
    sub: "text-amber-300",
    share: "text-amber-300 hover:text-amber-100",
    border: "border-amber-800/40",
  },
];

function getPalette(id: number) {
  return FIRE_PALETTES[id % FIRE_PALETTES.length];
}

export default function GistsPage() {
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data: gists, isLoading } = useListPublicGists({});

  return (
    <div className="max-w-2xl mx-auto px-3 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Gists</h1>
          <p className="text-xs text-muted-foreground">Anonymous stories from the streets</p>
        </div>
        <Button
          onClick={() => setSubmitOpen(true)}
          size="sm"
          className="gap-1.5"
          data-testid="button-submit-gist"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Submit a Gist
        </Button>
      </div>

      {/* Wednesday & Saturday publish notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-start gap-2">
        <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-foreground leading-relaxed">
          Submitted gists are published every Wednesday and Saturday at 6:00 PM after admin review. Keep it real, keep it anonymous.
        </p>
      </div>

      {/* Gists list */}
      {isLoading ? (
        <div className="space-y-3" data-testid="gists-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-red-900/20">
              <Skeleton className="h-3 w-24 rounded mb-3 bg-red-900/30" />
              <Skeleton className="h-4 w-full rounded mb-1 bg-red-900/30" />
              <Skeleton className="h-4 w-3/4 rounded mb-1 bg-red-900/30" />
              <Skeleton className="h-3 w-20 rounded mt-3 bg-red-900/30" />
            </div>
          ))}
        </div>
      ) : !gists || gists.length === 0 ? (
        <div className="text-center py-16" data-testid="gists-empty">
          <p className="text-muted-foreground text-sm">No gists published yet. Check back on Wednesday or Saturday.</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="gists-feed">
          {gists.map((gist) => {
            const p = getPalette(gist.id);
            return (
              <article
                key={gist.id}
                className={`rounded-xl p-4 border ${p.card} ${p.border} shadow-md`}
                data-testid={`gist-card-${gist.id}`}
              >
                <p
                  className={`text-sm leading-relaxed font-medium ${p.text} mb-3`}
                  data-testid={`gist-content-${gist.id}`}
                >
                  {gist.content}
                </p>
                <div className={`flex items-center justify-between border-t ${p.border} pt-2.5 mt-1`}>
                  <span className={`text-xs italic ${p.sub}`}>
                    🔥 Anonymous · {gist.publishedAt ? formatDate(gist.publishedAt) : formatDate(gist.createdAt)}
                  </span>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`🔥 VCM Gist: ${gist.content.slice(0, 120)}${gist.content.length > 120 ? "…" : ""}\n\n${window.location.origin}/api/og/gist/${gist.id}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${p.share}`}
                  >
                    <Share2 className="w-3 h-3" /> Share
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Submit gist modal */}
      <GistSubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
}

// Preview uses the first palette (deep crimson) — just a taste of the style
const PREVIEW_PALETTE = FIRE_PALETTES[0];

function GistSubmitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [content, setContent] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submitGist = useSubmitGist();
  const queryClient = useQueryClient();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!content.trim()) {
      setError("Gist content is required.");
      return;
    }
    submitGist.mutate(
      { data: { content: content.trim() } },
      {
        onSuccess: () => {
          setSubmitted(true);
          queryClient.invalidateQueries({ queryKey: getListPublicGistsQueryKey() });
        },
        onError: () => setError("Failed to submit. Please try again."),
      }
    );
  }

  function handleClose() {
    setContent("");
    setSubmitted(false);
    setError("");
    onClose();
  }

  const p = PREVIEW_PALETTE;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="gist-submit-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Submit a Gist</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Submissions are 100% anonymous. Your name will never appear.
          </p>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center" data-testid="gist-submitted">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-green-600 text-xl font-bold">✓</span>
            </div>
            <p className="font-semibold text-foreground mb-1">Gist submitted for review</p>
            <p className="text-sm text-muted-foreground">
              Your gist will be considered for the next Wednesday or Saturday batch.
            </p>
            <Button onClick={handleClose} className="mt-4" data-testid="button-close-submitted">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="gist-form">
            <Textarea
              id="gist-content"
              data-testid="input-gist-content"
              placeholder="Spill the gist... (no character limit)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              disabled={submitGist.isPending}
              className="resize-none"
            />

            {/* Live preview — shows when user starts typing */}
            {content.trim() && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5 font-medium">Preview:</p>
                <div className={`rounded-xl p-4 border ${p.card} ${p.border} shadow-md`}>
                  <p className={`text-sm leading-relaxed font-medium ${p.text} mb-3`}>
                    {content.trim()}
                  </p>
                  <div className={`flex items-center justify-between border-t ${p.border} pt-2.5`}>
                    <span className={`text-xs italic ${p.sub}`}>🔥 Anonymous</span>
                    <span className={`text-xs ${p.sub}`}>Share</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive" data-testid="gist-error">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitGist.isPending || !content.trim()}
              data-testid="button-submit-gist-form"
            >
              {submitGist.isPending ? "Submitting..." : "Submit Anonymously"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
