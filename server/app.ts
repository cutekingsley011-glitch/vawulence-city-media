import express, { Request, Response, NextFunction } from 'express';
import { db } from './db';
import { storage, mediaToken, mediaPath } from './storage';
import { seedIfEmpty } from './seed';

const app = express();

// Increase JSON body limit to support base64 media uploads
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// CORS headers
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Seed data on initial startup
let seeded = false;
app.use(async (req, res, next) => {
  if (!seeded) {
    seeded = true;
    await seedIfEmpty();
  }
  next();
});

// Admin verification & WhatsApp Admin coordination
function getAdminWa(): string {
  const envVal = String(process.env.VITE_ADMIN_WA || '');
  const digits = envVal.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }
  return '2348030430681';
}

function verifyAdminPassword(password?: string | undefined): { ok: boolean; message: string; waLink: string; adminWa: string } {
  const cleanWa = getAdminWa();
  const waLink = `https://wa.me/${cleanWa}?text=${encodeURIComponent('Hi VCM Admin')}`;
  return {
    ok: true,
    message: 'Admin verified. WhatsApp Admin: +2348030430681',
    waLink,
    adminWa: `+${cleanWa}`,
  };
}


// Helper DB functions matching original backend
async function safeList<T = any>(table: string, limit = 10000): Promise<T[]> {
  try {
    const res = await db.list<T>(table, { limit });
    return res.items || [];
  } catch {
    return [];
  }
}

async function isDeletedTombstone(table: string, id: string): Promise<boolean> {
  try {
    const tombstones = await safeList('deleted_records', 10000);
    return tombstones.some((x: any) => String(x.key) === `${table}:${id}`);
  } catch {
    return false;
  }
}

async function addDeletedTombstone(table: string, id: string): Promise<boolean> {
  try {
    const existing = await safeList('deleted_records', 10000);
    if (existing.some((x: any) => String(x.key) === `${table}:${id}`)) return true;
    const [saved] = await db.add('deleted_records', [
      { key: `${table}:${id}`, table, id, deletedAt: new Date().toISOString() },
    ]);
    return Boolean(saved);
  } catch {
    return false;
  }
}

// Media normalization
function mediaObjectPath(value: any): string | null {
  const s = String(value || '').trim();
  if (!s) return null;
  if (s.startsWith('/api/media/')) {
    const token = s.slice('/api/media/'.length);
    try {
      const decoded = decodeURIComponent(token);
      if (decoded.startsWith('vcm/')) return decoded;
      const decodedToken = mediaPath(token);
      if (decodedToken.startsWith('vcm/')) return decodedToken;
    } catch {}
    return null;
  }
  try {
    const u = new URL(s);
    const marker = '/vcm/';
    const i = u.pathname.indexOf(marker);
    if (i >= 0) return u.pathname.slice(i + 1);
  } catch {}
  return s.startsWith('vcm/') ? s : null;
}

function resolveMediaUrl(value: any): string {
  const pathStr = mediaObjectPath(value);
  if (!pathStr) return value;
  return `/api/media/${mediaToken(pathStr)}`;
}

async function normalizeMediaRecord(row: any): Promise<any> {
  if (!row) return row;
  const x = { ...row };
  for (const [k, v] of Object.entries(x)) {
    if (typeof v === 'string' && /(^image$|imageUrl|photoUrl|flyerImageUrl|videoUrl)$/i.test(k)) {
      x[k] = resolveMediaUrl(v);
    }
  }
  if (Array.isArray(x.imageUrls)) {
    x.imageUrls = x.imageUrls.map((v: any) => resolveMediaUrl(v));
  }
  return x;
}

// Member lookup
async function findMemberByToken(token: string): Promise<any | null> {
  if (!token) return null;
  const rows = await safeList('users', 10000);
  return (
    rows.find(
      (u: any) =>
        String(u.memberToken || '') === token && u.status !== 'deleted' && u.isBanned !== true
    ) || null
  );
}

async function memberFromBodyOrHeader(req: Request): Promise<any | null> {
  const bodyToken = String(req.body?.memberToken || '').trim();
  if (bodyToken) {
    const m = await findMemberByToken(bodyToken);
    if (m) return m;
  }
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    const m = await findMemberByToken(bearer);
    if (m) return m;
  }
  return null;
}

// Member auth middleware
async function requireVcmMember(req: Request, res: Response, next: NextFunction) {
  const member = await memberFromBodyOrHeader(req);
  if (!member) {
    return res.status(401).json({ error: 'VCM membership is required. Choose a VCM username first.' });
  }
  if (member.isBanned) {
    return res.status(403).json({ error: 'Your VCM membership is currently restricted.' });
  }
  (req as any).user = {
    userId: String(member.id),
    name: String(member.username || member.name || 'VCM Member'),
    email: member.email || '',
    scope: 'vcm-member',
  };
  next();
}

async function ensureUser(userId: string, name: string, email: string) {
  const rows = await safeList('users', 10000);
  const existing = rows.find((u: any) => String(u.authUserId || u.id) === userId);
  if (existing) return existing;
  const [id] = await db.add('users', [
    {
      authUserId: userId,
      name: name || 'VCM Member',
      email: email || '',
      totalPoints: 0,
      commentCount: 0,
      voteCount: 0,
      referralCount: 0,
      createdAt: new Date().toISOString(),
    },
  ]);
  return id
    ? { id, authUserId: userId, name: name || 'VCM Member', email: email || '', totalPoints: 0, commentCount: 0, voteCount: 0, referralCount: 0 }
    : null;
}

async function getReactions(postId: string) {
  const rows = await safeList('reactions', 1000);
  const counts: Record<string, number> = { like: 0, laugh: 0, shock: 0, angry: 0 };
  for (const r of rows) {
    if (String(r.postId) === postId && counts[r.type] !== undefined) {
      counts[r.type]++;
    }
  }
  return counts;
}

