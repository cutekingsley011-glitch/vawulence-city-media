import { useState } from "react";
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
  getGetAdminStatsQueryKey,
  getListPostsQueryKey,
  getListPendingGistsQueryKey,
  getListCategoriesQueryKey,
  getGetBreakingNewsQueryKey,
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
import { BarChart3, FileText, MessageSquare, Users, Eye, Loader2, Pencil, Trash2, Check, X } from "lucide-react";

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
          <span className="text-3xl font-extrabold text-primary">VCM</span>
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

  const deletePost = useDeletePost();
  const approveGist = useApproveGist();
  const rejectGist = useRejectGist();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const setBreaking = useSetBreakingNewsBanner();

  const [postFormOpen, setPostFormOpen] = useState(false);
  const [editPost, setEditPost] = useState<{ id: number; data: PostFormData } | undefined>();
  const [newCatName, setNewCatName] = useState("");
  const [breakingText, setBreakingText] = useState(breaking?.text ?? "");
  const [breakingEnabled, setBreakingEnabled] = useState(breaking?.enabled ?? false);

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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6" data-testid="admin-stats">
        <StatCard label="Total Visitors" value={stats?.totalVisitors} icon={Eye} color="bg-blue-500" />
        <StatCard label="Registered Users" value={stats?.registeredUsers} icon={Users} color="bg-green-500" />
        <StatCard label="Total Posts" value={stats?.totalPosts} icon={FileText} color="bg-purple-500" />
        <StatCard label="Published Gists" value={stats?.totalGistsPublished} icon={MessageSquare} color="bg-orange-500" />
        <StatCard label="Total Comments" value={stats?.totalComments} icon={BarChart3} color="bg-pink-500" />
        <StatCard label="Pending Gists" value={stats?.pendingGists} icon={Loader2} color="bg-yellow-500" />
      </div>

      <Tabs defaultValue="posts">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="posts" className="flex-1" data-testid="tab-posts">Posts</TabsTrigger>
          <TabsTrigger value="gists" className="flex-1" data-testid="tab-gists">
            Gist Queue {stats?.pendingGists ? `(${stats.pendingGists})` : ""}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1" data-testid="tab-settings">Settings</TabsTrigger>
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
