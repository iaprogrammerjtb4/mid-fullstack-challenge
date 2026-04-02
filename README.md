# Mid-Level Fullstack Technical Challenge — Solution

Task board (**Next.js App Router**, **SQLite**, **Tailwind CSS**, **Zod** validation). **Runtime: [Bun](https://bun.sh)** per the challenge brief; **Node.js 22.5+** is also supported. The app uses Node’s [`node:sqlite`](https://nodejs.org/api/sqlite.html) (`DatabaseSync`), which Bun implements for compatibility—same code path for `bun run dev` / `npm run dev`.

## Run locally

### With Bun (challenge brief)

Install [Bun](https://bun.sh/docs/installation), then from the project root:

```bash
bun install
bun run seed   # optional: one board "Sample board" with columns and tasks
bun run dev
```

### With Node + npm

**Requirements:** Node **≥ 22.5** (for `node:sqlite`).

**nvm (Windows / nvm-windows):** the repo includes `.nvmrc` with `22`.

```bash
nvm install 22
nvm use 22
node -v   # v22.x.x (≥ 22.5)
```

```bash
npm install
npm run seed   # optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Open a board from the list to see the Kanban view.

## Challenge checklist

| Requirement | How it’s met |
| ----------- | ------------ |
| Boards (name, creation date) | `boards` table; `GET/POST /api/boards` |
| Columns per board (name, display order) | `columns` + unique `(board_id, display_order)`; `POST /api/columns` |
| Tasks (title, description, priority, creation date) | `tasks` table; `POST/PATCH/DELETE /api/tasks` |
| Indexes | See `src/lib/db.ts` (boards, columns, tasks, FKs + WAL) |
| Seed script | `npm run seed` / `bun run seed` → `scripts/seed.ts` |
| API endpoints + validation + status codes | `src/app/api/**` + Zod in `src/lib/schemas.ts` |
| Consistent JSON | `{ ok, data }` / `{ ok: false, error: { code, message, details? } }` in `src/lib/api-response.ts` |
| Kanban UI, modal new task, dropdown move | `src/app/boards/[id]/page.tsx` |
| Loading & empty states | Home + board pages |

## Scripts

| Command | Description |
| ------- | ----------- |
| `bun run dev` / `npm run dev` | Next.js dev (Turbopack) |
| `bun run build` / `npm run build` | Production build |
| `bun run start` / `npm start` | Serve production build |
| `bun run seed` / `npm run seed` | One board `"Sample board"` (replaces existing row with same name) |
| `bun run lint` / `npm run lint` | ESLint |

## API

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/api/boards` | List boards |
| `POST` | `/api/boards` | Create `{ "name" }` |
| `GET` | `/api/boards/:id` | Board with columns and tasks |
| `POST` | `/api/columns` | Create column `{ "boardId", "name", "displayOrder" }` |
| `POST` | `/api/tasks` | Create `{ "columnId", "title", "description?", "priority?" }` |
| `PATCH` | `/api/tasks/:id` | Partial update: `title`, `description`, `columnId` (same board only), `priority` |
| `DELETE` | `/api/tasks/:id` | Delete task |

Database file: `data/app.db` (gitignored).

## Architecture

- **`src/lib/db.ts`:** SQLite (`data/app.db`), schema, indexes, `PRAGMA foreign_keys`, WAL. No native addons beyond the runtime’s SQLite binding.
- **`src/lib/schemas.ts` + `src/lib/api-response.ts`:** Zod validation and uniform JSON errors (400 / 404 / 409, etc.).
- **`src/app/api/**`:** Route handlers: validate → DB → respond.
- **`src/app/page.tsx`:** Board list, create board, loading and empty states.
- **`src/app/boards/[id]/page.tsx`:** Kanban columns, task cards, modal for new tasks, `<select>` to move tasks, delete, add column.

**Trade-offs:** `node:sqlite` is still marked experimental in Node; pinning **≥ 22.5** keeps behavior stable. Column `display_order` is unique per board (simple ordering; production might use fractional indexing or a dedicated reorder API).

## AI assistance

This solution was developed with **Cursor / Copilot-class assistance** for scaffolding, API/UI wiring, and documentation. All code was reviewed and adjusted for consistency with the challenge (endpoints, validation, UI requirements).

## Submission

Fork the upstream repository, push your branch, and open a **pull request**. This README documents how to run the project, the architecture, and the seed script, as requested in the brief.
