import { idParamSchema, patchTaskSchema } from "@/lib/schemas";
import { jsonErr, jsonOk, jsonZodError, readJsonBody } from "@/lib/api-response";
import { asNumber, sqlGet, sqlRun } from "@/lib/db";
import { getApiUser } from "@/lib/require-api-user";
import { UserRole } from "@/lib/roles";

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
    comments: [] as { id: number; body: string; authorEmail: string; createdAt: string }[],
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await getApiUser();
  if (authResult.error) return authResult.error;
  const apiUser = authResult.user;

  const { id: idStr } = await context.params;
  const idParsed = idParamSchema.safeParse(idStr);
  if (!idParsed.success) return jsonZodError(idParsed.error);

  const raw = await readJsonBody(request);
  const parsed = patchTaskSchema.safeParse(raw);
  if (!parsed.success) return jsonZodError(parsed.error);

  const hasContentChange =
    parsed.data.title !== undefined ||
    parsed.data.description !== undefined ||
    parsed.data.priority !== undefined ||
    parsed.data.taskType !== undefined ||
    parsed.data.assigneeName !== undefined;

  if (hasContentChange && apiUser.role !== UserRole.PM) {
    return jsonErr(
      "FORBIDDEN",
      "Only PM can edit task title, description, priority, type, or assignee",
      403,
    );
  }

  const task = await sqlGet<TaskRow>(
    `SELECT id, column_id, title, description, priority, task_type, assignee_name, created_at FROM tasks WHERE id = ?`,
    [idParsed.data],
  );
  if (!task) return jsonErr("NOT_FOUND", "Task not found", 404);

  let nextColumnId = task.column_id;
  if (parsed.data.columnId !== undefined) {
    const currentBoard = await sqlGet<{ board_id: number }>(
      `SELECT c.board_id FROM columns c WHERE c.id = ?`,
      [task.column_id],
    );
    const newCol = await sqlGet<{ id: number; board_id: number }>(
      `SELECT id, board_id FROM columns WHERE id = ?`,
      [parsed.data.columnId],
    );
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

  await sqlRun(
    `UPDATE tasks SET title = ?, description = ?, column_id = ?, priority = ?, task_type = ?, assignee_name = ? WHERE id = ?`,
    [title, description, columnId, priority, taskType, assigneeName, idParsed.data],
  );

  const updated = await sqlGet<TaskRow>(
    `SELECT id, column_id, title, description, priority, task_type, assignee_name, created_at FROM tasks WHERE id = ?`,
    [idParsed.data],
  );
  if (!updated) {
    return jsonErr("NOT_FOUND", "Task not found after update", 404);
  }

  return jsonOk(mapTask(updated));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await getApiUser();
  if (authResult.error) return authResult.error;
  if (authResult.user.role !== UserRole.PM) {
    return jsonErr("FORBIDDEN", "Only PM can delete tasks", 403);
  }

  const { id: idStr } = await context.params;
  const idParsed = idParamSchema.safeParse(idStr);
  if (!idParsed.success) return jsonZodError(idParsed.error);

  const info = await sqlRun(`DELETE FROM tasks WHERE id = ?`, [idParsed.data]);
  if (asNumber(info.changes) === 0)
    return jsonErr("NOT_FOUND", "Task not found", 404);

  return jsonOk({ deleted: true });
}
