import { idParamSchema } from "@/lib/schemas";
import { jsonErr, jsonOk, jsonZodError } from "@/lib/api-response";
import { getDb } from "@/lib/db";
import { getApiUser } from "@/lib/require-api-user";

type BoardRow = { id: number; name: string; created_at: string };
type ColumnRow = {
  id: number;
  board_id: number;
  name: string;
  display_order: number;
};
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
type CommentRow = {
  id: number;
  body: string;
  author_email: string;
  created_at: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const authResult = await getApiUser();
  if (authResult.error) return authResult.error;

  const { id: idStr } = await context.params;
  const idParsed = idParamSchema.safeParse(idStr);
  if (!idParsed.success) return jsonZodError(idParsed.error);

  const db = getDb();
  const board = db
    .prepare(`SELECT id, name, created_at FROM boards WHERE id = ?`)
    .get(idParsed.data) as BoardRow | undefined;
  if (!board) return jsonErr("NOT_FOUND", "Board not found", 404);

  const columns = db
    .prepare(
      `SELECT id, board_id, name, display_order FROM columns WHERE board_id = ? ORDER BY display_order ASC, id ASC`,
    )
    .all(board.id) as ColumnRow[];

  const commentsStmt = db.prepare(
    `SELECT id, body, author_email, created_at FROM task_comments WHERE task_id = ? ORDER BY datetime(created_at) ASC, id ASC`,
  );

  const result = {
    id: board.id,
    name: board.name,
    createdAt: board.created_at,
    columns: columns.map((col) => {
      const tasks = db
        .prepare(
          `SELECT id, column_id, title, description, priority, task_type, assignee_name, created_at FROM tasks WHERE column_id = ? ORDER BY datetime(created_at) ASC, id ASC`,
        )
        .all(col.id) as TaskRow[];
      return {
        id: col.id,
        boardId: col.board_id,
        name: col.name,
        displayOrder: col.display_order,
        tasks: tasks.map((t) => {
          const commentRows = commentsStmt.all(t.id) as CommentRow[];
          return {
            id: t.id,
            columnId: t.column_id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            taskType: t.task_type,
            assigneeName: t.assignee_name,
            createdAt: t.created_at,
            comments: commentRows.map((c) => ({
              id: c.id,
              body: c.body,
              authorEmail: c.author_email,
              createdAt: c.created_at,
            })),
          };
        }),
      };
    }),
  };

  return jsonOk(result);
}
