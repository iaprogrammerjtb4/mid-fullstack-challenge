"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { asNumber, sqlGet, sqlRun } from "@/lib/db";
import { isPm, isPmOrDeveloper } from "@/lib/roles";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

const assignTaskSchema = z.object({
  taskId: z.coerce.number().int().positive(),
  assigneeName: z.string().max(120),
});

const updateTaskStatusSchema = z.object({
  taskId: z.coerce.number().int().positive(),
  columnId: z.coerce.number().int().positive(),
});

const addCommentSchema = z.object({
  taskId: z.coerce.number().int().positive(),
  body: z.string().min(1).max(5000),
});

async function boardIdForTask(taskId: number): Promise<number | null> {
  const row = await sqlGet<{ board_id: number }>(
    `SELECT c.board_id AS board_id FROM columns c
       INNER JOIN tasks t ON t.column_id = c.id WHERE t.id = ?`,
    [taskId],
  );
  return row ? row.board_id : null;
}

export async function assignTaskAction(input: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.role || !isPm(session.user.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Only PM can assign tasks" };
  }

  const parsed = assignTaskSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid assign task payload",
    };
  }

  const task = await sqlGet<{ id: number }>(
    `SELECT id FROM tasks WHERE id = ?`,
    [parsed.data.taskId],
  );
  if (!task) {
    return { ok: false, code: "NOT_FOUND", message: "Task not found" };
  }

  await sqlRun(`UPDATE tasks SET assignee_name = ? WHERE id = ?`, [
    parsed.data.assigneeName,
    parsed.data.taskId,
  ]);

  const bid = await boardIdForTask(parsed.data.taskId);
  if (bid !== null) revalidatePath(`/boards/${bid}`);
  return { ok: true, data: undefined };
}

export async function updateTaskStatusAction(
  input: unknown,
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.role || !isPmOrDeveloper(session.user.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Not authorized" };
  }

  const parsed = updateTaskStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid status update payload",
    };
  }

  const task = await sqlGet<{ id: number; column_id: number }>(
    `SELECT id, column_id FROM tasks WHERE id = ?`,
    [parsed.data.taskId],
  );
  if (!task) {
    return { ok: false, code: "NOT_FOUND", message: "Task not found" };
  }

  const currentBoard = await sqlGet<{ board_id: number }>(
    `SELECT board_id FROM columns WHERE id = ?`,
    [task.column_id],
  );
  const newCol = await sqlGet<{ id: number; board_id: number }>(
    `SELECT id, board_id FROM columns WHERE id = ?`,
    [parsed.data.columnId],
  );
  if (!newCol) {
    return { ok: false, code: "NOT_FOUND", message: "Target column not found" };
  }
  if (!currentBoard || newCol.board_id !== currentBoard.board_id) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Task can only be moved to a column on the same board",
    };
  }

  await sqlRun(`UPDATE tasks SET column_id = ? WHERE id = ?`, [
    parsed.data.columnId,
    parsed.data.taskId,
  ]);

  revalidatePath(`/boards/${currentBoard.board_id}`);
  return { ok: true, data: undefined };
}

export async function addCommentAction(
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  const session = await auth();
  if (!session?.user?.role || !isPmOrDeveloper(session.user.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Not authorized" };
  }
  if (!session.user.email) {
    return { ok: false, code: "FORBIDDEN", message: "Missing user email" };
  }

  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid comment payload",
    };
  }

  const task = await sqlGet<{ id: number }>(
    `SELECT id FROM tasks WHERE id = ?`,
    [parsed.data.taskId],
  );
  if (!task) {
    return { ok: false, code: "NOT_FOUND", message: "Task not found" };
  }

  const info = await sqlRun(
    `INSERT INTO task_comments (task_id, author_email, body) VALUES (?, ?, ?)`,
    [parsed.data.taskId, session.user.email, parsed.data.body],
  );

  const bid = await boardIdForTask(parsed.data.taskId);
  if (bid !== null) revalidatePath(`/boards/${bid}`);

  return { ok: true, data: { id: asNumber(info.lastInsertRowid) } };
}
