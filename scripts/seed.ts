/**
 * Preloads one board with columns and tasks. From project root:
 *   bun run seed
 *   npm run seed
 *
 * If TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set, seeds the remote Turso DB.
 * Otherwise uses local file SQLite (data/app.db).
 *
 * Also upserts demo users (bcrypt):
 *   pm@example.com / password123  — role PM
 *   dev@example.com / password123 — role DEVELOPER
 */

import bcrypt from "bcryptjs";
import type { DatabaseSync } from "node:sqlite";
import { asNumber, sqlGet, sqlRun } from "../src/lib/db";
import { getLocalDb } from "../src/lib/sqlite-local";

function tursoFromEnv(): boolean {
  return Boolean(
    process.env.TURSO_DATABASE_URL?.trim() &&
      process.env.TURSO_AUTH_TOKEN?.trim(),
  );
}

function upsertUserLocal(
  db: DatabaseSync,
  email: string,
  plainPassword: string,
  role: "PM" | "DEVELOPER",
) {
  const hash = bcrypt.hashSync(plainPassword, 10);
  const existing = db
    .prepare(`SELECT id FROM users WHERE email = ?`)
    .get(email) as { id: number } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE users SET password_hash = ?, role = ? WHERE email = ?`,
    ).run(hash, role, email);
  } else {
    db.prepare(
      `INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
    ).run(email, hash, role);
  }
}

async function upsertUserTurso(
  email: string,
  plainPassword: string,
  role: "PM" | "DEVELOPER",
) {
  const hash = bcrypt.hashSync(plainPassword, 10);
  const existing = await sqlGet<{ id: number }>(
    `SELECT id FROM users WHERE email = ?`,
    [email],
  );
  if (existing) {
    await sqlRun(`UPDATE users SET password_hash = ?, role = ? WHERE email = ?`, [
      hash,
      role,
      email,
    ]);
  } else {
    await sqlRun(`INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`, [
      email,
      hash,
      role,
    ]);
  }
}

function seedLocal() {
  const db = getLocalDb();

  upsertUserLocal(db, "pm@example.com", "password123", "PM");
  upsertUserLocal(db, "dev@example.com", "password123", "DEVELOPER");
  console.log("Users: pm@example.com & dev@example.com — password: password123");

  const existing = db
    .prepare(`SELECT id FROM boards WHERE name = ?`)
    .get("Sample board") as { id: number } | undefined;
  if (existing) {
    db.prepare(`DELETE FROM boards WHERE id = ?`).run(existing.id);
  }

  const rBoard = db.prepare(`INSERT INTO boards (name) VALUES (?)`).run(
    "Sample board",
  );
  const boardId = Number(rBoard.lastInsertRowid);

  const colTodo = db
    .prepare(
      `INSERT INTO columns (board_id, name, display_order) VALUES (?, ?, ?)`,
    )
    .run(boardId, "To do", 0);
  const colDoing = db
    .prepare(
      `INSERT INTO columns (board_id, name, display_order) VALUES (?, ?, ?)`,
    )
    .run(boardId, "In progress", 1);
  const colDone = db
    .prepare(
      `INSERT INTO columns (board_id, name, display_order) VALUES (?, ?, ?)`,
    )
    .run(boardId, "Done", 2);

  const todoId = Number(colTodo.lastInsertRowid);
  const doingId = Number(colDoing.lastInsertRowid);
  const doneId = Number(colDone.lastInsertRowid);

  const ins = db.prepare(
    `INSERT INTO tasks (column_id, title, description, priority, task_type, assignee_name) VALUES (?, ?, ?, ?, ?, ?)`,
  );

  ins.run(
    todoId,
    "Sketch data model",
    "Boards, columns, tasks + indexes",
    "high",
    "story",
    "Alex Kim",
  );
  ins.run(
    todoId,
    "Define API contract",
    "REST + validation",
    "medium",
    "task",
    "Jordan Lee",
  );
  ins.run(
    doingId,
    "Build Kanban UI",
    "Modal for new task, dropdown move",
    "high",
    "bug",
    "Sam Rivera",
  );
  ins.run(
    doneId,
    "Write README",
    "Run + architecture notes",
    "low",
    "story",
    "",
  );

  console.log(`Seed OK (local). Board id=${boardId} ("Sample board")`);
}

async function seedTurso() {
  await upsertUserTurso("pm@example.com", "password123", "PM");
  await upsertUserTurso("dev@example.com", "password123", "DEVELOPER");
  console.log("Users: pm@example.com & dev@example.com — password: password123");

  const existing = await sqlGet<{ id: number }>(
    `SELECT id FROM boards WHERE name = ?`,
    ["Sample board"],
  );
  if (existing) {
    await sqlRun(`DELETE FROM boards WHERE id = ?`, [existing.id]);
  }

  const rBoard = await sqlRun(`INSERT INTO boards (name) VALUES (?)`, [
    "Sample board",
  ]);
  const boardId = asNumber(rBoard.lastInsertRowid);

  const colTodo = await sqlRun(
    `INSERT INTO columns (board_id, name, display_order) VALUES (?, ?, ?)`,
    [boardId, "To do", 0],
  );
  const colDoing = await sqlRun(
    `INSERT INTO columns (board_id, name, display_order) VALUES (?, ?, ?)`,
    [boardId, "In progress", 1],
  );
  const colDone = await sqlRun(
    `INSERT INTO columns (board_id, name, display_order) VALUES (?, ?, ?)`,
    [boardId, "Done", 2],
  );

  const todoId = asNumber(colTodo.lastInsertRowid);
  const doingId = asNumber(colDoing.lastInsertRowid);
  const doneId = asNumber(colDone.lastInsertRowid);

  const taskSql = `INSERT INTO tasks (column_id, title, description, priority, task_type, assignee_name) VALUES (?, ?, ?, ?, ?, ?)`;
  await sqlRun(taskSql, [
    todoId,
    "Sketch data model",
    "Boards, columns, tasks + indexes",
    "high",
    "story",
    "Alex Kim",
  ]);
  await sqlRun(taskSql, [
    todoId,
    "Define API contract",
    "REST + validation",
    "medium",
    "task",
    "Jordan Lee",
  ]);
  await sqlRun(taskSql, [
    doingId,
    "Build Kanban UI",
    "Modal for new task, dropdown move",
    "high",
    "bug",
    "Sam Rivera",
  ]);
  await sqlRun(taskSql, [
    doneId,
    "Write README",
    "Run + architecture notes",
    "low",
    "story",
    "",
  ]);

  console.log(`Seed OK (Turso). Board id=${boardId} ("Sample board")`);
}

async function main() {
  if (tursoFromEnv()) {
    await seedTurso();
  } else {
    seedLocal();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
