/**
 * Preloads one board with columns and tasks. From project root:
 *   bun run seed
 *   npm run seed
 */

import { getDb } from "../src/lib/db";

function main() {
  const db = getDb();

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

  console.log(`Seed OK. Board id=${boardId} ("Sample board")`);
}

main();
