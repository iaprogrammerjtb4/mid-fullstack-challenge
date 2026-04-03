/**
 * Embedded SQLite (node:sqlite) for local development and Vercel fallback without Turso.
 * App code should use `@/lib/db` (sqlGet/sqlAll/sqlRun); seed may import getLocalDb directly.
 */
import bcrypt from "bcryptjs";
import fs from "fs";
import os from "os";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR =
  process.env.VERCEL === "1"
    ? path.join(os.tmpdir(), "mid-fullstack-data")
    : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

/** Full bootstrap DDL (used by Turso executeMultiple too). */
export const SQLITE_BOOTSTRAP_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS boards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_boards_created_at ON boards(created_at);

CREATE TABLE IF NOT EXISTS columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_columns_board_id ON columns(board_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_columns_board_display_order ON columns(board_id, display_order);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  column_id INTEGER NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium',
  task_type TEXT NOT NULL DEFAULT 'task',
  assignee_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PM', 'DEVELOPER')),
  image TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS task_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_email TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);
`;

let db: DatabaseSync | null = null;

export function getLocalDb(): DatabaseSync {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SQLITE_BOOTSTRAP_SQL);
  migrateTasksTable(db);
  migrateUsersAndComments(db);
  migrateUsersImage(db);
  migrateCoworkRooms(db);
  migrateUserPresence(db);
  ensureVercelDemoUsersLocal(db);
  return db;
}

function ensureVercelDemoUsersLocal(database: DatabaseSync) {
  if (process.env.VERCEL !== "1") return;
  if (process.env.VERCEL_SKIP_DEMO_USERS === "1") return;
  const row = database.prepare(`SELECT COUNT(*) AS c FROM users`).get() as
    | { c: number }
    | undefined;
  if (!row || row.c > 0) return;
  const hash = bcrypt.hashSync("password123", 10);
  database
    .prepare(
      `INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
    )
    .run("pm@example.com", hash, "PM");
  database
    .prepare(
      `INSERT OR IGNORE INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
    )
    .run("dev@example.com", hash, "DEVELOPER");
}

type TableInfoRow = { name: string };

function migrateTasksTable(database: DatabaseSync) {
  const cols = database.prepare(`PRAGMA table_info(tasks)`).all() as TableInfoRow[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("task_type")) {
    database.exec(
      `ALTER TABLE tasks ADD COLUMN task_type TEXT NOT NULL DEFAULT 'task'`,
    );
  }
  if (!names.has("assignee_name")) {
    database.exec(
      `ALTER TABLE tasks ADD COLUMN assignee_name TEXT NOT NULL DEFAULT ''`,
    );
  }
}

function tableExists(database: DatabaseSync, name: string): boolean {
  const row = database
    .prepare(`SELECT 1 FROM sqlite_master WHERE type='table' AND name = ?`)
    .get(name) as { "1": number } | undefined;
  return row !== undefined;
}

function migrateUsersAndComments(database: DatabaseSync) {
  if (!tableExists(database, "users")) {
    database.exec(`
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
  if (!tableExists(database, "task_comments")) {
    database.exec(`
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

function migrateUsersImage(database: DatabaseSync) {
  if (!tableExists(database, "users")) return;
  const cols = database.prepare(`PRAGMA table_info(users)`).all() as TableInfoRow[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("image")) {
    database.exec(`ALTER TABLE users ADD COLUMN image TEXT NOT NULL DEFAULT ''`);
  }
}

function migrateCoworkRooms(database: DatabaseSync) {
  if (!tableExists(database, "cowork_rooms")) {
    database.exec(`
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
}

function migrateUserPresence(database: DatabaseSync) {
  if (!tableExists(database, "user_presence")) {
    database.exec(`
CREATE TABLE user_presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_seen_ms INTEGER NOT NULL
);
`);
  }
}