async function getComments(postId: string) {
  const rows = await safeList('comments', 1000);
  const all = rows.filter((c: any) => String(c.postId) === postId && c.voteCardId == null);
  const top = all.filter((c: any) => c.parentCommentId == null);
  return top.map((c: any) => ({
    ...c,
    replies: all.filter((r: any) => String(r.parentCommentId) === String(c.id)),
  }));
}

async function getVoteCards() {
  const r = await safeList('vote_cards', 200);
  return r
    .map((c: any) => ({
      ...c,
      totalVotes:
        (c.option1Count || 0) +
        (c.option2Count || 0) +
        (c.option3Count || 0) +
        (c.option4Count || 0),
    }))
    .filter((c: any) => c.status !== 'rejected' && c.isActive !== false);
}

async function getLeaderboard() {
  const users = await safeList('users', 100);
  return users
    .sort((a: any, b: any) => Number(b.totalPoints || 0) - Number(a.totalPoints || 0))
    .map((u: any, i: number) => {
      const points = Number(u.totalPoints || 0);
      const badge =
        points >= 501
          ? 'Vawulence Legend'
          : points >= 201
          ? 'Street Governor'
          : points >= 76
          ? 'Chief Instigator'
          : points >= 21
          ? 'Gist Monger'
          : 'Lurker';
      return {
        rank: i + 1,
        id: u.id,
        name: u.name || u.username || 'Anonymous',
        totalPoints: points,
        badge,
        commentCount: Number(u.commentCount || 0),
        voteCount: Number(u.voteCount || 0),
      };
    });
}

async function trendingPosts() {
  const [posts, comments, reactions, tombstones] = await Promise.all([
    safeList('posts', 10000),
    safeList('comments', 1000),
    safeList('reactions', 1000),
    safeList('deleted_records', 10000),
  ]);
  const deleted = new Set(tombstones.map((x: any) => String(x.key)));
  const livePosts = posts.filter(
    (p: any) =>
      p.status !== 'deleted' &&
      p.isDeleted !== true &&
      !p.deletedAt &&
      !deleted.has(`posts:${p.id}`)
  );
  return livePosts
    .map((p: any) => {
      const rc = reactions.filter((r: any) => String(r.postId) === String(p.id)).length;
      const cc = comments.filter((c: any) => String(c.postId) === String(p.id) && c.voteCardId == null).length;
      const ageHours = Math.max(1, (Date.now() - new Date(p.createdAt || Date.now()).getTime()) / 3600000);
      const score = Math.round(((rc * 2 + cc * 3 + Number(p.viewCount || 0) * 0.05) / Math.pow(ageHours + 2, 0.65)) * 100);
      return { ...p, reactionCount: rc, commentCount: cc, score };
    })
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 20);
}

/* ==========================================================================
   API ENDPOINTS
   ========================================================================== */

// 1. Healthz
app.get('/api/healthz', (req, res) => {
  res.json({ ok: true, service: 'vcm' });
});

