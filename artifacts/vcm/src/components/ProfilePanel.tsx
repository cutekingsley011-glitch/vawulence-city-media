import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getStoredUser, setStoredUser } from "@/lib/user";
import { Bell, Activity, Check, Heart, MessageSquare, ChevronRight, Lock } from "lucide-react";

// ── Badge tiers (mirrors Leaderboard + server points lib) ───────────────────
const BADGE_TIERS = [
  { name: "Vawulence Legend", min: 501, color: "bg-yellow-100 text-yellow-800" },
  { name: "Street Governor",  min: 201, color: "bg-orange-100 text-orange-700" },
  { name: "Chief Instigator", min: 76,  color: "bg-purple-100 text-purple-700" },
  { name: "Gist Monger",      min: 21,  color: "bg-blue-100 text-blue-700" },
  { name: "Lurker",           min: 0,   color: "bg-gray-100 text-gray-600" },
];

function getBadge(pts: number) {
  return BADGE_TIERS.find((t) => pts >= t.min) ?? BADGE_TIERS[BADGE_TIERS.length - 1];
}

function formatRel(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface ProfileData { name: string; totalPoints: number; badge: string; commentCount: number; }
interface NotifItem {
  id: number; type: string; actorName: string;
  targetCommentId: number | null; targetPostId: number | null; targetVoteCardId: number | null;
  postTitle: string | null; vcTitle: string | null;
  isRead: boolean; createdAt: string;
}
interface ActivityItem {
  id: number; content: string; likeCount: number; createdAt: string;
  postId: number | null; voteCardId: number | null;
  postTitle: string | null; vcTitle: string | null;
}

type Tab = "notifs" | "activity";

export function ProfilePanel({ open, onClose, onUnreadChange }: {
  open: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
}) {
  const user = getStoredUser();
  const [, navigate] = useLocation();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);

  const [tab, setTab] = useState<Tab>("notifs");
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const didLoad = useRef(false);

  useEffect(() => {
    if (!open || !user) return;
    if (didLoad.current) return;
    didLoad.current = true;
    loadProfile();
    loadNotifs();
  }, [open]);

  useEffect(() => {
    if (tab === "activity" && user && activity.length === 0 && !activityLoading) {
      loadActivity();
    }
  }, [tab]);

  function loadProfile() {
    if (!user) return;
    fetch(`/api/users/${user.id}/profile`)
      .then((r) => r.json())
      .then((d) => { setProfile(d); setEditName(d.name); })
      .catch(() => {});
  }

  function loadNotifs() {
    if (!user) return;
    setNotifsLoading(true);
    fetch(`/api/notifications?userId=${user.id}`)
      .then((r) => r.json())
      .then((d) => {
        setNotifs(d.notifications ?? []);
        setUnread(d.unreadCount ?? 0);
        onUnreadChange?.(d.unreadCount ?? 0);
        setNotifsLoading(false);
      })
      .catch(() => setNotifsLoading(false));
  }

  function loadActivity() {
    if (!user) return;
    setActivityLoading(true);
    fetch(`/api/users/${user.id}/activity`)
      .then((r) => r.json())
      .then((d) => { setActivity(Array.isArray(d) ? d : []); setActivityLoading(false); })
      .catch(() => setActivityLoading(false));
  }

  async function handleMarkAllRead() {
    if (!user || unread === 0) return;
    await fetch("/api/notifications/mark-read", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id }),
    });
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    onUnreadChange?.(0);
  }

  async function handleSaveName() {
    if (!user || !editName.trim() || editName.trim() === profile?.name) {
      setNameEditing(false);
      return;
    }
    setSavingName(true);
    const r = await fetch(`/api/users/${user.id}/name`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    if (r.ok) {
      const d = await r.json();
      setProfile(d);
      setEditName(d.name);
      setStoredUser({ ...user, name: d.name });
    }
    setSavingName(false);
    setNameEditing(false);
  }

  function handleNotifClick(n: NotifItem) {
    onClose();
    if (n.targetPostId) {
      navigate(`/post/${n.targetPostId}`);
    } else if (n.targetVoteCardId) {
      navigate(`/vote-cards/${n.targetVoteCardId}`);
    }
  }

  function handleActivityClick(a: ActivityItem) {
    onClose();
    if (a.postId) navigate(`/post/${a.postId}`);
    else if (a.voteCardId) navigate(`/vote-cards/${a.voteCardId}`);
  }

  if (!user) return null;

  const tier = profile ? getBadge(profile.totalPoints) : null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] flex flex-col p-0">
        {/* ── Header ── */}
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-lg font-extrabold text-white">
                {(profile?.name ?? user.name ?? "?")[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {nameEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setNameEditing(false); }}
                  />
                  <Button size="sm" className="h-8 px-2" onClick={handleSaveName} disabled={savingName}>
                    {savingName ? "…" : <Check className="w-4 h-4" />}
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setNameEditing(true)}
                  className="text-left w-full"
                >
                  <p className="font-bold text-base leading-tight truncate">{profile?.name ?? user.name}</p>
                  <p className="text-xs text-muted-foreground">Tap name to edit</p>
                </button>
              )}
            </div>
          </div>

          {/* Points + badge */}
          {profile ? (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${tier?.color ?? "bg-gray-100 text-gray-600"}`}>
                {tier?.name}
              </span>
              <span className="text-xs text-muted-foreground font-medium">{profile.totalPoints} pts</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">{profile.commentCount} comments</span>
            </div>
          ) : (
            <Skeleton className="h-6 w-40 mt-2 rounded-full" />
          )}
        </SheetHeader>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border shrink-0">
          <button
            onClick={() => setTab("notifs")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${tab === "notifs" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <Bell className="w-4 h-4" />
            Notifications
            {unread > 0 && (
              <span className="ml-1 bg-primary text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("activity")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${tab === "activity" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
          >
            <Activity className="w-4 h-4" />
            My Activity
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto">
          {tab === "notifs" && (
            <div>
              {unread > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <button onClick={handleMarkAllRead} className="text-xs text-primary font-medium">
                    Mark all as read
                  </button>
                </div>
              )}
              {notifsLoading ? (
                <div className="p-4 space-y-3">
                  {[1,2,3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : notifs.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No notifications yet
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifs.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${n.isRead ? "bg-white" : "bg-blue-50"}`}
                    >
                      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${n.type === "like" ? "bg-red-100" : "bg-blue-100"}`}>
                        {n.type === "like"
                          ? <Heart className="w-3.5 h-3.5 text-red-500" />
                          : <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug">
                          <span className="font-semibold">{n.actorName}</span>
                          {n.type === "like" ? " liked your comment" : " replied to your comment"}
                        </p>
                        {(n.postTitle || n.vcTitle) && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            on: {n.postTitle ?? n.vcTitle}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">{formatRel(n.createdAt)}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "activity" && (
            <div>
              {activityLoading ? (
                <div className="p-4 space-y-3">
                  {[1,2,3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : activity.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  No comments yet — join the conversation!
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activity.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => handleActivityClick(a)}
                      className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-muted/40 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground leading-snug line-clamp-2">{a.content}</p>
                        {(a.postTitle || a.vcTitle) && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {a.postTitle ?? a.vcTitle}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground">{formatRel(a.createdAt)}</span>
                          {a.likeCount > 0 && (
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Heart className="w-2.5 h-2.5" /> {a.likeCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-border px-5 py-3">
          <button
            onClick={() => { onClose(); navigate("/admin"); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <Lock className="w-4 h-4" />
            Admin Login
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── ProfileTrigger: self-contained icon + panel ──────────────────────────────
export function ProfileTrigger({ className }: { className?: string }) {
  const user = getStoredUser();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  // Poll unread count every 60s while panel is closed
  useEffect(() => {
    if (!user) return;
    function fetchCount() {
      fetch(`/api/notifications/unread-count?userId=${user!.id}`)
        .then((r) => r.json())
        .then((d) => setUnread(d.count ?? 0))
        .catch(() => {});
    }
    fetchCount();
    const iv = setInterval(fetchCount, 60000);
    return () => clearInterval(iv);
  }, [user?.id]);

  // Not joined yet — show a guest icon that opens the join modal
  if (!user) {
    return (
      <button
        onClick={() => window.dispatchEvent(new CustomEvent("vcm:open-join"))}
        className={`relative flex items-center justify-center ${className ?? ""}`}
        aria-label="Join VCM"
      >
        <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </div>
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`relative flex items-center justify-center ${className ?? ""}`}
        aria-label="Profile"
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-xs font-extrabold text-white leading-none">
            {user.name[0].toUpperCase()}
          </span>
        </div>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      <ProfilePanel open={open} onClose={() => setOpen(false)} onUnreadChange={setUnread} />
    </>
  );
}
