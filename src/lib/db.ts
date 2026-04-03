import bcrypt from "bcryptjs";
import { createClient, type Client, type InValue, type ResultSet } from "@libsql/client";
import type { SQLInputValue } from "node:sqlite";
import { getLocalDb, SQLITE_BOOTSTRAP_SQL } from "@/lib/sqlite-local";

/** node:sqlite bind params exclude boolean; libsql allows it — coerce for local DB. */
function toLocalArgs(args: InValue[]): SQLInputValue[] {
  return args.map((v) => {
    if (typeof v === "boolean") return v ? 1 : 0;
    return v as SQLInputValue;
  });
}

export function isTursoConfigured(): boolean {
  return Boolean(
    process.env.TURSO_DATABASE_URL?.trim() &&
      process.env.TURSO_AUTH_TOKEN?.trim(),
  );
}

let tursoClient: Client | null = null;
let tursoReady: Promise<void> | null = null;

function getTurso(): Client {
  if (!tursoClient) {
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL!.trim(),
      authToken: process.env.TURSO_AUTH_TOKEN!.trim(),
    });
  }
  return tursoClient;
}

function mapRow<T extends Record<string, unknown>>(
  rs: ResultSet,
  index: number,
): T | undefined {
  const row = rs.rows[index];
  if (!row) return undefined;
  const out: Record<string, unknown> = {};
  for (let i = 0; i < rs.columns.length; i++) {
    let key = rs.columns[i];
    const rawKey = key == null ? "" : String(key).trim();
    // Hrana/libsql may return "" for column names; duplicate "" would overwrite cells and break callers.
    if (!rawKey) key = `__col${i}`;
    else key = rawKey;
    if (key in out) key = `${String(key)}__${i}`;
    let v: unknown = row[i];
    if (typeof v === "bigint") v = Number(v);
    out[key] = v;
  }
  return out as T;
}

async function tursoTableExists(c: Client, name: string): Promise<boolean> {
  const rs = await c.execute({
    sql: `SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name = ?`,
    args: [name],
  });
  return rs.rows.length > 0;
}

async function migrateTursoTasks(c: Client) {
  const rs = await c.execute(`PRAGMA table_info(tasks)`);
  const nameCol = rs.columns.indexOf("name");
  const names = new Set(
    rs.rows.map((r) => String(nameCol >= 0 ? r[nameCol] ?? "" : "")),
  );
  if (!names.has("task_type")) {
    await c.execute(
      `ALTER TABLE tasks ADD COLUMN task_type TEXT NOT NULL DEFAULT 'task'`,
    );
  }
  if (!names.has("assignee_name")) {
    await c.execute(
      `ALTER TABLE tasks ADD COLUMN assignee_name TEXT NOT NULL DEFAULT ''`,
    );
  }
}

