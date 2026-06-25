import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAdminStats,
  useListPosts,
  useListPendingGists,
  useListCategories,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
  useApproveGist,
  useRejectGist,
  useCreateCategory,
  useDeleteCategory,
  useSetBreakingNewsBanner,
  useGetBreakingNews,
  useListVoteCards,
  useCreateVoteCard,
  useDeleteVoteCard,
  getGetAdminStatsQueryKey,
  getListPostsQueryKey,
  getListPendingGistsQueryKey,
  getListCategoriesQueryKey,
  getGetBreakingNewsQueryKey,
  getListVoteCardsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { BarChart3, FileText, MessageSquare, Users, Eye, Loader2, Pencil, Trash2, Check, X, Vote, CalendarDays, Megaphone, Trophy, Receipt, Crown } from "lucide-react";

// ─── Types for new sections ───────────────────────────────────────────────────
interface AdminEvent { id: number; title: string; venue: string; eventDate: string; isPaid: boolean; ticketPrice: number | null; status: "upcoming" | "past"; }
interface AdminAd { id: number; advertiserName: string; contactInfo: string; imageUrl: string; linkUrl: string | null; durationTier: string; price: number; status: string; submittedAt: string; expiresAt: string | null; }
interface AdminContest { id: number; title: string; entryFee: number; currentEntrants: number; maxEntrants: number; status: string; closesAt: string; }
interface AdminTransaction { id: number; userId: string; userName: string; type: string; baseAmountNaira: number; serviceFeeNaira: number; totalAmountNaira: number; paystackReference: string; status: string; createdAt: string; description: string; }
interface AdminSubPlan { id: number; name: string; durationDays: number; price: number; }

const TIER_LABELS: Record<string, string> = { "1week": "1 Week", "2weeks": "2 Weeks", "1month": "1 Month", "2months": "2 Months" };
interface AdminMarketItem { id: number; name: string; description: string; price: number; imageUrls: string[]; category: string; status: string; createdAt: string; }
interface AdminConnection { id: number; name: string; ageBracket: string; state: string; photoUrl: string | null; lookingFor: string; bioText: string; status: string; createdAt: string; }
interface AdminEscrowReq { id: number; userId: string | null; description: string; amount: number; status: string; notes: string | null; createdAt: string; }
interface AdminJob { id: number; title: string; companyName: string; description: string; flyerImageUrl: string | null; requirements: string[]; applyMethod: string; applyContact: string; status: string; createdAt: string; }

const ADMIN_SESSION_KEY = "vcm_admin";
const ADMIN_PASSWORD = "vcmadmin2024";

