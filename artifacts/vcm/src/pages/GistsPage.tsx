import { useState } from "react";
import {
  useListPublicGists,
  useSubmitGist,
  useListCategories,
  getListPublicGistsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquarePlus, Clock } from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function GistsPage() {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(undefined);

  const { data: gists, isLoading } = useListPublicGists(
    activeCategory ? { category: activeCategory } : {},
    { query: { queryKey: getListPublicGistsQueryKey(activeCategory ? { category: activeCategory } : {}) } }
  );
  const { data: categories } = useListCategories();

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

      {/* Category filter */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-4"
        style={{ scrollbarWidth: "none" }}
        data-testid="gist-category-filter"
      >
        <button
          onClick={() => setActiveCategory(undefined)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
            !activeCategory
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white text-muted-foreground border-border hover:border-primary hover:text-primary"
          }`}
          data-testid="gist-filter-all"
        >
          All
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.name === activeCategory ? undefined : cat.name)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              activeCategory === cat.name
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-muted-foreground border-border hover:border-primary hover:text-primary"
            }`}
            data-testid={`gist-filter-${cat.name.toLowerCase()}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Saturday publish notice */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-start gap-2">
        <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-xs text-foreground leading-relaxed">
          Submitted gists are published every Saturday at 6:00 PM after admin review. Keep it real, keep it anonymous.
        </p>
      </div>

      {/* Gists list */}
      {isLoading ? (
        <div className="space-y-3" data-testid="gists-loading">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 border border-border rounded-xl">
              <Skeleton className="h-3 w-20 rounded mb-2" />
              <Skeleton className="h-4 w-full rounded mb-1" />
              <Skeleton className="h-4 w-3/4 rounded mb-1" />
              <Skeleton className="h-3 w-24 rounded mt-2" />
            </div>
          ))}
        </div>
      ) : !gists || gists.length === 0 ? (
        <div className="text-center py-16" data-testid="gists-empty">
          <p className="text-muted-foreground text-sm">No gists published yet. Check back on Saturday.</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="gists-feed">
          {gists.map((gist) => (
            <article
              key={gist.id}
              className="p-4 border border-border rounded-xl bg-card hover:shadow-sm transition-shadow"
              data-testid={`gist-card-${gist.id}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                  {gist.category}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {gist.publishedAt ? formatDate(gist.publishedAt) : formatDate(gist.createdAt)}
                </span>
              </div>
              <p className="text-sm text-foreground leading-relaxed" data-testid={`gist-content-${gist.id}`}>
                {gist.content}
              </p>
              {gist.imageUrl && (
                <div className="mt-3 rounded-lg overflow-hidden">
                  <img src={gist.imageUrl} alt="Gist image" className="w-full max-h-64 object-cover" />
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2 italic">Anonymous</p>
            </article>
          ))}
        </div>
      )}

      {/* Submit gist modal */}
      <GistSubmitModal open={submitOpen} onClose={() => setSubmitOpen(false)} />
    </div>
  );
}

function GistSubmitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const { data: categories } = useListCategories();
  const submitGist = useSubmitGist();
  const queryClient = useQueryClient();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!content.trim()) {
      setError("Gist content is required.");
      return;
    }
    if (!category) {
      setError("Please select a category.");
      return;
    }
    submitGist.mutate(
      { data: { content: content.trim(), imageUrl: imageUrl.trim() || undefined, category } },
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
    setImageUrl("");
    setCategory("");
    setSubmitted(false);
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" data-testid="gist-submit-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Submit a Gist</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Submissions are anonymous. Your name will never appear.
          </p>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center" data-testid="gist-submitted">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
              <span className="text-green-600 text-xl font-bold">✓</span>
            </div>
            <p className="font-semibold text-foreground mb-1">Gist submitted for review</p>
            <p className="text-sm text-muted-foreground">
              Your gist will be considered for the next Saturday batch.
            </p>
            <Button onClick={handleClose} className="mt-4" data-testid="button-close-submitted">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="gist-form">
            <div className="space-y-1">
              <Label htmlFor="gist-content">Your Gist</Label>
              <Textarea
                id="gist-content"
                data-testid="input-gist-content"
                placeholder="Spill the gist... (no character limit)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                disabled={submitGist.isPending}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="gist-category">Category</Label>
              <Select value={category} onValueChange={setCategory} disabled={submitGist.isPending}>
                <SelectTrigger id="gist-category" data-testid="select-gist-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name} data-testid={`category-option-${cat.name}`}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="gist-image">Photo URL (optional)</Label>
              <Input
                id="gist-image"
                data-testid="input-gist-image"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={submitGist.isPending}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" data-testid="gist-error">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitGist.isPending}
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