async function migrateTursoUsersComments(c: Client) {
  if (!(await tursoTableExists(c, "users"))) {
    await c.executeMultiple(`
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PM', 'DEVELOPER')),
  image TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);
  }
  if (!(await tursoTableExists(c, "task_comments"))) {
    await c.executeMultiple(`
CREATE TABLE task_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);
`);
  }
}

async function migrateTursoUsersImage(c: Client) {
  if (!(await tursoTableExists(c, "users"))) return;
  const rs = await c.execute(`PRAGMA table_info(users)`);
  const nameCol = rs.columns.indexOf("name");
  const names = new Set(
    rs.rows.map((r) => String(nameCol >= 0 ? r[nameCol] ?? "" : "")),
  );
  if (!names.has("image")) {
    await c.execute(`ALTER TABLE users ADD COLUMN image TEXT NOT NULL DEFAULT ''`);
  }
}

async function migrateTursoCowork(c: Client) {
  if (await tursoTableExists(c, "cowork_rooms")) return;
  await c.executeMultiple(`
CREATE TABLE cowork_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_cowork_rooms_board_id ON cowork_rooms(board_id);
`);
}

async function migrateTursoPresence(c: Client) {
  if (await tursoTableExists(c, "user_presence")) return;
  await c.executeMultiple(`
CREATE TABLE user_presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen_ms INTEGER NOT NULL
);
`);
}

async function ensureTursoDemoUsers(c: Client) {
  if (process.env.TURSO_SKIP_DEMO_USERS === "1") return;
  const rs = await c.execute(`SELECT COUNT(*) FROM users`);
  const n = Number(rs.rows[0]?.[0] ?? 0);
  if (!Number.isFinite(n) || n > 0) return;
  const hash = bcrypt.hashSync("password123", 10);
  await c.execute({
    sql: `INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
    args: ["pm@example.com", hash, "PM"],
  });
  await c.execute({
    sql: `INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
    args: ["dev@example.com", hash, "DEVELOPER"],
  });
}

async function initTurso(): Promise<void> {
  const c = getTurso();
  await c.execute("PRAGMA foreign_keys = ON");
  await c.executeMultiple(SQLITE_BOOTSTRAP_SQL);
  await migrateTursoTasks(c);
  await migrateTursoUsersComments(c);
  await migrateTursoUsersImage(c);
  await migrateTursoCowork(c);
  await migrateTursoPresence(c);
  await ensureTursoDemoUsers(c);
}

/**
 * Await once before DB usage (Turso schema + migrations, or local SQLite open).
 */
export async function ensureDbReady(): Promise<void> {
  if (isTursoConfigured()) {
    if (!tursoReady) {
      tursoReady = initTurso().catch((e) => {
        tursoReady = null;
        throw e;
      });
    }
    await tursoReady;
    return;
  }
  getLocalDb();
}

/**
 * Call before credential lookup so Turso always re-checks demo users (covers cold starts / races).
 * Local + Vercel file DB already seeds inside getLocalDb().
 */
export async function bootstrapLoginDb(): Promise<void> {
  await ensureDbReady();
  if (isTursoConfigured() && process.env.TURSO_SKIP_DEMO_USERS !== "1") {
    await ensureTursoDemoUsers(getTurso());
  }
}

export type CredentialsUserRow = {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  image: string;
};

/**
 * Credential login must not use mapRow alone: remote libsql can omit column names, so positional
 * values match the SELECT list (id, email, password_hash, role, image).
 */
export async function getUserRowForCredentialsLogin(
  email: string,
): Promise<CredentialsUserRow | undefined> {
  const sql = `SELECT id, email, password_hash, role, image FROM users WHERE LOWER(TRIM(email)) = ?`;
  await bootstrapLoginDb();
  if (isTursoConfigured()) {
    const rs = await getTurso().execute({ sql, args: [email] });
    const raw = rs.rows[0];
    if (!raw) return undefined;
    const cell = (i: number): unknown => {
      const v = raw[i] as unknown;
      return typeof v === "bigint" ? Number(v) : v;
    };
    const id = cell(0);
    const password_hash = cell(2);
    if (id == null || password_hash == null) return undefined;
    return {
      id: Number(id),
      email: String(cell(1) ?? ""),
      password_hash: String(password_hash),
      role: String(cell(3) ?? ""),
      image: String(cell(4) ?? ""),
    };
  }
  const database = getLocalDb();
  return database.prepare(sql).get(...toLocalArgs([email])) as
    | CredentialsUserRow
    | undefined;
}

export async function sqlGet<T extends Record<string, unknown>>(
  sql: string,
  args: InValue[] = [],
): Promise<T | undefined> {
  await ensureDbReady();
  if (isTursoConfigured()) {
    const rs = await getTurso().execute({ sql, args });
    return mapRow<T>(rs, 0);
  }
  const database = getLocalDb();
  return database.prepare(sql).get(...toLocalArgs(args)) as T | undefined;
}

export async function sqlAll<T extends Record<string, unknown>>(
  sql: string,
  args: InValue[] = [],
): Promise<T[]> {
  await ensureDbReady();
  if (isTursoConfigured()) {
    const rs = await getTurso().execute({ sql, args });
    const out: T[] = [];
    for (let i = 0; i < rs.rows.length; i++) {
      const row = mapRow<T>(rs, i);
      if (row) out.push(row);
    }
    return out;
  }
  const database = getLocalDb();
  return database.prepare(sql).all(...toLocalArgs(args)) as T[];
}

export async function sqlRun(
  sql: string,
  args: InValue[] = [],
): Promise<{ lastInsertRowid: number; changes: number }> {
  await ensureDbReady();
  if (isTursoConfigured()) {
    const rs = await getTurso().execute({ sql, args });
    return {
      lastInsertRowid: Number(rs.lastInsertRowid ?? 0),
      changes: rs.rowsAffected,
    };
  }
  const database = getLocalDb();
  const info = database.prepare(sql).run(...toLocalArgs(args));
  return {
    lastInsertRowid: asNumber(info.lastInsertRowid),
    changes: asNumber(info.changes),
  };
}

/** Normalize rowid/changes from node:sqlite (number | bigint). */
export function asNumber(n: number | bigint): number {
  return typeof n === "bigint" ? Number(n) : n;
}
