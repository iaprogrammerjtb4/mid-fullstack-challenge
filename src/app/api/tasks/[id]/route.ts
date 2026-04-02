import { idParamSchema, patchTaskSchema } from "@/lib/schemas";
import { jsonErr, jsonOk, jsonZodError, readJsonBody } from "@/lib/api-response";
import { asNumber, getDb } from "@/lib/db";

type TaskRow = {
  id: number;
  column_id: number;
  title: string;
  description: string;
  priority: string;
  task_type: string;
  assignee_name: string;
  created_at: string;
};

function mapTask(row: TaskRow) {
  return {
    id: row.id,
    columnId: row.column_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    taskType: row.task_type,
    assigneeName: row.assignee_name,
    createdAt: row.created_at,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await context.params;
  const idParsed = idParamSchema.safeParse(idStr);
  if (!idParsed.success) return jsonZodError(idParsed.error);

  const raw = await readJsonBody(request);
  const parsed = patchTaskSchema.safeParse(raw);
  if (!parsed.success) return jsonZodError(parsed.error);

  const db = getDb();
  const task = db
    .prepare(
      `SELECT id, column_id, title, description, priority, task_type, assignee_name, created_at FROM tasks WHERE id = ?`,
    )
    .get(idParsed.data) as TaskRow | undefined;
  if (!task) return jsonErr("NOT_FOUND", "Task not found", 404);

  let nextColumnId = task.column_id;
  if (parsed.data.columnId !== undefined) {
    const currentBoard = db
      .prepare(
        `SELECT c.board_id FROM columns c WHERE c.id = ?`,
      )
      .get(task.column_id) as { board_id: number } | undefined;
    const newCol = db
      .prepare(`SELECT id, board_id FROM columns WHERE id = ?`)
      .get(parsed.data.columnId) as
      | { id: number; board_id: number }
      | undefined;
    if (!newCol) return jsonErr("NOT_FOUND", "Target column not found", 404);
    if (!currentBoard || newCol.board_id !== currentBoard.board_id) {
      return jsonErr(
        "VALIDATION_ERROR",
        "Task can only be moved to a column on the same board",
        400,
      );
    }
    nextColumnId = newCol.id;
  }

  const title = parsed.data.title ?? task.title;
  const description =
    parsed.data.description !== undefined
      ? parsed.data.description
      : task.description;
  const priority = parsed.data.priority ?? task.priority;
  const taskType = parsed.data.taskType ?? task.task_type;
  const assigneeName =
    parsed.data.assigneeName !== undefined
      ? parsed.data.assigneeName
      : task.assignee_name;
  const columnId = nextColumnId;

  db.prepare(
    `UPDATE tasks SET title = ?, description = ?, column_id = ?, priority = ?, task_type = ?, assignee_name = ? WHERE id = ?`,
  ).run(title, description, columnId, priority, taskType, assigneeName, idParsed.data);

  const updated = db
    .prepare(
      `SELECT id, column_id, title, description, priority, task_type, assignee_name, created_at FROM tasks WHERE id = ?`,
    )
    .get(idParsed.data) as TaskRow;

  return jsonOk(mapTask(updated));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await context.params;
  const idParsed = idParamSchema.safeParse(idStr);
  if (!idParsed.success) return jsonZodError(idParsed.error);

  const db = getDb();
  const info = db.prepare(`DELETE FROM tasks WHERE id = ?`).run(idParsed.data);
  if (asNumber(info.changes) === 0)
    return jsonErr("NOT_FOUND", "Task not found", 404);

  return jsonOk({ deleted: true });
}