// 2. Member Register / Sign-in
app.post('/api/member/register', async (req, res) => {
  const username = String(req.body?.username || '').trim();
  if (!/^[A-Za-z0-9._-]{3,24}$/.test(username)) {
    return res.status(400).json({
      message: 'Username must be 3–24 characters using letters, numbers, dots, underscores or hyphens.',
    });
  }
  const key = username.toLowerCase();
  const rows = await safeList('users', 10000);
  const existing: any = rows.find(
    (u: any) =>
      String(u.usernameKey || u.username || '').toLowerCase() === key &&
      u.status !== 'deleted'
  );

  if (existing) {
    if (existing.isBanned === true) {
      return res.status(403).json({ message: 'This VCM member is banned.' });
    }
    if (!existing.memberToken) {
      return res.status(409).json({ message: 'This username is already registered. Choose another username.' });
    }
    const points = Number(existing.totalPoints || 0);
    const badge =
      points >= 501
        ? 'Vawulence Legend'
        : points >= 201
        ? 'Street Governor'
        : points >= 76
        ? 'Chief Instigator'
        : points >= 21
        ? 'Gist Monger'
        : 'Lurker';
    return res.json({
      ok: true,
      member: {
        id: existing.id,
        username: existing.username || username,
        memberToken: existing.memberToken,
        totalPoints: points,
        badge,
      },
    });
  }

  const token = `vcm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
  const [id] = await db.add('users', [
    {
      username,
      usernameKey: key,
      name: username,
      memberToken: token,
      totalPoints: 0,
      commentCount: 0,
      voteCount: 0,
      referralCount: 0,
      createdAt: new Date().toISOString(),
    },
  ]);

  if (!id) {
    return res.status(500).json({ message: 'Could not create your VCM membership.' });
  }

  return res.status(201).json({
    ok: true,
    member: {
      id,
      username,
      memberToken: token,
      totalPoints: 0,
      badge: 'Lurker',
    },
  });
});

// 3. Member Me
app.post('/api/member/me', async (req, res) => {
  const m: any = await memberFromBodyOrHeader(req);
  if (!m) {
    return res.status(401).json({ message: 'VCM member session not found.' });
  }
  const points = Number(m.totalPoints || 0);
  const badge =
    points >= 501
      ? 'Vawulence Legend'
      : points >= 201
      ? 'Street Governor'
      : points >= 76
      ? 'Chief Instigator'
      : points >= 21
      ? 'Gist Monger'
      : 'Lurker';
  return res.json({
    ok: true,
    member: {
      id: m.id,
      username: m.username || m.name || 'VCM Member',
      memberToken: m.memberToken,
      totalPoints: points,
      badge,
    },
  });
});

// Member profile endpoints
app.get('/api/member', async (req, res) => {
  const m = await memberFromBodyOrHeader(req);
  if (!m) {
    return res.json({ ok: false, username: null, memberId: null, name: 'VCM Member', isBanned: false });
  }
  res.json({
    ok: Boolean(m.username),
    username: m.username || null,
    memberId: m.id || null,
    name: m.name || m.username || 'VCM Member',
    isBanned: Boolean(m.isBanned),
  });
});

app.post('/api/member', async (req, res) => {
  const username = String(req.body?.username || '').trim().replace(/^@+/, '');
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ message: 'Username must be 3–20 characters using letters, numbers or underscores.' });
  }
  const m = await memberFromBodyOrHeader(req);
  if (!m) {
    return res.status(401).json({ message: 'VCM member session required.' });
  }
  const rows = await safeList('users', 10000);
  const taken = rows.find(
    (u: any) =>
      String(u.username || '').toLowerCase() === username.toLowerCase() &&
      String(u.id) !== String(m.id)
  );
  if (taken) {
    return res.status(409).json({ message: 'That username is already taken. Choose another one.' });
  }
  const updated = { ...m, username };
  await db.update('users', [{ id: m.id, record: updated }]);
  res.json({ ok: true, username, memberId: m.id, name: updated.name || username });
});

app.get('/api/me', async (req, res) => {
  const m = await memberFromBodyOrHeader(req);
  if (!m) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  const points = Number(m.totalPoints || 0);
  const badge =
    points >= 501
      ? 'Vawulence Legend'
      : points >= 201
      ? 'Street Governor'
      : points >= 76
      ? 'Chief Instigator'
      : points >= 21
      ? 'Gist Monger'
      : 'Lurker';
  res.json({ ...m, badge });
});

app.post('/api/me', async (req, res) => {
  const m = await memberFromBodyOrHeader(req);
  if (!m) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  res.json(m);
});

// 4. Posts
app.get('/api/posts', async (req, res) => {
  const [rows, tombstones] = await Promise.all([
    safeList('posts', 10000),
    safeList('deleted_records', 10000),
  ]);
  const deleted = new Set(tombstones.map((x: any) => String(x.key)));
  const live = rows.filter(
    (p: any) =>
      (!p.status || p.status === 'published') &&
      p.status !== 'deleted' &&
      p.isDeleted !== true &&
      !p.deletedAt &&
      !deleted.has(`posts:${p.id}`)
  );
  const normalized = await Promise.all(live.map(normalizeMediaRecord));
  res.json({ posts: normalized });
});

app.get('/api/posts/:id', async (req, res) => {
  const rows = await db.get('posts', [req.params.id]);
  const post = rows[0];
  if (!post || post.status === 'deleted') {
    return res.status(404).json({ message: 'Post not found' });
  }
  const reactions = await getReactions(req.params.id);
  const comments = await getComments(req.params.id);
  const norm = await normalizeMediaRecord(post);
  res.json({
    ...norm,
    reactions,
    comments,
    reactionCount: Object.values(reactions).reduce((a, b) => a + b, 0),
    commentCount: comments.length,
  });
});

app.get('/api/posts/:id/reactions', async (req, res) => {
  res.json(await getReactions(req.params.id));
});

app.post('/api/posts/:id/reactions', requireVcmMember, async (req, res) => {
  const { type } = req.body || {};
  if (!type || !['like', 'laugh', 'shock', 'angry'].includes(type)) {
    return res.status(400).json({ message: 'Invalid reaction' });
  }
  const user = (req as any).user;
  const rows = await safeList('reactions', 1000);
  const existing = rows.find(
    (r: any) =>
      String(r.postId) === req.params.id &&
      r.type === type &&
      String(r.userId || 'anonymous') === String(user.userId)
  );

  if (existing) {
    await db.delete('reactions', [existing.id]);
  } else {
    await db.add('reactions', [
      {
        postId: req.params.id,
        type,
        userId: user.userId,
        createdAt: new Date().toISOString(),
      },
    ]);
  }
  res.json(await getReactions(req.params.id));
});

app.get('/api/posts/:id/comments', async (req, res) => {
  res.json(await getComments(req.params.id));
});

app.post('/api/posts/:id/comments', requireVcmMember, async (req, res) => {
  const { content, parentCommentId } = req.body || {};
  const text = String(content || '').trim();
  if (!text) {
    return res.status(400).json({ message: 'Comment cannot be empty.' });
  }
  if (text.length > 1000) {
    return res.status(400).json({ message: 'Comment is too long.' });
  }
  const user = (req as any).user;
  const u = await ensureUser(user.userId, user.name, user.email);
  const [id] = await db.add('comments', [
    {
      postId: req.params.id,
      userId: user.userId,
      userName: user.name || u?.name || 'VCM Member',
      content: text,
      parentCommentId: parentCommentId || null,
      likeCount: 0,
      createdAt: new Date().toISOString(),
    },
  ]);

  if (u?.id) {
    const full = await db.get('users', [u.id]);
    const cur = full[0];
    if (cur) {
      await db.update('users', [
        {
          id: u.id,
          record: {
            ...cur,
            totalPoints: Number(cur.totalPoints || 0) + 1,
            commentCount: Number(cur.commentCount || 0) + 1,
          },
        },
      ]);
    }
  }
  res.status(201).json({ id });
});

// Comment Likes
app.post('/api/comments/:id/like', requireVcmMember, async (req, res) => {
  const comments = await safeList('comments', 1000);
  const c = comments.find((x: any) => String(x.id) === req.params.id);
  if (!c) {
    return res.status(404).json({ message: 'Comment not found.' });
  }
  const user = (req as any).user;
  const likes = await safeList('comment_likes', 1000);
  const existing = likes.find(
    (x: any) => String(x.commentId) === req.params.id && String(x.userId) === user.userId
  );

  if (existing) {
    await db.delete('comment_likes', [existing.id]);
    c.likeCount = Math.max(0, Number(c.likeCount || 0) - 1);
  } else {
    await db.add('comment_likes', [
      { commentId: req.params.id, userId: user.userId, createdAt: new Date().toISOString() },
    ]);
    c.likeCount = Number(c.likeCount || 0) + 1;
  }
  await db.update('comments', [{ id: c.id, record: c }]);
  res.json({ likeCount: c.likeCount });
});

// 5. Trending
app.get('/api/trending', async (req, res) => {
  res.json(await trendingPosts());
});

// 6. Breaking News & Categories
app.get('/api/breaking-news', async (req, res) => {
  const rows = await safeList('breaking_news', 10);
  res.json(rows[0] || { text: '', enabled: false });
});

app.get('/api/categories', async (req, res) => {
  res.json(await safeList('categories', 100));
});

// 7. Vote Cards (Polls)
app.get('/api/vote-cards', async (req, res) => {
  const cards = (await getVoteCards()).filter((c: any) => c.status !== 'deleted');
  const normalized = await Promise.all(cards.map(normalizeMediaRecord));
  res.json(normalized);
});

app.get('/api/vote-cards/:id', async (req, res) => {
  const rows = await db.get('vote_cards', [req.params.id]);
  const card = rows[0];
  if (!card || card.status === 'rejected') {
    return res.status(404).json({ message: 'Vote card not found.' });
  }
  const total =
    Number(card.option1Count || 0) +
    Number(card.option2Count || 0) +
    Number(card.option3Count || 0) +
    Number(card.option4Count || 0);

  let userVote: null | number = null;
  const voterToken = req.query.userId || req.body?.memberToken;
  if (voterToken) {
    const member = await findMemberByToken(String(voterToken));
    const voterId = member?.id || voterToken;
    const votes = await safeList('vote_card_votes', 1000);
    const v = votes.find(
      (x: any) => String(x.voteCardId) === String(card.id) && String(x.userId) === String(voterId)
    );
    if (v) userVote = Number(v.chosenOption) || null;
  }

  const norm = await normalizeMediaRecord({ ...card, totalVotes: total, userVote });
  res.json(norm);
});

app.get('/api/vote-cards/:id/comments', async (req, res) => {
  const rows = await safeList('comments', 1000);
  const all = rows.filter((c: any) => String(c.voteCardId) === String(req.params.id));
  const top = all.filter((c: any) => c.parentCommentId == null);
  res.json(
    top.map((c: any) => ({
      ...c,
      replies: all.filter((x: any) => String(x.parentCommentId) === String(c.id)),
    }))
  );
});

app.post('/api/vote-cards/:id/comments', requireVcmMember, async (req, res) => {
  const { content, parentCommentId } = req.body || {};
  const text = String(content || '').trim();
  if (!text) {
    return res.status(400).json({ message: 'Comment cannot be empty.' });
  }
  if (text.length > 1000) {
    return res.status(400).json({ message: 'Comment is too long.' });
  }
  const user = (req as any).user;
  const u = await ensureUser(user.userId, user.name, user.email);
  const createdAt = new Date().toISOString();
  const [id] = await db.add('comments', [
    {
      voteCardId: req.params.id,
      userId: user.userId,
      userName: user.name || u?.name || 'VCM Member',
      content: text,
      parentCommentId: parentCommentId ?? null,
      likeCount: 0,
      createdAt,
    },
  ]);
  if (!id) {
    return res.status(500).json({ message: 'Could not save comment.' });
  }
  if (u?.id) {
    const full = await db.get('users', [u.id]);
    const cur = full[0];
    if (cur) {
      await db.update('users', [
        {
          id: u.id,
          record: {
            ...cur,
            totalPoints: Number(cur.totalPoints || 0) + 1,
            commentCount: Number(cur.commentCount || 0) + 1,
          },
        },
      ]);
    }
  }
  res.status(201).json({
    id,
    userId: user.userId,
    userName: user.name || u?.name || 'VCM Member',
    content: text,
    parentCommentId: parentCommentId ?? null,
    likeCount: 0,
    createdAt,
  });
});

app.post('/api/vote-cards/:id/vote', requireVcmMember, async (req, res) => {
  const choice = Number(req.body?.chosenOption);
  if (![1, 2, 3, 4].includes(choice)) {
    return res.status(400).json({ message: 'Invalid vote.' });
  }
  const user = (req as any).user;
  const voterId = user.userId;
  const rows = await safeList('vote_cards', 100);
  const card = rows.find((c: any) => String(c.id) === req.params.id);
  if (!card) {
    return res.status(404).json({ message: 'Vote card not found.' });
  }
  if (card.isActive === false) {
    return res.status(409).json({ message: 'This vote card is closed.' });
  }
  if (choice >= 3 && !card[`option${choice}Label`]) {
    return res.status(400).json({ message: 'Option unavailable.' });
  }

  const votes = await safeList('vote_card_votes', 1000);
  if (votes.some((v: any) => String(v.voteCardId) === req.params.id && String(v.userId) === String(voterId))) {
    return res.status(409).json({ message: 'Already voted.' });
  }

  const [vid] = await db.add('vote_card_votes', [
    {
      voteCardId: req.params.id,
      userId: voterId,
      chosenOption: choice,
      createdAt: new Date().toISOString(),
    },
  ]);
  if (!vid) {
    return res.status(500).json({ message: 'Could not save vote.' });
  }

  const next = {
    ...card,
    [`option${choice}Count`]: Number(card[`option${choice}Count`] || 0) + 1,
  };
  await db.update('vote_cards', [{ id: card.id, record: next }]);

  // Increment voter points
  const u = await ensureUser(user.userId, user.name, user.email);
  if (u?.id) {
    const full = await db.get('users', [u.id]);
    const cur = full[0];
    if (cur) {
      await db.update('users', [
        {
          id: u.id,
          record: {
            ...cur,
            totalPoints: Number(cur.totalPoints || 0) + 1,
            voteCount: Number(cur.voteCount || 0) + 1,
          },
        },
      ]);
    }
  }

  const totalVotes =
    (next.option1Count || 0) +
    (next.option2Count || 0) +
    (next.option3Count || 0) +
    (next.option4Count || 0);

  res.json({
    ...next,
    totalVotes,
    userVote: choice,
  });
});

app.post('/api/vote-cards', (req, res) => {
  res.status(403).json({ message: 'Vote cards can only be created from the Admin Dashboard.' });
});

// 8. Anonymous Gists
app.post('/api/gists', async (req, res) => {
  const text = String(req.body?.text ?? req.body?.content ?? '').trim();
  if (!text) {
    return res.status(400).json({ message: 'Gist text is required' });
  }
  const createdAt = new Date().toISOString();
  const [id] = await db.add('gists', [
    {
      content: text,
      text,
      userId: null, // Genuinely anonymous!
      createdAt,
      publishedAt: null,
      status: 'pending',
    },
  ]);
  res.status(201).json({ id, content: text, text, createdAt, publishedAt: null });
});

app.get('/api/gists', async (req, res) => {
  const [items, tombstones] = await Promise.all([
    safeList('gists', 500),
    safeList('deleted_records', 1000),
  ]);
  const deleted = new Set(tombstones.map((x: any) => String(x.key)));
  const published = items.filter(
    (g: any) =>
      (g.status === 'published' || g.status === 'approved') &&
      !deleted.has(`gists:${g.id}`)
  );
  res.json({ items: published });
});

// 9. Marketplace
app.get('/api/marketplace', async (req, res) => {
  const [r, tombstones] = await Promise.all([
    safeList('marketplace_items', 500),
    safeList('deleted_records', 1000),
  ]);
  const deleted = new Set(tombstones.map((x: any) => String(x.key)));
  const items = r
    .filter((i: any) => i.status === 'available' && !deleted.has(`marketplace_items:${i.id}`))
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .map((i: any) => {
      // Seller WhatsApp is strictly omitted from public response for privacy
      const { sellerWhatsapp, submittedByEmail, ...pub } = i;
      return {
        ...pub,
        price: Number(i.price || 0),
        createdAt: i.createdAt ? new Date(i.createdAt).toISOString() : null,
      };
    });
  const normalized = await Promise.all(items.map(normalizeMediaRecord));
  res.json(normalized);
});

app.get('/api/marketplace/:id', async (req, res) => {
  const [rows, tombstones] = await Promise.all([
    db.get('marketplace_items', [req.params.id]),
    safeList('deleted_records', 1000),
  ]);
  const i = rows[0];
  if (!i || i.status !== 'available' || tombstones.some((x: any) => String(x.key) === `marketplace_items:${req.params.id}`)) {
    return res.status(404).json({ message: 'Not found' });
  }
  const { submittedByEmail, sellerWhatsapp, ...pub } = i;
  const norm = await normalizeMediaRecord(pub);
  res.json({
    ...norm,
    price: Number(i.price || 0),
    createdAt: i.createdAt ? new Date(i.createdAt).toISOString() : null,
  });
});

app.post('/api/marketplace', requireVcmMember, async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.description || !b.price) {
    return res.status(400).json({ message: 'name, description, price required' });
  }
  const user = (req as any).user;
  const [id] = await db.add('marketplace_items', [
    {
      name: String(b.name).trim(),
      description: String(b.description).trim(),
      price: Number(b.price),
      imageUrls: Array.isArray(b.imageUrls) ? b.imageUrls : b.imageUrl ? [b.imageUrl] : [],
      category: b.category || 'General',
      status: 'pending',
      submittedByName: user.name || b.submittedByName || null,
      submittedByEmail: user.email || null,
      submittedByUserId: user.userId,
      howLongUsed: b.howLongUsed || null,
      location: b.location || null,
      lastPrice: b.lastPrice || null,
      reasonForSale: b.reasonForSale || null,
      sellerWhatsapp: b.sellerWhatsapp || null,
      createdAt: new Date().toISOString(),
    },
  ]);
  if (!id) {
    return res.status(500).json({ message: 'Failed to submit listing' });
  }
  res.status(201).json({ id, status: 'pending' });
});

// 10. Events
app.get('/api/events', async (req, res) => {
  const status = req.query.status || 'upcoming';
  const [r, tombstones] = await Promise.all([
    safeList('events', 1000),
    safeList('deleted_records', 10000),
  ]);
  const deleted = new Set(tombstones.map((x: any) => String(x.key)));
  const live = r.filter(
    (e: any) =>
      e.status !== 'deleted' &&
      e.isDeleted !== true &&
      !e.deletedAt &&
      !deleted.has(`events:${e.id}`)
  );
  const now = Date.now();
  const events = live
    .map((e: any) => {
      const d = new Date(e.eventDate).getTime();
      return {
        ...e,
        eventDate: new Date(e.eventDate).toISOString(),
        createdAt: e.createdAt ? new Date(e.createdAt).toISOString() : null,
        status: d >= now ? 'upcoming' : 'past',
      };
    })
    .filter((e: any) => status === 'all' || e.status === status)
    .sort((a: any, b: any) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());

  const normalized = await Promise.all(events.map(normalizeMediaRecord));
  res.json(normalized);
});

app.get('/api/events/:id', async (req, res) => {
  const [rows, tombstones] = await Promise.all([
    db.get('events', [req.params.id]),
    safeList('deleted_records', 10000),
  ]);
  const event = rows[0];
  if (!event || event.status === 'deleted' || tombstones.some((x: any) => String(x.key) === `events:${req.params.id}`)) {
    return res.status(404).json({ message: 'Event not found' });
  }
  const tickets = await safeList('tickets', 500);
  const sold = tickets.filter((t: any) => String(t.eventId) === req.params.id).length;
  const d = new Date(event.eventDate).getTime();
  const norm = await normalizeMediaRecord({
    ...event,
    eventDate: new Date(event.eventDate).toISOString(),
    createdAt: event.createdAt ? new Date(event.createdAt).toISOString() : null,
    status: d >= Date.now() ? 'upcoming' : 'past',
    ticketsSold: sold,
  });
  res.json(norm);
});

// 11. Contests
app.get('/api/contests', async (req, res) => {
  const r = await safeList('contests', 100);
  const now = Date.now();
  const contests = r
    .filter((c: any) => c.status !== 'deleted')
    .map((c: any) => {
      const closesAt = c.closesAt ? new Date(c.closesAt).toISOString() : null;
      const maxEntrants = Number(c.maxEntrants || 0);
      const currentEntrants = Number(c.currentEntrants || 0);
      const spotsRemaining = Math.max(0, maxEntrants - currentEntrants);
      const closedByDate = closesAt ? new Date(closesAt).getTime() <= now : false;
      return {
        ...c,
        entryFee: Number(c.entryFee || 0),
        maxEntrants,
        currentEntrants,
        spotsRemaining,
        status: c.status === 'closed' || closedByDate || spotsRemaining <= 0 ? 'closed' : 'open',
        closesAt,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
      };
    })
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const normalized = await Promise.all(contests.map(normalizeMediaRecord));
  res.json(normalized);
});

app.post('/api/contests/:id/verify-entry-payment', (req, res) => {
  res.status(503).json({ message: 'Contest payments are temporarily unavailable during migration.' });
});

// 12. Connections
app.get('/api/connections', async (req, res) => {
  const [r, tombstones] = await Promise.all([
    safeList('connections', 500),
    safeList('deleted_records', 1000),
  ]);
  const deleted = new Set(tombstones.map((x: any) => String(x.key)));
  const approved = r
    .filter((c: any) => c.status === 'approved' && !deleted.has(`connections:${c.id}`))
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .map((c: any) => {
      // WhatsApp is kept private from public view
      const { whatsappNumber, ...pub } = c;
      return pub;
    });
  const normalized = await Promise.all(approved.map(normalizeMediaRecord));
  res.json(normalized);
});

app.post('/api/connections', requireVcmMember, async (req, res) => {
  const b = req.body || {};
  const required = ['name', 'ageBracket', 'state', 'lookingFor', 'bioText', 'whatsappNumber', 'photoUrl', 'gender', 'lookingForAge', 'preferredLocation'];
  if (required.some((k) => !String(b[k] || '').trim())) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (b.consentGiven !== true) {
    return res.status(400).json({ message: 'Consent required' });
  }
  const user = (req as any).user;
  const [id] = await db.add('connections', [
    {
      userId: user.userId,
      name: String(b.name).trim(),
      ageBracket: String(b.ageBracket),
      gender: String(b.gender),
      state: String(b.state),
      photoUrl: String(b.photoUrl).trim(),
      lookingFor: String(b.lookingFor),
      lookingForAge: String(b.lookingForAge),
      preferredLocation: String(b.preferredLocation),
      whatsappNumber: String(b.whatsappNumber).trim(),
      bioText: String(b.bioText).trim(),
      consentGiven: true,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ]);
  if (!id) {
    return res.status(500).json({ message: 'Could not submit profile' });
  }
  res.status(201).json({ id, status: 'pending' });
});

// 13. Chat
app.get('/api/chat', async (req, res) => {
  const r = await safeList('chat_messages', 200);
  const sorted = r
    .sort((a: any, b: any) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    .map((m: any) => ({
      id: m.id,
      name: m.name || 'Anonymous',
      message: m.message || m.content || '',
      createdAt: m.createdAt || null,
    }));
  res.json(sorted);
});

app.post('/api/chat', requireVcmMember, async (req, res) => {
  const b = req.body || {};
  const user = (req as any).user;
  const name = String(b.name || user.name || 'Anonymous').trim().slice(0, 60);
  const message = String(b.message || '').trim();
  if (!message) {
    return res.status(400).json({ message: 'Message cannot be empty.' });
  }
  if (message.length > 500) {
    return res.status(400).json({ message: 'Message is too long.' });
  }
  const createdAt = new Date().toISOString();
  const [id] = await db.add('chat_messages', [
    {
      name: user.name || name || 'VCM Member',
      userId: user.userId,
      message,
      createdAt,
    },
  ]);
  if (!id) {
    return res.status(500).json({ message: 'Could not save message.' });
  }
  res.status(201).json({ id, name, message, createdAt });
});

// 14. Report Case
app.get('/api/report-cases', async (req, res) => {
  const cases = await safeList('report_cases', 100);
  const approved = cases.filter((c: any) => c.status === 'approved' || c.status === 'resolved');
  res.json(approved);
});

app.post('/api/report-cases', async (req, res) => {
  const { caseText, imageUrls } = req.body || {};
  const text = String(caseText || '').trim();
  if (!text) {
    return res.status(400).json({ message: 'Case description is required.' });
  }
  const urls = Array.isArray(imageUrls) ? imageUrls : [];
  const [id] = await db.add('report_cases', [
    {
      caseText: text,
      imageUrls: urls,
      status: 'pending',
      createdAt: new Date().toISOString(),
    },
  ]);
  res.status(201).json({ id, status: 'pending' });
});

// 15. Recruitment
app.get('/api/recruitment', async (req, res) => {
  const jobs = await safeList('job_postings', 100);
  const published = jobs.filter((j: any) => j.status === 'published' || !j.status);
  const normalized = await Promise.all(published.map(normalizeMediaRecord));
  res.json(normalized);
});

// 16. Leaderboard
app.get('/api/leaderboard', async (req, res) => {
  res.json(await getLeaderboard());
});

// 17. Subscriptions
app.get('/api/subscription-plans', async (req, res) => {
  const r = await safeList('subscription_plans', 20);
  res.json(
    r.length
      ? r
      : [
          { id: 'monthly', name: 'VCM Monthly', durationDays: 30, price: 1500 },
          { id: 'quarterly', name: 'VCM 90 Days', durationDays: 90, price: 3500 },
        ]
  );
});

app.get('/api/subscription-status', async (req, res) => {
  const m = await memberFromBodyOrHeader(req);
  if (!m) {
    return res.json({ isSubscriber: false, subscriptionExpiresAt: null });
  }
  const isSubscriber = Boolean(
    m.subscriptionExpiresAt && new Date(m.subscriptionExpiresAt).getTime() > Date.now()
  );
  res.json({ isSubscriber, subscriptionExpiresAt: m.subscriptionExpiresAt || null });
});

app.post('/api/subscriptions/verify-payment', (req, res) => {
  res.status(503).json({ message: 'Subscription payments are temporarily unavailable during migration.' });
});

// 18. Topics / Notifications
app.get('/api/topics', async (req, res) => {
  res.json({ topics: ['breaking-news', 'events', 'contests', 'community'] });
});

app.post('/api/topics/:topic/subscribe', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/topics/:topic/unsubscribe', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/notify-self', (req, res) => {
  res.json({ ok: true });
});

// 19. Visits
app.post('/api/visits', async (req, res) => {
  try {
    await db.add('site_visits', [{ timestamp: new Date().toISOString() }]);
    res.status(201).json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// 20. Media Upload & Serving
app.post('/api/storage/upload', async (req, res) => {
  const { content, contentType = 'image/jpeg', filename = 'upload', folder = 'general' } = req.body || {};
  const allowed = ['posts', 'ads', 'marketplace', 'profiles', 'events', 'contests', 'report-cases', 'polls'];
  if (!allowed.includes(folder.toLowerCase())) {
    return res.status(400).json({ message: 'Invalid storage folder' });
  }
  const base64 = String(content || '').replace(/^data:[^;]+;base64,/, '');
  if (!base64) {
    return res.status(400).json({ message: 'Upload content is required.' });
  }
  const cleanName = filename.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').slice(0, 80) || 'upload';
  const filePath = `vcm/${folder.toLowerCase()}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;

  const [saved] = await storage.write([{ path: filePath, content: base64, contentType }]);
  if (!saved) {
    return res.status(500).json({ message: 'Upload failed. Please try again.' });
  }

  const token = mediaToken(filePath);
  const url = `/api/media/${token}`;
  res.status(201).json({
    path: filePath,
    url,
    objectPath: filePath,
  });
});

