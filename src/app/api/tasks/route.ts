import { createTaskSchema } from "@/lib/schemas";
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

export async function POST(request: Request) {
  const authResult = await getApiUser();
  if (authResult.error) return authResult.error;
  if (authResult.user.role !== UserRole.PM) {
    return jsonErr("FORBIDDEN", "Only PM can create tasks", 403);
  }

  const raw = await readJsonBody(request);
  const parsed = createTaskSchema.safeParse(raw);
  if (!parsed.success) return jsonZodError(parsed.error);

  const col = await sqlGet<{ id: number }>(
    `SELECT id FROM columns WHERE id = ?`,
    [parsed.data.columnId],
  );
  if (!col) return jsonErr("NOT_FOUND", "Column not found", 404);

  const info = await sqlRun(
    `INSERT INTO tasks (column_id, title, description, priority, task_type, assignee_name) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      parsed.data.columnId,
      parsed.data.title,
      parsed.data.description ?? "",
      parsed.data.priority,
      parsed.data.taskType,
      parsed.data.assigneeName ?? "",
    ],
  );
  const row = await sqlGet<TaskRow>(
    `SELECT id, column_id, title, description, priority, task_type, assignee_name, created_at FROM tasks WHERE id = ?`,
    [asNumber(info.lastInsertRowid)],
  );
  if (!row) {
    return jsonErr("INTERNAL", "Failed to load created task", 500);
  }

  return jsonOk(
    {
      id: row.id,
      columnId: row.column_id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      taskType: row.task_type,
      assigneeName: row.assignee_name,
      createdAt: row.created_at,
      comments: [],
    },
    201,
  );
}
