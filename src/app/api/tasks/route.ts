import { createTaskSchema } from "@/lib/schemas";
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

export async function POST(request: Request) {
  const raw = await readJsonBody(request);
  const parsed = createTaskSchema.safeParse(raw);
  if (!parsed.success) return jsonZodError(parsed.error);

  const db = getDb();
  const col = db
    .prepare(`SELECT id FROM columns WHERE id = ?`)
    .get(parsed.data.columnId);
  if (!col) return jsonErr("NOT_FOUND", "Column not found", 404);

  const info = db
    .prepare(
      `INSERT INTO tasks (column_id, title, description, priority, task_type, assignee_name) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      parsed.data.columnId,
      parsed.data.title,
      parsed.data.description ?? "",
      parsed.data.priority,
      parsed.data.taskType,
      parsed.data.assigneeName ?? "",
    );
  const row = db
    .prepare(
      `SELECT id, column_id, title, description, priority, task_type, assignee_name, created_at FROM tasks WHERE id = ?`,
    )
    .get(asNumber(info.lastInsertRowid)) as TaskRow;

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
    },
    201,
  );
}
