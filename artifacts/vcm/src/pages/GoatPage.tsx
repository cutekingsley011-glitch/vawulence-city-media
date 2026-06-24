import { useState } from "react";
import {
  useListGoatCategories,
  useListGoatNominees,
  useVoteGoat,
  useSubmitGoatNominee,
  getListGoatNomineesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getStoredUser } from "@/lib/user";
import { Award, ChevronDown } from "lucide-react";

type GoatNominee = {
  id: number;
  goatCategoryId: number;
  name: string;
  photoUrl?: string | null;
  description?: string | null;
  voteCount: number;
  status: string;
  createdAt: string;
};

function NomineesSection({ categoryId }: { categoryId: number }) {
  const user = getStoredUser();
  const queryClient = useQueryClient();
  const { data: catData, isLoading } = useListGoatNominees(categoryId);
  const voteGoat = useVoteGoat();
  const submitNominee = useSubmitGoatNominee();

  const [votedNomineeId, setVotedNomineeId] = useState<number | null>(null);
  const [showNominate, setShowNominate] = useState(false);
  const [nomineeName, setNomineeName] = useState("");
  const [nomineeDesc, setNomineeDesc] = useState("");
  const [nomineePhoto, setNomineePhoto] = useState("");
  const [submitMsg, setSubmitMsg] = useState("");

  // catData is GoatCategoryWithNominees | undefined
  const nominees: GoatNominee[] = (catData && "nominees" in catData ? (catData as { nominees: GoatNominee[] }).nominees : []);
  const userVotedNomineeId = catData && "userVotedNomineeId" in catData ? (catData as { userVotedNomineeId: number | null }).userVotedNomineeId : null;
  const hasVoted = votedNomineeId !== null || userVotedNomineeId !== null;
  const votedId = votedNomineeId ?? userVotedNomineeId;

  const displayNominees = hasVoted && votedNomineeId !== null
    ? nominees.map((n) => n.id === votedNomineeId ? { ...n, voteCount: n.voteCount + 1 } : n)
    : nominees;

  const totalVotes = displayNominees.reduce((sum, n) => sum + n.voteCount, 0);

  function handleVote(nomineeId: number) {
    if (hasVoted || !user) return;
    setVotedNomineeId(nomineeId);
    voteGoat.mutate(
      { id: nomineeId, data: { userId: user.id, nomineeId } },
      {
        onError: () => setVotedNomineeId(null),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGoatNomineesQueryKey(categoryId) }),
      }
    );
  }

  function handleNominate(e: React.FormEvent) {
    e.preventDefault();
    if (!nomineeName.trim()) return;
    submitNominee.mutate(
      {
        data: {
          goatCategoryId: categoryId,
          name: nomineeName.trim(),
          description: nomineeDesc.trim() || undefined,
          photoUrl: nomineePhoto.trim() || undefined,
          submittedBy: user?.id,
        },
      },
      {
        onSuccess: () => {
          setNomineeName(""); setNomineeDesc(""); setNomineePhoto("");
          setShowNominate(false);
          setSubmitMsg("Nomination submitted for review!");
          setTimeout(() => setSubmitMsg(""), 3000);
        },
        onError: () => setSubmitMsg("Failed to submit. Try again."),
      }
    );
  }

  if (isLoading) return <Skeleton className="h-24 rounded-xl" />;

  return (
    <div className="space-y-2">
      {nominees.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No nominees yet.</p>
      ) : (
        displayNominees.map((n) => {
          const pct = totalVotes > 0 ? Math.round((n.voteCount / totalVotes) * 100) : 0;
          const isVoted = n.id === votedId;

          return (
            <div
              key={n.id}
              className={`flex items-center gap-3 p-3 border rounded-xl bg-white transition-colors ${isVoted ? "border-primary" : "border-border"}`}
              data-testid={`nominee-${n.id}`}
            >
              {n.photoUrl ? (
                <img src={n.photoUrl} alt={n.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold text-lg">{n.name[0]?.toUpperCase()}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{n.name}</p>
                {n.description && <p className="text-xs text-muted-foreground truncate">{n.description}</p>}
                {hasVoted && (
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-muted-foreground">{n.voteCount} votes</span>
                      <span className="font-bold text-primary">{pct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>
              {!hasVoted && (
                <Button size="sm" variant="outline" className="shrink-0 border-primary text-primary hover:bg-primary hover:text-white" onClick={() => handleVote(n.id)} data-testid={`button-vote-nominee-${n.id}`}>
                  Vote
                </Button>
              )}
            </div>
          );
        })
      )}

      {submitMsg && <p className="text-sm text-primary font-medium text-center">{submitMsg}</p>}

      <Button variant="outline" size="sm" className="w-full" onClick={() => setShowNominate(!showNominate)} data-testid={`button-nominate-${categoryId}`}>
        {showNominate ? "Cancel" : "+ Submit a Nomination"}
      </Button>

      {showNominate && (
        <form onSubmit={handleNominate} className="border border-border rounded-xl p-3 bg-white space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} placeholder="Who is the GOAT?" data-testid="input-nominee-name" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Why? (optional)</Label>
            <Textarea value={nomineeDesc} onChange={(e) => setNomineeDesc(e.target.value)} placeholder="Why are they the GOAT?" rows={2} data-testid="input-nominee-desc" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Photo URL (optional)</Label>
            <Input value={nomineePhoto} onChange={(e) => setNomineePhoto(e.target.value)} placeholder="https://..." data-testid="input-nominee-photo" />
          </div>
          <Button type="submit" size="sm" disabled={!nomineeName.trim() || submitNominee.isPending} data-testid="button-submit-nominee">
            Submit Nomination
          </Button>
        </form>
      )}
    </div>
  );
}

export default function GoatPage() {
  const { data: categories, isLoading } = useListGoatCategories();
  const [openCategory, setOpenCategory] = useState<number | null>(null);

  return (
    <div className="max-w-2xl mx-auto px-3 py-4">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Who's Your GOAT?
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Greatest Of All Time — vote for the best in each category
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : !categories?.length ? (
        <div className="text-center py-16" data-testid="goat-empty">
          <Award className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No GOAT categories yet. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-3" data-testid="goat-categories">
          {categories.map((cat) => (
            <div key={cat.id} className="border border-border rounded-xl overflow-hidden" data-testid={`goat-category-${cat.id}`}>
              <button
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-muted/30 transition-colors text-left"
                onClick={() => setOpenCategory(openCategory === cat.id ? null : cat.id)}
                data-testid={`button-goat-category-${cat.id}`}
              >
                <p className="font-bold text-sm">{cat.name}</p>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openCategory === cat.id ? "rotate-180" : ""}`} />
              </button>

              {openCategory === cat.id && (
                <div className="p-3 pt-0 bg-muted/20 border-t border-border">
                  <div className="pt-3">
                    <NomineesSection categoryId={cat.id} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