app.get('/api/media/:token', (req, res) => {
  const pathStr = mediaPath(req.params.token);
  if (!pathStr || !pathStr.startsWith('vcm/')) {
    return res.status(404).send('Media not found.');
  }
  const file = storage.getFile(pathStr);
  if (!file) {
    return res.status(404).send('Media not found.');
  }
  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(file.buffer);
});

// 21. Admin Endpoints
app.post('/api/admin/verify', (req, res) => {
  const { password } = req.body || {};
  res.json(verifyAdminPassword(password));
});

app.post('/api/admin/overview', async (req, res) => {
  const { password } = req.body || {};
  const verified = verifyAdminPassword(password);
  if (!verified.ok) {
    return res.status(401).json({ message: verified.message });
  }

  const tombstones = await safeList('deleted_records', 10000);
  const deletedKeys = new Set(tombstones.map((x: any) => String(x.key)));

  const [
    allPosts,
    gists,
    polls,
    events,
    contests,
    allMarketplace,
    connections,
    recruitment,
    cases,
    chat,
    users,
    reactions,
    comments,
    commentLikes,
    visits,
  ] = await Promise.all([
    safeList('posts', 10000),
    safeList('gists'),
    safeList('vote_cards'),
    safeList('events'),
    safeList('contests'),
    safeList('marketplace_items'),
    safeList('connections'),
    safeList('job_postings'),
    safeList('report_cases'),
    safeList('chat_messages'),
    safeList('users'),
    safeList('reactions'),
    safeList('comments'),
    safeList('comment_likes'),
    safeList('site_visits'),
  ]);

  const posts = allPosts.filter((x: any) => x.status !== 'deleted' && !deletedKeys.has(`posts:${x.id}`));
  const marketplace = allMarketplace.filter((x: any) => x.status !== 'deleted' && !deletedKeys.has(`marketplace_items:${x.id}`));

  const stats = {
    totalVisitors: visits.length,
    registeredUsers: users.length,
    totalPosts: posts.length,
    totalGistsPublished: gists.filter((g: any) => g.status === 'approved' || g.status === 'published').length,
    totalComments: comments.length,
    pendingGists: gists.filter((g: any) => g.status === 'pending').length,
    totalVoteCards: polls.length,
    totalLikes: reactions.length + commentLikes.length,
    posts: posts.length,
    gists: gists.length,
    polls: polls.length,
    events: events.length,
    contests: contests.length,
    marketplace: marketplace.length,
    connections: connections.length,
    recruitment: recruitment.length,
    reportCases: cases.length,
    chat: chat.length,
  };

  const recentPosts = posts
    .slice()
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 20);

  const recentMarketplace = marketplace
    .slice()
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 50);

  const recentUsers = users
    .slice()
    .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 50);

  res.json({ ok: true, stats, recentPosts, recentMarketplace, recentUsers });
});

