import { useGetLeaderboard } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, Star } from "lucide-react";
import { getStoredUser } from "@/lib/user";

const BADGE_COLORS: Record<string, string> = {
  "Lurker": "bg-gray-100 text-gray-600",
  "Gist Monger": "bg-blue-100 text-blue-700",
  "Chief Instigator": "bg-purple-100 text-purple-700",
  "Street Governor": "bg-orange-100 text-orange-700",
  "Vawulence Legend": "bg-yellow-100 text-yellow-800",
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>;
}

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useGetLeaderboard();
  const user = getStoredUser();

  return (
    <div className="max-w-2xl mx-auto px-3 py-4">
      <div className="mb-5">
        <h1 className="text-xl font-extrabold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Leaderboard
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">Top vawulence generators in the city</p>
      </div>

      {/* Badge legend */}
      <div className="bg-muted/40 rounded-xl p-3 mb-5">
        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
          <Star className="w-3.5 h-3.5 text-primary" />
          Vawulence Score Badges
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { badge: "Lurker", pts: "0–20 pts" },
            { badge: "Gist Monger", pts: "21–75 pts" },
            { badge: "Chief Instigator", pts: "76–200 pts" },
            { badge: "Street Governor", pts: "201–500 pts" },
            { badge: "Vawulence Legend", pts: "501+ pts" },
          ].map(({ badge, pts }) => (
            <div key={badge} className="flex items-center gap-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BADGE_COLORS[badge] ?? "bg-gray-100"}`}>
                {badge}
              </span>
              <span className="text-xs text-muted-foreground">{pts}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 pt-2 border-t border-border/60">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Earn points:</span>{" "}
            +1 comment · +1 vote · +2 gist submitted · +5 referral
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : !leaderboard?.length ? (
        <div className="text-center py-16" data-testid="leaderboard-empty">
          <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No one on the board yet. Be first!</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="leaderboard-list">
          {leaderboard.map((entry) => {
            const isMe = entry.id === user?.id;
            const badgeClass = BADGE_COLORS[entry.badge] ?? "bg-gray-100 text-gray-600";

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  isMe ? "border-primary bg-primary/5" : "border-border bg-white"
                }`}
                data-testid={`leaderboard-entry-${entry.rank}`}
              >
                <div className="flex items-center justify-center w-7 shrink-0">
                  <RankIcon rank={entry.rank} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate">
                      {entry.name}
                      {isMe && (
                        <span className="ml-1 text-xs text-primary font-normal">(you)</span>
                      )}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass} shrink-0`}>
                      {entry.badge}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-primary">{entry.totalPoints.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
