import { Router } from "express";
import { db } from "@workspace/db";
import {
  postsTable,
  gistsTable,
  voteCardsTable,
  marketplaceItemsTable,
  eventsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const VCM_DOMAIN = process.env.VCM_BASE_URL ?? "https://vawulencecitymedia.com";

const FALLBACK_IMG = `${VCM_DOMAIN}/opengraph.jpg`;
const SITE_NAME = "Vawulence City Media";
const TAGLINE = "Entertainment Without Border.";

function ogHtml(opts: {
  title: string;
  description: string;
  image: string;
  url: string;
  redirectTo: string;
}): string {
  const { title, description, image, url, redirectTo } = opts;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)} | ${SITE_NAME}</title>
<meta property="og:site_name" content="${esc(SITE_NAME)}"/>
<meta property="og:type" content="article"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:image" content="${esc(image)}"/>
<meta property="og:url" content="${esc(url)}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(description)}"/>
<meta name="twitter:image" content="${esc(image)}"/>
<meta http-equiv="refresh" content="0;url=${esc(redirectTo)}"/>
</head>
<body>
<p>Redirecting… <a href="${esc(redirectTo)}">Click here if not redirected</a></p>
<script>window.location.replace(${JSON.stringify(redirectTo)});</script>
</body>
</html>`;
}

// /api/og/post/:id
router.get("/og/post/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(404).send("Not found"); return; }
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
  if (!post) { res.redirect(`${VCM_DOMAIN}/post/${id}`); return; }
  const desc = post.excerpt ?? post.content.slice(0, 160).replace(/\s+/g, " ").trim();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(ogHtml({
    title: post.title,
    description: `${desc} — ${TAGLINE}`,
    image: post.imageUrl ?? FALLBACK_IMG,
    url: `${VCM_DOMAIN}/api/og/post/${id}`,
    redirectTo: `${VCM_DOMAIN}/post/${id}`,
  }));
});

// /api/og/gist/:id
router.get("/og/gist/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(404).send("Not found"); return; }
  const [gist] = await db.select().from(gistsTable).where(eq(gistsTable.id, id)).limit(1);
  if (!gist) { res.redirect(`${VCM_DOMAIN}/gists`); return; }
  const preview = gist.content.slice(0, 160).replace(/\s+/g, " ").trim();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(ogHtml({
    title: "Gist Drop 🔥",
    description: `"${preview}…" — ${TAGLINE}`,
    image: FALLBACK_IMG,
    url: `${VCM_DOMAIN}/api/og/gist/${id}`,
    redirectTo: `${VCM_DOMAIN}/gists`,
  }));
});

// /api/og/vote/:id
router.get("/og/vote/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(404).send("Not found"); return; }
  const [card] = await db.select().from(voteCardsTable).where(eq(voteCardsTable.id, id)).limit(1);
  if (!card) { res.redirect(`${VCM_DOMAIN}/vote-cards`); return; }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(ogHtml({
    title: card.title,
    description: `Cast your vote on VCM! ${card.option1Label} vs ${card.option2Label}${card.option3Label ? ` vs ${card.option3Label}` : ""} — ${TAGLINE}`,
    image: card.imageUrl ?? FALLBACK_IMG,
    url: `${VCM_DOMAIN}/api/og/vote/${id}`,
    redirectTo: `${VCM_DOMAIN}/vote-cards/${id}`,
  }));
});

// /api/og/market/:id
router.get("/og/market/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(404).send("Not found"); return; }
  const [item] = await db.select().from(marketplaceItemsTable).where(eq(marketplaceItemsTable.id, id)).limit(1);
  if (!item) { res.redirect(`${VCM_DOMAIN}/marketplace`); return; }
  const img = Array.isArray(item.imageUrls) && item.imageUrls.length ? item.imageUrls[0] : FALLBACK_IMG;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(ogHtml({
    title: `${item.name} — ₦${(item.price / 100).toLocaleString("en-NG")}`,
    description: `${item.description.slice(0, 140)} — Available on VCM Marketplace`,
    image: img,
    url: `${VCM_DOMAIN}/api/og/market/${id}`,
    redirectTo: `${VCM_DOMAIN}/marketplace/${id}`,
  }));
});

// /api/og/event/:id
router.get("/og/event/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(404).send("Not found"); return; }
  const [ev] = await db.select().from(eventsTable).where(eq(eventsTable.id, id)).limit(1);
  if (!ev) { res.redirect(`${VCM_DOMAIN}/events`); return; }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(ogHtml({
    title: ev.title,
    description: `${ev.description.slice(0, 140)} — ${ev.venue} | VCM Events`,
    image: ev.imageUrl ?? FALLBACK_IMG,
    url: `${VCM_DOMAIN}/api/og/event/${id}`,
    redirectTo: `${VCM_DOMAIN}/events/${id}`,
  }));
});

export default router;