app.post('/api/admin/notify', async (req, res) => {
  const { password, title, body } = req.body || {};
  const verified = verifyAdminPassword(password);
  if (!verified.ok) {
    return res.status(401).json({ message: verified.message });
  }
  if (!body) {
    return res.status(400).json({ message: 'Notification message is required.' });
  }
  const users = await safeList('users', 1000);
  res.json({ ok: true, sent: users.length, failed: 0 });
});

app.post('/api/admin/manage', async (req, res) => {
  const b = req.body || {};
  const verified = verifyAdminPassword(b.password);
  if (!verified.ok) {
    return res.status(401).json({ message: verified.message });
  }

  const allowed = [
    'posts',
    'gists',
    'vote_cards',
    'events',
    'contests',
    'marketplace_items',
    'connections',
    'job_postings',
    'report_cases',
    'users',
    'chat_messages',
    'tickets',
    'transactions',
    'subscription_plans',
    'escrow_requests',
  ];

  if (!allowed.includes(b.table)) {
    return res.status(400).json({ message: 'Invalid table' });
  }

  // 1. List
  if (b.action === 'list') {
    const tombstones = await safeList('deleted_records', 10000);
    const deletedKeys = new Set(tombstones.map((x: any) => String(x.key)));
    const all = await safeList(b.table, 500);
    const filtered = all.filter((x: any) => x.status !== 'deleted' && !deletedKeys.has(`${b.table}:${x.id}`));
    const items = await Promise.all(filtered.map(normalizeMediaRecord));
    return res.json({ ok: true, items });
  }

  // 2. Create
  if (b.action === 'create') {
    if (!b.record) return res.status(400).json({ message: 'Record is required' });
    if (b.table === 'posts' && (!b.record.title || !b.record.content)) {
      return res.status(400).json({ message: 'Post title and content are required.' });
    }
    const [id] = await db.add(b.table, [b.record]);
    if (!id) return res.status(500).json({ message: 'Could not create record.' });
    return res.status(201).json({ ok: true, id });
  }

  // 3. Set Breaking News
  if (b.action === 'setBreaking') {
    const rows = await safeList('breaking_news', 10);
    const record = {
      text: String(b.record?.text || ''),
      enabled: Boolean(b.record?.enabled),
      updatedAt: new Date().toISOString(),
    };
    if (rows[0]) {
      await db.update('breaking_news', [{ id: rows[0].id, record: { ...rows[0], ...record } }]);
    } else {
      await db.add('breaking_news', [record]);
    }
    return res.json({ ok: true });
  }

  // 4. Categories
  if (b.action === 'createCategory') {
    const name = String(b.record?.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const [id] = await db.add('categories', [{ name, createdAt: new Date().toISOString() }]);
    return res.status(201).json({ ok: true, id });
  }

  if (b.action === 'deleteCategory') {
    if (!b.id) return res.status(400).json({ message: 'Category id is required' });
    await db.delete('categories', [String(b.id)]);
    return res.json({ ok: true });
  }

  if (!b.id) {
    return res.status(400).json({ message: 'Record id is required' });
  }

  const rows = await db.get(b.table, [String(b.id)]);
  const row = rows[0];

  if (!row) {
    if (b.action === 'delete' && (await isDeletedTombstone(b.table, String(b.id)))) {
      return res.json({ ok: true, id: String(b.id), deleted: true, hardDeleted: true, hidden: true, alreadyDeleted: true });
    }
    return res.status(404).json({ message: 'Record not found' });
  }

  // 5. Approve
  if (b.action === 'approve') {
    const status =
      b.table === 'posts' || b.table === 'gists'
        ? 'published'
        : b.table === 'vote_cards'
        ? 'active'
        : b.table === 'contests'
        ? 'open'
        : b.table === 'marketplace_items'
        ? 'available'
        : 'approved';

    const record = {
      ...row,
      status,
      isActive: b.table === 'vote_cards' ? true : row.isActive,
      ...(b.table === 'gists' ? { publishedAt: new Date().toISOString() } : {}),
    };

    await db.update(b.table, [{ id: String(b.id), record }]);
    return res.json({ ok: true, id: String(b.id), status });
  }

  // 6. Reject
  if (b.action === 'reject') {
    await db.update(b.table, [{ id: String(b.id), record: { ...row, status: 'rejected', isActive: false } }]);
    return res.json({ ok: true, id: String(b.id), status: 'rejected' });
  }

  // 7. Mark Sold
  if (b.action === 'markSold') {
    if (b.table !== 'marketplace_items') return res.status(400).json({ message: 'markSold is only for marketplace items.' });
    await db.update(b.table, [{ id: row.id, record: { ...row, status: 'sold' } }]);
    return res.json({ ok: true });
  }

  // 8. Ban / Unban User
  if (b.action === 'ban' || b.action === 'unban') {
    if (b.table !== 'users') return res.status(400).json({ message: 'Ban actions are only for users.' });
    await db.update(b.table, [{ id: row.id, record: { ...row, isBanned: b.action === 'ban' } }]);
    return res.json({ ok: true });
  }

  // 9. Open / Close Contest
  if (b.action === 'open' || b.action === 'close') {
    if (b.table !== 'contests') return res.status(400).json({ message: 'Open/close is only for contests.' });
    await db.update(b.table, [{ id: row.id, record: { ...row, status: b.action === 'open' ? 'open' : 'closed' } }]);
    return res.json({ ok: true });
  }

  // 10. Voters
  if (b.action === 'voters') {
    const votes = await safeList('vote_card_votes', 1000);
    const users = await safeList('users', 1000);
    const items = votes
      .filter((v: any) => String(v.voteCardId) === String(row.id))
      .map((v: any) => {
        const u = users.find((x: any) => String(x.id) === String(v.userId) || String(x.authUserId) === String(v.userId));
        return { ...v, userName: u?.name || u?.username || u?.email || v.userId || 'Anonymous' };
      });
    return res.json({ ok: true, items });
  }

  // 11. Tickets
  if (b.action === 'tickets') {
    const tickets = await safeList('tickets', 1000);
    const users = await safeList('users', 1000);
    const items = tickets
      .filter((t: any) => String(t.eventId) === String(row.id))
      .map((t: any) => {
        const u = users.find((x: any) => String(x.id) === String(t.userId) || String(x.authUserId) === String(t.userId));
        return { ...t, userName: u?.name || u?.email || t.userId || 'Ticket holder' };
      });
    return res.json({ ok: true, items });
  }

  // 12. Resolve Report Case
  if (b.action === 'resolve') {
    await db.update('report_cases', [
      { id: row.id, record: { ...row, status: 'resolved', resolvedAt: new Date().toISOString() } },
    ]);
    return res.json({ ok: true });
  }

  // 13. Delete
  if (b.action === 'delete') {
    const id = String(b.id);
    await addDeletedTombstone(b.table, id);
    await db.update(b.table, [
      { id, record: { ...row, status: 'deleted', isDeleted: true, deletedAt: new Date().toISOString() } },
    ]);
    await db.delete(b.table, [id]);
    return res.json({ ok: true, id, deleted: true, hardDeleted: true, hidden: true });
  }

  // 14. Update
  if (b.action === 'update') {
    const record = { ...row, ...(b.record || {}) };
    delete record.id;
    await db.update(b.table, [{ id: row.id, record }]);
    return res.json({ ok: true });
  }

  res.status(400).json({ message: 'Unknown admin action' });
});

export default app;
