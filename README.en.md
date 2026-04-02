# Mid-Level Fullstack Challenge — Solution

Solution for [Red-Valley/mid-fullstack-challenge](https://github.com/Red-Valley/mid-fullstack-challenge): a **Kanban-style task board** with a **REST API**, **SQLite**, and a **Next.js (App Router)** UI styled with **Tailwind CSS**. Input is validated with **Zod**; responses use a single JSON shape for success and errors.

**Runtime:** [Bun](https://bun.sh) (per the brief) or **Node.js ≥ 22.5** (required for [`node:sqlite`](https://nodejs.org/api/sqlite.html)). The same codebase runs with `bun` or `npm`.

*[Versión en español →](./README.md)*

---

## Quick start

Copy `.env.example` to `.env.local` and set **`AUTH_SECRET`** (e.g. `openssl rand -base64 32`). Auth.js requires it for sign-in and production builds.

```bash
# Install dependencies (use one package manager consistently)
bun install
# or: npm install

# Sample board + demo users (see below)
bun run seed
# or: npm run seed

# Dev server
bun run dev
# or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you are sent to **/login** if not signed in. After seeding, demo users:

| Email | Role | Password |
| ----- | ---- | -------- |
| `pm@example.com` | PM | `password123` |
| `dev@example.com` | DEVELOPER | `password123` |

**PM** can create boards (`/create-board`), columns, tasks, assignees, and delete tasks. **DEVELOPER** can move tasks (drag-and-drop / status) and add comments; “New board” and task delete are hidden and API blocks those actions.

### Node version (npm / no Bun)

If you use **nvm** (e.g. nvm-windows), the repo includes `.nvmrc` (`22`):

```bash
nvm install 22
nvm use 22
node -v   # should be v22.x (≥ 22.5)
```

---

## What’s included

| Area | Notes |
| ---- | ----- |
| **Boards & columns** | Create boards; add columns with display order (unique per board). |
| **Tasks** | Create, update (including move to another column on the **same** board), delete. |
| **API** | All required routes; validation; HTTP 400 / 404 / 409 where appropriate; consistent JSON envelope. |
| **UI** | Board list, Kanban columns, **modal** for new tasks, **dropdown** to move tasks, **drag-and-drop** between columns (extra), loading and empty states. |
| **Data** | SQLite file `data/app.db` (created on first use; **gitignored**). |
| **Seed** | `scripts/seed.ts` — one sample board with columns and tasks. |

### Optional fields (beyond the minimum brief)

Tasks also support **`taskType`** (`bug` \| `story` \| `task`), **`assigneeName`** (shown as initials on cards), and the UI includes priority badges and a light “enterprise” layout. The minimum schema required by the challenge (name/creation date, columns, task title/description/priority/creation date) is fully satisfied.

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `bun run dev` / `npm run dev` | Next.js dev server (Turbopack) |
| `bun run build` / `npm run build` | Production build |
| `bun run start` / `npm start` | Run production build |
| `bun run seed` / `npm run seed` | Seed **Sample board** (idempotent: replaces an existing board with the same name) |
| `bun run lint` / `npm run lint` | ESLint |

---

## API overview

All JSON responses follow:

- **Success:** `{ "ok": true, "data": … }`
- **Error:** `{ "ok": false, "error": { "code", "message", "details?" } }`

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/boards` | List boards |
| `POST` | `/api/boards` | Body: `{ "name" }` |
| `GET` | `/api/boards/:id` | Board with columns and nested tasks |
| `POST` | `/api/columns` | Body: `{ "boardId", "name", "displayOrder" }` |
| `POST` | `/api/tasks` | Body: `{ "columnId", "title", "description?", "priority?", "taskType?", "assigneeName?" }` |
| `PATCH` | `/api/tasks/:id` | Partial update: `title`, `description`, `columnId` (same board only), `priority`, `taskType`, `assigneeName` |
| `DELETE` | `/api/tasks/:id` | Delete task |

Implementation details: `src/app/api/**`, schemas in `src/lib/schemas.ts`, helpers in `src/lib/api-response.ts`.

---

## Architecture & design decisions

- **`src/lib/db.ts`** — SQLite (`data/app.db`), schema, indexes, foreign keys (`ON DELETE CASCADE`), WAL. Uses **`node:sqlite`** so there are no native addon build steps (helpful on Windows). A small **migration** adds columns on existing DBs if the schema evolved after first run.
- **`src/lib/schemas.ts` + `src/lib/api-response.ts`** — Zod on every mutating route and id params; shared error shape and Zod flattening for 400s.
- **`src/app/api/**`** — Thin handlers: parse → validate → query → return JSON (no ORM).
- **`src/app/page.tsx`** — Boards list and create board.
- **`src/app/boards/[id]/page.tsx`** — Kanban: columns, task cards (`src/components/kanban/`), modal for new tasks, move via select and optional drag-and-drop.

**Trade-offs:** `node:sqlite` is still experimental in Node; requiring **≥ 22.5** keeps behavior predictable. Column `display_order` is unique per board (simple; production might use fractional indexes or a reorder endpoint). Task order within a column follows `created_at` (moving columns updates `column_id` only; no intra-column sort key).

---

## Database

- **Type:** SQLite (single file).
- **Location:** `data/app.db` under the project root (ignored by git).
- **Inspect:** Any SQLite client (e.g. [DB Browser for SQLite](https://sqlitebrowser.org/)) or the CLI, while the dev server is stopped or read-only if your tool allows it.

---

## Deploying to Vercel

1. Connect the repo to [Vercel](https://vercel.com), **Next.js** preset, Node **22.x**.
2. Minimum production env vars: **`AUTH_SECRET`** and **`AUTH_URL`** (your public deployment URL, no trailing slash).
3. **Important:** this app uses **on-disk SQLite** (`data/app.db`). Vercel serverless has **no durable writable disk** for that pattern: the site may build, but data will not behave like on your laptop. For serious production on Vercel you need a **remote database** (e.g. Turso, Neon, Postgres) or deploy on a host with **persistent disk** (Railway, Render, Fly, VPS).
4. **Socket.io** (`bun run socket`) must run as a **separate service**; on Vercel set **`NEXT_PUBLIC_CHAT_SOCKET_URL`** to that service’s public URL.

Full checklist (env vars, LiveKit, caveats): **[`docs/vercel-deploy.md`](./docs/vercel-deploy.md)** (Spanish). Root **`vercel.json`** sets the Next.js framework preset.

---

## AI assistance

Much of this project was built with **Claude Code** and **Cursor** (agent, planning, and assisted editing), using prompt-style workflows aimed at speed and quality — along the lines of resources such as *“7 prompts to code faster”* (PDF used as a reference in the author’s workflow).

In Cursor, **Skills** and specialized contexts included, among others:

- **Software architecture** — layering, API design, data boundaries, and domain scope.
- **Backend development** — REST routes, validation, SQLite, and consistent JSON contracts.
- **Voice over IP (VoIP) and real-time communications** — as they apply to the board (chat, calls / rooms, signaling, and media considerations).
- **Streaming and live data** — patterns for near–real-time events, sockets, or equivalent channels used in the solution.

Everything was **manually reviewed and tuned** to meet the challenge brief and to be explainable in a technical review.
