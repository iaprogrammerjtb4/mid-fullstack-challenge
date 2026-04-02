import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

const DDL = `
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
`;

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(DDL);
  migrateTasksTable(db);
  return db;
}

type TableInfoRow = { name: string };

function migrateTasksTable(db: DatabaseSync) {
  const cols = db.prepare(`PRAGMA table_info(tasks)`).all() as TableInfoRow[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("task_type")) {
    db.exec(`ALTER TABLE tasks ADD COLUMN task_type TEXT NOT NULL DEFAULT 'task'`);
  }
  if (!names.has("assignee_name")) {
    db.exec(`ALTER TABLE tasks ADD COLUMN assignee_name TEXT NOT NULL DEFAULT ''`);
  }
}

/** Normalize rowid/changes from node:sqlite (number | bigint). */
export function asNumber(n: number | bigint): number {
  return typeof n === "bigint" ? Number(n) : n;
}