// ─── Auth gate ────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw === ADMIN_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      onLogin();
    } else {
      setError("Incorrect password.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="bg-white border border-border rounded-2xl p-8 w-full max-w-sm shadow-lg" data-testid="admin-login">
        <div className="text-center mb-6">
          <img src="/vcm-logo.png" alt="VCM" className="h-14 w-auto object-contain mx-auto mb-1" />
          <p className="text-sm text-muted-foreground mt-1">Admin Dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="admin-pw">Password</Label>
            <Input
              id="admin-pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Enter admin password"
              data-testid="input-admin-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" data-testid="button-admin-login">
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Stats cards ──────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | undefined; icon: React.ElementType; color: string }) {
  return (
    <div className={`bg-white border border-border rounded-xl p-4 flex items-center gap-3`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {value === undefined ? (
          <Skeleton className="h-6 w-12 rounded mt-0.5" />
        ) : (
          <p className="text-xl font-extrabold text-foreground">{value.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

// ─── Post form ────────────────────────────────────────────────────────────────
interface PostFormData {
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  category: string;
  isBreaking: boolean;
}

const EMPTY_POST: PostFormData = { title: "", content: "", excerpt: "", imageUrl: "", category: "", isBreaking: false };

function PostFormModal({
  open,
  onClose,
  initialData,
  editId,
}: {
  open: boolean;
  onClose: () => void;
  initialData?: PostFormData;
  editId?: number;
}) {
  const [form, setForm] = useState<PostFormData>(initialData ?? EMPTY_POST);
  const [error, setError] = useState("");
  const { data: categories } = useListCategories();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const queryClient = useQueryClient();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || !form.content.trim() || !form.category) {
      setError("Title, content, and category are required.");
      return;
    }
    const data = {
      title: form.title.trim(),
      content: form.content.trim(),
      excerpt: form.excerpt.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      category: form.category,
      isBreaking: form.isBreaking,
    };

    if (editId) {
      updatePost.mutate(
        { id: editId, data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
            onClose();
          },
          onError: () => setError("Failed to update post."),
        }
      );
    } else {
      createPost.mutate(
        { data },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
            onClose();
          },
          onError: () => setError("Failed to create post."),
        }
      );
    }
  }

  const isPending = createPost.isPending || updatePost.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="post-form-modal">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Post" : "Create Post"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              data-testid="input-post-title"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <Label>Content</Label>
            <Textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              data-testid="input-post-content"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <Label>Excerpt (optional)</Label>
            <Textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              rows={2}
              data-testid="input-post-excerpt"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <Label>Image URL (optional)</Label>
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
              data-testid="input-post-image"
              disabled={isPending}
            />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })} disabled={isPending}>
              <SelectTrigger data-testid="select-post-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={form.isBreaking}
              onCheckedChange={(v) => setForm({ ...form, isBreaking: v })}
              id="is-breaking"
              data-testid="switch-is-breaking"
            />
            <Label htmlFor="is-breaking">Mark as Breaking News</Label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isPending} data-testid="button-save-post">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {editId ? "Update Post" : "Create Post"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main admin panel ─────────────────────────────────────────────────────────
function AdminPanel() {
  const queryClient = useQueryClient();
  const { data: stats } = useGetAdminStats();
  const { data: posts, isLoading: postsLoading } = useListPosts({});
  const { data: pendingGists, isLoading: gistsLoading } = useListPendingGists();
  const { data: categories } = useListCategories();
  const { data: breaking } = useGetBreakingNews();
  const { data: voteCards, isLoading: voteCardsLoading } = useListVoteCards();

  const deletePost = useDeletePost();
  const approveGist = useApproveGist();
  const rejectGist = useRejectGist();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const setBreaking = useSetBreakingNewsBanner();
  const createVoteCard = useCreateVoteCard();
  const deleteVoteCard = useDeleteVoteCard();

  const [postFormOpen, setPostFormOpen] = useState(false);
  const [editPost, setEditPost] = useState<{ id: number; data: PostFormData } | undefined>();
  const [newCatName, setNewCatName] = useState("");
  const [breakingText, setBreakingText] = useState(breaking?.text ?? "");
  const [breakingEnabled, setBreakingEnabled] = useState(breaking?.enabled ?? false);

  // VoteCard create form state
  const [vcTitle, setVcTitle] = useState("");
  const [vcNumOptions, setVcNumOptions] = useState(2);
  const [vcOpts, setVcOpts] = useState(["", "", "", ""]);
  const [vcImgA, setVcImgA] = useState("");
  const [vcImgB, setVcImgB] = useState("");
  const [vcError, setVcError] = useState("");

  // New sections state
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [ads, setAds] = useState<AdminAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [contests, setContests] = useState<AdminContest[]>([]);
  const [contestsLoading, setContestsLoading] = useState(false);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [subPlans, setSubPlans] = useState<AdminSubPlan[]>([]);

  // Event form
  const [evtForm, setEvtForm] = useState({ title: "", description: "", venue: "", eventDate: "", imageUrl: "", isPaid: false, ticketPrice: "" });
  // Contest form
  const [ctForm, setCtForm] = useState({ title: "", description: "", imageUrl: "", entryFee: "", maxEntrants: "", closesAt: "", options: "" });
  // Marketplace state
  const [marketItems, setMarketItems] = useState<AdminMarketItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketForm, setMarketForm] = useState({ name: "", description: "", price: "", imageUrls: "", category: "General" });
  // Connections state
  const [connections, setConnections] = useState<AdminConnection[]>([]);
  const [connLoading, setConnLoading] = useState(false);
  // Escrow state
  const [escrowReqs, setEscrowReqs] = useState<AdminEscrowReq[]>([]);
  const [escrowLoading, setEscrowLoading] = useState(false);
  const [escrowForm, setEscrowForm] = useState({ description: "", amount: "", notes: "" });
  // Recruitment state
  const [jobs, setJobs] = useState<AdminJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobForm, setJobForm] = useState({ title: "", companyName: "", description: "", flyerImageUrl: "", requirements: "", applyMethod: "whatsapp", applyContact: "" });

  function setVcOpt(idx: number, val: string) {
    setVcOpts((prev) => { const next = [...prev]; next[idx] = val; return next; });
  }

  // Sync breaking state when data loads
  useState(() => {
    if (breaking) {
      setBreakingText(breaking.text);
      setBreakingEnabled(breaking.enabled);
    }
  });

  function handleDeletePost(id: number) {
    if (!confirm("Delete this post?")) return;
    deletePost.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        },
      }
    );
  }

  function handleApproveGist(id: number) {
    approveGist.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPendingGistsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        },
      }
    );
  }

  function handleRejectGist(id: number) {
    rejectGist.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPendingGistsQueryKey() });
        },
      }
    );
  }

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    createCategory.mutate(
      { data: { name: newCatName.trim() } },
      {
        onSuccess: () => {
          setNewCatName("");
          queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        },
      }
    );
  }

  function handleDeleteCategory(id: number) {
    if (!confirm("Delete this category?")) return;
    deleteCategory.mutate(
      { id },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() }) }
    );
  }

  function handleSaveBreaking(e: React.FormEvent) {
    e.preventDefault();
    setBreaking.mutate(
      { data: { text: breakingText, enabled: breakingEnabled } },
      { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetBreakingNewsQueryKey() }) }
    );
  }

  function handleCreateVoteCard(e: React.FormEvent) {
    e.preventDefault();
    setVcError("");
    if (!vcTitle.trim()) { setVcError("Title is required."); return; }
    if (!vcOpts[0].trim() || !vcOpts[1].trim()) { setVcError("Options 1 and 2 are required."); return; }
    if (vcNumOptions >= 3 && !vcOpts[2].trim()) { setVcError("Option 3 label is required."); return; }
    if (vcNumOptions >= 4 && !vcOpts[3].trim()) { setVcError("Option 4 label is required."); return; }
    createVoteCard.mutate(
      {
        data: {
          title: vcTitle.trim(),
          option1Label: vcOpts[0].trim(),
          option2Label: vcOpts[1].trim(),
          option3Label: vcNumOptions >= 3 ? vcOpts[2].trim() : undefined,
          option4Label: vcNumOptions >= 4 ? vcOpts[3].trim() : undefined,
          imageUrl: vcImgA.trim() || undefined,
          imageUrl2: vcImgB.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setVcTitle(""); setVcNumOptions(2); setVcOpts(["", "", "", ""]); setVcImgA(""); setVcImgB("");
          queryClient.invalidateQueries({ queryKey: getListVoteCardsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        },
        onError: () => setVcError("Failed to create vote card."),
      }
    );
  }

  function handleDeleteVoteCard(id: number) {
    if (!confirm("Delete this vote card?")) return;
    deleteVoteCard.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListVoteCardsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        },
      }
    );
  }

  // Loaders for new sections
  function loadEvents() {
    setEventsLoading(true);
    fetch("/api/events").then((r) => r.json()).then((d) => { setEvents(Array.isArray(d) ? d : []); setEventsLoading(false); }).catch(() => setEventsLoading(false));
  }
  function loadAds() {
    setAdsLoading(true);
    fetch("/api/admin/ads").then((r) => r.json()).then((d) => { setAds(Array.isArray(d) ? d : []); setAdsLoading(false); }).catch(() => setAdsLoading(false));
  }
  function loadContests() {
    setContestsLoading(true);
    fetch("/api/contests").then((r) => r.json()).then((d) => { setContests(Array.isArray(d) ? d : []); setContestsLoading(false); }).catch(() => setContestsLoading(false));
  }
  function loadTransactions() {
    setTxLoading(true);
    fetch("/api/admin/transactions").then((r) => r.json()).then((d) => { setTransactions(Array.isArray(d) ? d : []); setTxLoading(false); }).catch(() => setTxLoading(false));
  }
  function loadSubPlans() {
    fetch("/api/subscription-plans").then((r) => r.json()).then((d) => { setSubPlans(Array.isArray(d) ? d : []); }).catch(() => {});
  }
  function loadMarket() {
    setMarketLoading(true);
    fetch("/api/admin/marketplace").then((r) => r.json()).then((d) => { setMarketItems(Array.isArray(d) ? d : []); setMarketLoading(false); }).catch(() => setMarketLoading(false));
  }
  function loadConnections() {
    setConnLoading(true);
    fetch("/api/admin/connections").then((r) => r.json()).then((d) => { setConnections(Array.isArray(d) ? d : []); setConnLoading(false); }).catch(() => setConnLoading(false));
  }
  function loadEscrow() {
    setEscrowLoading(true);
    fetch("/api/admin/escrow-requests").then((r) => r.json()).then((d) => { setEscrowReqs(Array.isArray(d) ? d : []); setEscrowLoading(false); }).catch(() => setEscrowLoading(false));
  }
  function loadJobs() {
    setJobsLoading(true);
    fetch("/api/admin/recruitment").then((r) => r.json()).then((d) => { setJobs(Array.isArray(d) ? d : []); setJobsLoading(false); }).catch(() => setJobsLoading(false));
  }

  // Create event
  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!evtForm.title || !evtForm.venue || !evtForm.eventDate || !evtForm.description) return;
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: evtForm.title, description: evtForm.description, venue: evtForm.venue,
        eventDate: new Date(evtForm.eventDate).toISOString(),
        imageUrl: evtForm.imageUrl || null,
        isPaid: evtForm.isPaid,
        ticketPrice: evtForm.isPaid && evtForm.ticketPrice ? Number(evtForm.ticketPrice) * 100 : null,
      }),
    });
    setEvtForm({ title: "", description: "", venue: "", eventDate: "", imageUrl: "", isPaid: false, ticketPrice: "" });
    loadEvents();
  }

  async function handleDeleteEvent(id: number) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    loadEvents();
  }

  // Approve/reject ads
  async function handleApproveAd(id: number) {
    await fetch(`/api/admin/ads/${id}/approve`, { method: "POST" });
    loadAds();
  }
  async function handleRejectAd(id: number) {
    if (!confirm("Reject and refund this ad?")) return;
    await fetch(`/api/admin/ads/${id}/reject`, { method: "POST" });
    loadAds();
  }

  // Create contest
  async function handleCreateContest(e: React.FormEvent) {
    e.preventDefault();
    if (!ctForm.title || !ctForm.entryFee || !ctForm.maxEntrants || !ctForm.closesAt) return;
    await fetch("/api/contests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: ctForm.title, description: ctForm.description, imageUrl: ctForm.imageUrl || null,
        entryFee: Number(ctForm.entryFee) * 100,
        maxEntrants: Number(ctForm.maxEntrants),
        closesAt: new Date(ctForm.closesAt).toISOString(),
        options: ctForm.options ? ctForm.options.split(",").map((s) => s.trim()).filter(Boolean) : null,
      }),
    });
    setCtForm({ title: "", description: "", imageUrl: "", entryFee: "", maxEntrants: "", closesAt: "", options: "" });
    loadContests();
  }

  async function handleCloseContest(id: number) {
    await fetch(`/api/contests/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "closed" }) });
    loadContests();
  }

  async function handleDeleteContest(id: number) {
    if (!confirm("Delete this contest?")) return;
    await fetch(`/api/contests/${id}`, { method: "DELETE" });
    loadContests();
  }

  // ── Marketplace handlers ──
  async function handleCreateMarketItem(e: React.FormEvent) {
    e.preventDefault();
    if (!marketForm.name || !marketForm.description || !marketForm.price) return;
    await fetch("/api/admin/marketplace", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: marketForm.name, description: marketForm.description,
        price: Math.round(Number(marketForm.price) * 100),
        imageUrls: marketForm.imageUrls ? marketForm.imageUrls.split(",").map((s) => s.trim()).filter(Boolean) : [],
        category: marketForm.category,
      }),
    });
    setMarketForm({ name: "", description: "", price: "", imageUrls: "", category: "General" });
    loadMarket();
  }
  async function handleMarkSold(id: number) {
    if (!confirm("Mark as sold? This hides the item from public view immediately.")) return;
    await fetch(`/api/admin/marketplace/${id}/sold`, { method: "POST" });
    loadMarket();
  }
  async function handleDeleteMarketItem(id: number) {
    if (!confirm("Delete this listing?")) return;
    await fetch(`/api/admin/marketplace/${id}`, { method: "DELETE" });
    loadMarket();
  }

  // ── Connections handlers ──
  async function handleApproveConnection(id: number) {
    await fetch(`/api/admin/connections/${id}/approve`, { method: "POST" });
    loadConnections();
  }
  async function handleRejectConnection(id: number) {
    if (!confirm("Reject this connection profile?")) return;
    await fetch(`/api/admin/connections/${id}/reject`, { method: "POST" });
    loadConnections();
  }
  async function handleDeleteConnection(id: number) {
    if (!confirm("Remove this approved profile? (e.g. complaint/dispute)")) return;
    await fetch(`/api/admin/connections/${id}`, { method: "DELETE" });
    loadConnections();
  }

  // ── Escrow handlers ──
  async function handleCreateEscrow(e: React.FormEvent) {
    e.preventDefault();
    if (!escrowForm.description) return;
    await fetch("/api/admin/escrow-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: escrowForm.description, amount: Math.round(Number(escrowForm.amount) * 100) || 0, notes: escrowForm.notes || null }),
    });
    setEscrowForm({ description: "", amount: "", notes: "" });
    loadEscrow();
  }
  async function handleEscrowStatus(id: number, status: string) {
    await fetch(`/api/admin/escrow-requests/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadEscrow();
  }

  // ── Recruitment handlers ──
  async function handleCreateJob(e: React.FormEvent) {
    e.preventDefault();
    if (!jobForm.title || !jobForm.companyName || !jobForm.description || !jobForm.applyContact) return;
    await fetch("/api/admin/recruitment", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: jobForm.title, companyName: jobForm.companyName, description: jobForm.description,
        flyerImageUrl: jobForm.flyerImageUrl || null,
        requirements: jobForm.requirements ? jobForm.requirements.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        applyMethod: jobForm.applyMethod, applyContact: jobForm.applyContact,
      }),
    });
    setJobForm({ title: "", companyName: "", description: "", flyerImageUrl: "", requirements: "", applyMethod: "whatsapp", applyContact: "" });
    loadJobs();
  }
  async function handleCloseJob(id: number) {
    if (!confirm("Close this posting? It will be hidden from public view.")) return;
    await fetch(`/api/admin/recruitment/${id}/close`, { method: "POST" });
    loadJobs();
  }
  async function handleDeleteJob(id: number) {
    if (!confirm("Delete this job posting?")) return;
    await fetch(`/api/admin/recruitment/${id}`, { method: "DELETE" });
    loadJobs();
  }

  return (
    <div className="max-w-4xl mx-auto px-3 py-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Vawulence City Media</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            sessionStorage.removeItem(ADMIN_SESSION_KEY);
            window.location.reload();
          }}
          data-testid="button-admin-logout"
        >
          Logout
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6" data-testid="admin-stats">
        <StatCard label="Total Visitors" value={stats?.totalVisitors} icon={Eye} color="bg-blue-500" />
        <StatCard label="Registered Users" value={stats?.registeredUsers} icon={Users} color="bg-green-500" />
        <StatCard label="Total Posts" value={stats?.totalPosts} icon={FileText} color="bg-purple-500" />
        <StatCard label="Published Gists" value={stats?.totalGistsPublished} icon={MessageSquare} color="bg-orange-500" />
        <StatCard label="Total Comments" value={stats?.totalComments} icon={BarChart3} color="bg-pink-500" />
        <StatCard label="Pending Gists" value={stats?.pendingGists} icon={Loader2} color="bg-yellow-500" />
        <StatCard label="Vote Cards" value={stats?.totalVoteCards} icon={Vote} color="bg-indigo-500" />
      </div>

      <Tabs defaultValue="posts">
        <TabsList className="w-full mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="posts" className="flex-1 text-xs" data-testid="tab-posts">Posts</TabsTrigger>
          <TabsTrigger value="gists" className="flex-1 text-xs" data-testid="tab-gists">
            Gists {stats?.pendingGists ? `(${stats.pendingGists})` : ""}
          </TabsTrigger>
          <TabsTrigger value="vote-cards" className="flex-1 text-xs" data-testid="tab-vote-cards">Votes</TabsTrigger>
          <TabsTrigger value="events" className="flex-1 text-xs" data-testid="tab-events" onClick={loadEvents}>Events</TabsTrigger>
          <TabsTrigger value="ads" className="flex-1 text-xs" data-testid="tab-ads" onClick={loadAds}>Ads</TabsTrigger>
          <TabsTrigger value="contests" className="flex-1 text-xs" data-testid="tab-contests" onClick={loadContests}>Contests</TabsTrigger>
          <TabsTrigger value="transactions" className="flex-1 text-xs" data-testid="tab-transactions" onClick={loadTransactions}>Ledger</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 text-xs" data-testid="tab-settings" onClick={loadSubPlans}>Settings</TabsTrigger>
          <TabsTrigger value="market" className="flex-1 text-xs" onClick={loadMarket}>Market</TabsTrigger>
          <TabsTrigger value="conn" className="flex-1 text-xs" onClick={loadConnections}>Connect</TabsTrigger>
          <TabsTrigger value="escrow" className="flex-1 text-xs" onClick={loadEscrow}>Escrow</TabsTrigger>
          <TabsTrigger value="jobs" className="flex-1 text-xs" onClick={loadJobs}>Jobs</TabsTrigger>
        </TabsList>

        {/* ── Posts tab ── */}
        <TabsContent value="posts">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base">All Posts</h2>
            <Button size="sm" onClick={() => { setEditPost(undefined); setPostFormOpen(true); }} data-testid="button-new-post">
              + New Post
            </Button>
          </div>

          {postsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : !posts?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">No posts yet.</p>
          ) : (
            <div className="space-y-2" data-testid="admin-posts-list">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg bg-white"
                  data-testid={`admin-post-${post.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{post.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground capitalize">{post.category}</span>
                      {post.isBreaking && (
                        <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Breaking</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => {
                        setEditPost({
                          id: post.id,
                          data: {
                            title: post.title,
                            content: post.content,
                            excerpt: post.excerpt ?? "",
                            imageUrl: post.imageUrl ?? "",
                            category: post.category,
                            isBreaking: post.isBreaking,
                          },
                        });
                        setPostFormOpen(true);
                      }}
                      data-testid={`button-edit-post-${post.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeletePost(post.id)}
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Gist queue tab ── */}
        <TabsContent value="gists">
          <h2 className="font-bold text-base mb-3">Pending Gist Queue</h2>
          {gistsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
            </div>
          ) : !pendingGists?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8" data-testid="no-pending-gists">
              No gists pending review.
            </p>
          ) : (
            <div className="space-y-3" data-testid="admin-gists-queue">
              {pendingGists.map((gist) => (
                <div
                  key={gist.id}
                  className="p-4 border border-border rounded-xl bg-white"
                  data-testid={`admin-gist-${gist.id}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                          {gist.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(gist.createdAt).toLocaleDateString("en-NG")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed" data-testid={`admin-gist-content-${gist.id}`}>
                        {gist.content}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="gap-1 h-8"
                        onClick={() => handleApproveGist(gist.id)}
                        data-testid={`button-approve-gist-${gist.id}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-8 text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => handleRejectGist(gist.id)}
                        data-testid={`button-reject-gist-${gist.id}`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Vote Cards tab ── */}
        <TabsContent value="vote-cards">
          <div className="space-y-4">
            <div className="border border-border rounded-xl p-4 bg-white">
              <h2 className="font-bold text-sm mb-3">Create Vote Card</h2>
              <form onSubmit={handleCreateVoteCard} className="space-y-3">
                <div className="space-y-1">
                  <Label>Title / Question</Label>
                  <Input
                    value={vcTitle}
                    onChange={(e) => setVcTitle(e.target.value)}
                    placeholder="e.g. Who's the Best DJ in Abakaliki?"
                    data-testid="input-admin-vc-title"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Options:</span>
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setVcNumOptions(n)}
                      className={`w-8 h-8 rounded-full text-sm font-bold border transition-colors ${vcNumOptions === n ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {[0, 1, 2, 3].slice(0, vcNumOptions).map((idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-6 shrink-0">#{idx + 1}</span>
                      <Input
                        value={vcOpts[idx]}
                        onChange={(e) => setVcOpt(idx, e.target.value)}
                        placeholder={`Option ${idx + 1} label`}
                        data-testid={`input-admin-vc-opt-${idx + 1}`}
                        className="flex-1"
                      />
                      {idx === 0 && <Input value={vcImgA} onChange={(e) => setVcImgA(e.target.value)} placeholder="Image URL" className="flex-1 text-xs" />}
                      {idx === 1 && <Input value={vcImgB} onChange={(e) => setVcImgB(e.target.value)} placeholder="Image URL" className="flex-1 text-xs" />}
                    </div>
                  ))}
                </div>
                {vcError && <p className="text-sm text-destructive">{vcError}</p>}
                <Button type="submit" size="sm" disabled={createVoteCard.isPending} data-testid="button-admin-create-vc">
                  {createVoteCard.isPending ? "Creating..." : "Create Vote Card"}
                </Button>
              </form>
            </div>

            <div>
              <h2 className="font-bold text-sm mb-3">All Vote Cards</h2>
              {voteCardsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
                </div>
              ) : !voteCards?.length ? (
                <p className="text-sm text-muted-foreground text-center py-6">No vote cards yet.</p>
              ) : (
                <div className="space-y-2" data-testid="admin-vote-cards-list">
                  {voteCards.map((vc) => (
                    <div key={vc.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-white" data-testid={`admin-vc-${vc.id}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{vc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${vc.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {vc.isActive ? "active" : "closed"}
                          </span>
                          <span className="text-xs text-muted-foreground">{vc.totalVotes} votes</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteVoteCard(vc.id)}
                        data-testid={`button-delete-vc-${vc.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Events tab ── */}
        <TabsContent value="events">
          <div className="space-y-5">
            {/* Create event form */}
            <div className="border border-border rounded-xl p-4 bg-white">
              <h2 className="font-bold text-sm mb-3">Create Event</h2>
              <form onSubmit={handleCreateEvent} className="space-y-3">
                <Input placeholder="Title *" value={evtForm.title} onChange={(e) => setEvtForm((f) => ({ ...f, title: e.target.value }))} />
                <Textarea placeholder="Description *" value={evtForm.description} onChange={(e) => setEvtForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                <Input placeholder="Venue *" value={evtForm.venue} onChange={(e) => setEvtForm((f) => ({ ...f, venue: e.target.value }))} />
                <Input type="datetime-local" value={evtForm.eventDate} onChange={(e) => setEvtForm((f) => ({ ...f, eventDate: e.target.value }))} />
                <Input placeholder="Image URL (optional)" value={evtForm.imageUrl} onChange={(e) => setEvtForm((f) => ({ ...f, imageUrl: e.target.value }))} />
                <div className="flex items-center gap-2">
                  <Switch checked={evtForm.isPaid} onCheckedChange={(v) => setEvtForm((f) => ({ ...f, isPaid: v }))} id="evt-paid" />
                  <Label htmlFor="evt-paid">Paid Event</Label>
                </div>
                {evtForm.isPaid && <Input type="number" placeholder="Ticket price (₦)" value={evtForm.ticketPrice} onChange={(e) => setEvtForm((f) => ({ ...f, ticketPrice: e.target.value }))} />}
                <Button type="submit" size="sm"><CalendarDays className="w-3.5 h-3.5 mr-1" />Create Event</Button>
              </form>
            </div>
            {/* Events list */}
            <div>
              <h2 className="font-bold text-sm mb-3">All Events</h2>
              {eventsLoading ? <Skeleton className="h-24 rounded-xl" /> : events.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No events yet.</p> : (
                <div className="space-y-2">
                  {events.map((evt) => (
                    <div key={evt.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-white">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{evt.title}</p>
                        <p className="text-xs text-muted-foreground">{evt.venue} · {new Date(evt.eventDate).toLocaleDateString("en-NG")}</p>
                        <div className="flex gap-1 mt-0.5">
                          <Badge variant={evt.status === "upcoming" ? "default" : "secondary"} className="text-xs">{evt.status}</Badge>
                          {evt.isPaid && <Badge variant="outline" className="text-xs">₦{((evt.ticketPrice ?? 0) / 100).toLocaleString()}</Badge>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDeleteEvent(evt.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Ads tab ── */}
        <TabsContent value="ads">
          <h2 className="font-bold text-base mb-3">Ad Submissions</h2>
          {adsLoading ? <Skeleton className="h-32 rounded-xl" /> : ads.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No ad submissions yet.</p> : (
            <div className="space-y-3">
              {ads.map((ad) => (
                <div key={ad.id} className="border border-border rounded-xl p-4 bg-white">
                  <div className="flex items-start gap-3">
                    <img src={ad.imageUrl} alt={ad.advertiserName} className="w-20 h-14 object-cover rounded-lg shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{ad.advertiserName}</p>
                      <p className="text-xs text-muted-foreground">{ad.contactInfo}</p>
                      <p className="text-xs text-muted-foreground">{TIER_LABELS[ad.durationTier] ?? ad.durationTier} · ₦{(ad.price / 100).toLocaleString()}</p>
                      <Badge variant={ad.status === "live" ? "default" : ad.status === "rejected" ? "destructive" : "secondary"} className="text-xs mt-1">{ad.status}</Badge>
                    </div>
                  </div>
                  {ad.status === "under_review" && (
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" onClick={() => handleApproveAd(ad.id)} className="gap-1"><Check className="w-3.5 h-3.5" />Approve</Button>
                      <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30" onClick={() => handleRejectAd(ad.id)}><X className="w-3.5 h-3.5" />Reject & Refund</Button>
                    </div>
                  )}
                  {ad.status === "live" && ad.expiresAt && (
                    <p className="text-xs text-muted-foreground mt-2">Expires: {new Date(ad.expiresAt).toLocaleDateString("en-NG")}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Contests tab ── */}
        <TabsContent value="contests">
          <div className="space-y-5">
            <div className="border border-border rounded-xl p-4 bg-white">
              <h2 className="font-bold text-sm mb-3">Create Contest</h2>
              <form onSubmit={handleCreateContest} className="space-y-3">
                <Input placeholder="Title *" value={ctForm.title} onChange={(e) => setCtForm((f) => ({ ...f, title: e.target.value }))} />
                <Textarea placeholder="Description" value={ctForm.description} onChange={(e) => setCtForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                <Input placeholder="Image URL (optional)" value={ctForm.imageUrl} onChange={(e) => setCtForm((f) => ({ ...f, imageUrl: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Entry fee (₦) *" value={ctForm.entryFee} onChange={(e) => setCtForm((f) => ({ ...f, entryFee: e.target.value }))} />
                  <Input type="number" placeholder="Max entrants *" value={ctForm.maxEntrants} onChange={(e) => setCtForm((f) => ({ ...f, maxEntrants: e.target.value }))} />
                </div>
                <Input type="datetime-local" value={ctForm.closesAt} onChange={(e) => setCtForm((f) => ({ ...f, closesAt: e.target.value }))} />
                <Input placeholder="Options (comma-separated, optional)" value={ctForm.options} onChange={(e) => setCtForm((f) => ({ ...f, options: e.target.value }))} />
                <Button type="submit" size="sm"><Trophy className="w-3.5 h-3.5 mr-1" />Create Contest</Button>
              </form>
            </div>
            <div>
              <h2 className="font-bold text-sm mb-3">All Contests</h2>
              {contestsLoading ? <Skeleton className="h-24 rounded-xl" /> : contests.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No contests yet.</p> : (
                <div className="space-y-2">
                  {contests.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 border border-border rounded-lg bg-white">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground">₦{(c.entryFee / 100).toLocaleString()} · {c.currentEntrants}/{c.maxEntrants} entered · {new Date(c.closesAt).toLocaleDateString("en-NG")}</p>
                        <Badge variant={c.status === "open" ? "default" : "secondary"} className="text-xs">{c.status}</Badge>
                      </div>
                      <div className="flex gap-1">
                        {c.status === "open" && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleCloseContest(c.id)}>Close</Button>}
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => handleDeleteContest(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── Transactions (ledger) tab ── */}
        <TabsContent value="transactions">
          <h2 className="font-bold text-base mb-3">Transaction Ledger</h2>
          {txLoading ? <div className="space-y-2">{[1,2,3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div> : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-3 border border-border rounded-lg bg-white">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground leading-relaxed">{tx.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(tx.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-blue-700">₦{tx.totalAmountNaira.toLocaleString("en-NG")}</p>
                      <Badge variant={tx.status === "success" ? "default" : tx.status === "refunded" ? "secondary" : "destructive"} className="text-xs">{tx.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Settings tab ── */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Breaking news */}
            <div className="border border-border rounded-xl p-4 bg-white" data-testid="breaking-news-settings">
              <h3 className="font-bold text-sm mb-3">Breaking News Banner</h3>
              <form onSubmit={handleSaveBreaking} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={breakingEnabled}
                    onCheckedChange={setBreakingEnabled}
                    id="breaking-enabled"
                    data-testid="switch-breaking-enabled"
                  />
                  <Label htmlFor="breaking-enabled">Show breaking news ticker</Label>
                </div>
                <div className="space-y-1">
                  <Label>Ticker Text</Label>
                  <Textarea
                    value={breakingText}
                    onChange={(e) => setBreakingText(e.target.value)}
                    rows={2}
                    placeholder="Breaking news text..."
                    data-testid="input-breaking-text"
                  />
                </div>
                <Button type="submit" size="sm" disabled={setBreaking.isPending} data-testid="button-save-breaking">
                  {setBreaking.isPending ? "Saving..." : "Save Banner"}
                </Button>
              </form>
            </div>

            {/* Categories */}
            <div className="border border-border rounded-xl p-4 bg-white" data-testid="categories-settings">
              <h3 className="font-bold text-sm mb-3">Categories</h3>
              <form onSubmit={handleAddCategory} className="flex gap-2 mb-3">
                <Input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="New category name"
                  className="flex-1"
                  data-testid="input-new-category"
                />
                <Button type="submit" size="sm" disabled={createCategory.isPending} data-testid="button-add-category">
                  Add
                </Button>
              </form>
              <div className="space-y-1.5">
                {categories?.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(cat.id)}
                      data-testid={`button-delete-category-${cat.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Marketplace tab ── */}
        <TabsContent value="market">
          <div className="space-y-4">
            <div className="border border-border rounded-xl p-4 bg-white">
              <h3 className="font-bold text-sm mb-3">Add New Listing</h3>
              <form onSubmit={handleCreateMarketItem} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Item name *" value={marketForm.name} onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })} />
                  <Input placeholder="Price in ₦ *" type="number" value={marketForm.price} onChange={(e) => setMarketForm({ ...marketForm, price: e.target.value })} />
                </div>
                <Textarea placeholder="Description *" rows={2} value={marketForm.description} onChange={(e) => setMarketForm({ ...marketForm, description: e.target.value })} />
                <Input placeholder="Category (e.g. Electronics, Fashion)" value={marketForm.category} onChange={(e) => setMarketForm({ ...marketForm, category: e.target.value })} />
                <Input placeholder="Photo URLs (comma-separated)" value={marketForm.imageUrls} onChange={(e) => setMarketForm({ ...marketForm, imageUrls: e.target.value })} />
                <Button type="submit" size="sm" disabled={!marketForm.name || !marketForm.price}>Add Listing</Button>
              </form>
            </div>
            <div className="space-y-2">
              {marketLoading ? <Skeleton className="h-16 rounded-xl" /> : marketItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No listings yet.</p>
              ) : marketItems.map((item) => (
                <div key={item.id} className="border border-border rounded-xl p-3 bg-white flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">₦{(item.price / 100).toLocaleString("en-NG")} · {item.category}</p>
                    <Badge variant={item.status === "available" ? "default" : "secondary"} className="text-xs mt-1">{item.status}</Badge>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {item.status === "available" && (
                      <Button size="sm" variant="outline" className="text-orange-600 border-orange-200" onClick={() => handleMarkSold(item.id)}>Mark Sold</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteMarketItem(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Connections tab ── */}
        <TabsContent value="conn">
          <div className="space-y-3">
            {connLoading ? <Skeleton className="h-16 rounded-xl" /> : connections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No connection profiles yet.</p>
            ) : connections.map((c) => (
              <div key={c.id} className="border border-border rounded-xl p-3 bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-sm">{c.name}</p>
                      <Badge variant="outline" className="text-xs">{c.ageBracket}</Badge>
                      <Badge variant={c.status === "approved" ? "default" : c.status === "pending" ? "secondary" : "destructive"} className="text-xs">{c.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.state} · Looking for: {c.lookingFor}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.bioText}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {c.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => handleApproveConnection(c.id)} className="h-7 px-2 text-xs gap-1"><Check className="w-3 h-3" />Approve</Button>
                        <Button size="sm" variant="outline" onClick={() => handleRejectConnection(c.id)} className="h-7 px-2 text-xs gap-1 text-destructive border-destructive/30"><X className="w-3 h-3" />Reject</Button>
                      </>
                    )}
                    {c.status === "approved" && (
                      <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive" onClick={() => handleDeleteConnection(c.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── Escrow tab ── */}
        <TabsContent value="escrow">
          <div className="space-y-4">
            <div className="border border-border rounded-xl p-4 bg-white">
              <h3 className="font-bold text-sm mb-3">Log New Escrow Deal</h3>
              <form onSubmit={handleCreateEscrow} className="space-y-3">
                <Textarea placeholder="Deal description *" rows={2} value={escrowForm.description} onChange={(e) => setEscrowForm({ ...escrowForm, description: e.target.value })} />
                <Input placeholder="Deal amount in ₦ (optional)" type="number" value={escrowForm.amount} onChange={(e) => setEscrowForm({ ...escrowForm, amount: e.target.value })} />
                <Input placeholder="Notes (optional)" value={escrowForm.notes} onChange={(e) => setEscrowForm({ ...escrowForm, notes: e.target.value })} />
                <Button type="submit" size="sm" disabled={!escrowForm.description}>Log Deal</Button>
              </form>
            </div>
            <div className="space-y-2">
              {escrowLoading ? <Skeleton className="h-16 rounded-xl" /> : escrowReqs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No escrow deals logged yet.</p>
              ) : escrowReqs.map((r) => (
                <div key={r.id} className="border border-border rounded-xl p-3 bg-white">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-medium line-clamp-2">{r.description}</p>
                      {r.amount > 0 && <p className="text-xs text-muted-foreground">₦{(r.amount / 100).toLocaleString("en-NG")}</p>}
                      {r.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{r.notes}</p>}
                    </div>
                    <Badge className={`shrink-0 text-xs ${r.status === "released" ? "bg-green-100 text-green-700" : r.status === "confirmed" ? "bg-blue-100 text-blue-700" : r.status === "paid_in" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-700"}`}>
                      {r.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {["pending", "paid_in", "confirmed", "released"].map((s) => (
                      <Button key={s} size="sm" variant={r.status === s ? "default" : "outline"} className="h-6 px-2 text-xs" onClick={() => handleEscrowStatus(r.id, s)}>
                        {s.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Jobs tab ── */}
        <TabsContent value="jobs">
          <div className="space-y-4">
            <div className="border border-border rounded-xl p-4 bg-white">
              <h3 className="font-bold text-sm mb-3">Post a Job</h3>
              <form onSubmit={handleCreateJob} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Job title *" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
                  <Input placeholder="Company name *" value={jobForm.companyName} onChange={(e) => setJobForm({ ...jobForm, companyName: e.target.value })} />
                </div>
                <Textarea placeholder="Full job description *" rows={3} value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} />
                <Textarea placeholder="Requirements (one per line, e.g. Must reside in Abakaliki)" rows={3} value={jobForm.requirements} onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })} />
                <Input placeholder="Flyer image URL (optional)" value={jobForm.flyerImageUrl} onChange={(e) => setJobForm({ ...jobForm, flyerImageUrl: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Select value={jobForm.applyMethod} onValueChange={(v) => setJobForm({ ...jobForm, applyMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp number</SelectItem>
                      <SelectItem value="office_address">Office address</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder={jobForm.applyMethod === "whatsapp" ? "Phone number (e.g. 08012345678)" : "Office address"} value={jobForm.applyContact} onChange={(e) => setJobForm({ ...jobForm, applyContact: e.target.value })} />
                </div>
                <Button type="submit" size="sm" disabled={!jobForm.title || !jobForm.companyName || !jobForm.description || !jobForm.applyContact}>Post Job</Button>
              </form>
            </div>
            <div className="space-y-2">
              {jobsLoading ? <Skeleton className="h-16 rounded-xl" /> : jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No job postings yet.</p>
              ) : jobs.map((j) => (
                <div key={j.id} className="border border-border rounded-xl p-3 bg-white flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{j.title}</p>
                    <p className="text-xs text-muted-foreground">{j.companyName} · {j.applyMethod === "whatsapp" ? "WhatsApp" : "Office"}</p>
                    <Badge variant={j.status === "open" ? "default" : "secondary"} className="text-xs mt-1">{j.status}</Badge>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {j.status === "open" && (
                      <Button size="sm" variant="outline" className="text-orange-600 border-orange-200" onClick={() => handleCloseJob(j.id)}>Close</Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteJob(j.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

      </Tabs>

      <PostFormModal
        open={postFormOpen}
        onClose={() => { setPostFormOpen(false); setEditPost(undefined); }}
        initialData={editPost?.data}
        editId={editPost?.id}
      />
    </div>
  );
}

// ─── Top-level component ──────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(() => !!sessionStorage.getItem(ADMIN_SESSION_KEY));
  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;
  return <AdminPanel />;
}
