# Vawulence City Media (VCM)

> **Entertainment Without Border** — Nigerian community media, entertainment, stories, anonymous gists, polls, marketplace, connections, events, and opportunities.

---

## 🚀 Architecture Overview

Vawulence City Media is built as a production-grade full-stack application designed to run seamlessly in local development, on persistent Node.js servers, and on **Vercel Serverless / GitHub**:

- **Frontend**: React 19 SPA powered by Vite and TypeScript, featuring responsive desktop & mobile navigation, drawer menus, media upload compression, and interactive community modules.
- **Backend**: Express-based modular API providing full REST contracts:
  - In local / Docker development: runs via `server.ts` on port 3000 with Vite SPA middlewares.
  - On Vercel: served through `api/index.ts` serverless functions via `vercel.json` rewrites.
- **Database Layer**: Built-in self-contained SQLite and file storage (`server/db.ts`), requiring zero external database or configuration. Persists cleanly to `data/vcm.sqlite` (or `/tmp/vcm.sqlite` in serverless).
- **Media Storage**: Durable token-based media storage (`server/storage.ts`) providing `/api/media/:token` endpoints that stream images directly with proper MIME types and immutable caching headers.
- **Automated Seeding**: Initial community content (stories, polls, gists, events, marketplace products, connections) automatically seeds on fresh setup.

---

## 🛠️ Features Included

1. **Homepage & Feed**:
   - Hero flyer masthead with collapsible compact header on scroll.
   - Live category tabs: News, Entertainment, Sports, Politics, Campus, Vawulence.
   - Breaking news banner.
   - Trending feed with engagement algorithm.
2. **Story Details & Reactions**:
   - Rich article viewer with video embeds and responsive media.
   - Reaction bar (`like`, `laugh`, `shock`, `angry`).
   - Threaded comments with nested replies and comment likes.
   - WhatsApp share button with pre-formatted message text.
3. **Anonymous Gists**:
   - 100% anonymous street story submissions (no user identity attached).
   - Admin moderation queue: review, publish, reject, or delete.
   - Public feed of published gists with batch publication notices.
4. **Polls & Vote Cards**:
   - Multi-option live vote cards with visual percentage bars.
   - One-vote-per-member enforcement with persistent recognition.
   - Threaded vote card discussion board.
   - Admin-only vote card creator and voter audit log.
5. **Community Marketplace**:
   - Categorized listings (Electronics, Cars, General) with image gallery and pricing in Naira.
   - Member listing submission with admin approval workflow.
   - Private seller WhatsApp contact hidden from public view and visible only to verified administrators.
6. **Connections (Community Dating / Networking)**:
   - Browse approved profiles with age, gender, state, and relationship preference filters.
   - Detailed profile submission form with photo upload and 18+ consent verification.
   - Contact request routing via WhatsApp admin.
7. **Events Hub**:
   - Upcoming and past events calendar with venue, time, and ticket tags.
   - Free event pass and paid event WhatsApp ticketing workflow.
   - Admin ticket inspection and check-in status toggles.
8. **Recruitment & Opportunities**:
   - Job listings with company names, requirements, and flyer images.
   - Direct application via WhatsApp or office address.
9. **Community Chat Room**:
   - Real-time community discussion stream.
10. **Report a Case**:
    - Anonymous dispute and incident reporting with evidence image attachments.
11. **Leaderboard & Badges**:
    - Gamified Vawulence point system (Lurker, Gist Monger, Chief Instigator, Street Governor, Vawulence Legend).
12. **Admin Dashboard**:
    - Server-side password-authenticated dashboard (`ADMIN_PASSWORD`).
    - Platform overview with live counters, recent posts, users, and marketplace items.
    - Full CRUD management across all platform collections.

---

## 📦 Getting Started Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration works immediately without external services:
- `ADMIN_PASSWORD`: defaults to `admin123`
- `VITE_ADMIN_WA`: defaults to `2348030430681`
- `PORT`: `3000`

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 🌐 Deploying to GitHub and Vercel

### Step 1: Push to GitHub
1. Initialize Git (if not already initialized) and commit:
   ```bash
   git init
   git add .
   git commit -m "feat: complete Vawulence City Media restoration for Vercel"
   ```
2. Create a repository on GitHub (e.g. `vawulence-city-media`).
3. Link and push your code:
   ```bash
   git remote add origin https://github.com/<your-username>/vawulence-city-media.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Log in to [vercel.com](https://vercel.com) and click **"Add New..." → "Project"**.
2. Select your GitHub repository (`vawulence-city-media`).
3. In **Build and Output Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `VITE_ADMIN_WA`: Your official WhatsApp phone number (`2348030430681`)
   - `ADMIN_PASSWORD` *(Optional)*: `admin`
5. Click **Deploy**. (Zero database setup required; all data is managed automatically).

---

## 🔐 Security Best Practices
- Never commit `.env` or database passwords to GitHub (already enforced in `.gitignore`).
- Admin endpoints (`/api/admin/*`) require server-side password verification.
- Sensitive user information (such as seller WhatsApp numbers and report evidence submitters) are stripped on public API routes.
