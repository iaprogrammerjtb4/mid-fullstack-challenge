"use server";

import { auth } from "@/auth";
import { asNumber, sqlAll, sqlGet, sqlRun } from "@/lib/db";
import { isPmOrDeveloper, UserRole } from "@/lib/roles";
import { createCoworkRoomSchema } from "@/lib/schemas";

export type CoworkRoomDTO = {
  id: number;
  boardId: number;
  taskId: number | null;
  title: string;
  createdBy: number;
  creatorEmail: string;
  createdAt: string;
  taskTitle: string | null;
};

export type CoworkActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

export async function listCoworkRoomsAction(
  boardId: unknown,
): Promise<CoworkActionResult<CoworkRoomDTO[]>> {
  const session = await auth();
  if (!session?.user?.role || !isPmOrDeveloper(session.user.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Not allowed" };
  }
  const id = typeof boardId === "number" ? boardId : Number(boardId);
  if (!Number.isFinite(id) || id < 1) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid board" };
  }

  const board = await sqlGet<{ id: number }>(
    `SELECT id FROM boards WHERE id = ?`,
    [id],
  );
  if (!board) {
    return { ok: false, code: "NOT_FOUND", message: "Board not found" };
  }

  const rows = await sqlAll<{
      id: number;
      board_id: number;
      task_id: number | null;
      title: string;
      created_by: number;
      created_at: string;
      creator_email: string;
      task_title: string | null;
    }>(
    `SELECT cr.id, cr.board_id, cr.task_id, cr.title, cr.created_by, cr.created_at,
              u.email AS creator_email, t.title AS task_title
       FROM cowork_rooms cr
       JOIN users u ON u.id = cr.created_by
       LEFT JOIN tasks t ON t.id = cr.task_id
       WHERE cr.board_id = ?
       ORDER BY cr.created_at DESC`,
    [id],
  );

  const data: CoworkRoomDTO[] = rows.map((r) => ({
    id: r.id,
    boardId: r.board_id,
    taskId: r.task_id,
    title: r.title,
    createdBy: r.created_by,
    creatorEmail: r.creator_email,
    createdAt: r.created_at,
    taskTitle: r.task_title,
  }));

  return { ok: true, data };
}

export async function createCoworkRoomAction(
  input: unknown,
): Promise<CoworkActionResult<{ id: number }>> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role || !isPmOrDeveloper(session.user.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Not allowed" };
  }

  const parsed = createCoworkRoomSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid payload" };
  }

  const { boardId, title, taskId } = parsed.data;
  const boardRow = await sqlGet<{ id: number }>(
    `SELECT id FROM boards WHERE id = ?`,
    [boardId],
  );
  if (!boardRow) {
    return { ok: false, code: "NOT_FOUND", message: "Board not found" };
  }

  let taskIdToStore: number | null = null;
  if (taskId != null) {
    const taskOk = await sqlGet<{ id: number }>(
      `SELECT t.id FROM tasks t
         JOIN columns c ON c.id = t.column_id
         WHERE t.id = ? AND c.board_id = ?`,
      [taskId, boardId],
    );
    if (!taskOk) {
      return {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Task does not belong to this board",
      };
    }
    taskIdToStore = taskId;
  }

  const info = await sqlRun(
    `INSERT INTO cowork_rooms (board_id, task_id, title, created_by)
       VALUES (?, ?, ?, ?)`,
    [boardId, taskIdToStore, title, Number(session.user.id)],
  );

  return { ok: true, data: { id: asNumber(info.lastInsertRowid) } };
}

export async function deleteCoworkRoomAction(
  boardId: unknown,
  roomId: unknown,
): Promise<CoworkActionResult> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role || !isPmOrDeveloper(session.user.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Not allowed" };
  }

  const bId = typeof boardId === "number" ? boardId : Number(boardId);
  const rId = typeof roomId === "number" ? roomId : Number(roomId);
  if (!Number.isFinite(bId) || bId < 1 || !Number.isFinite(rId) || rId < 1) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid ids" };
  }

  const row = await sqlGet<{ id: number; created_by: number }>(
    `SELECT id, created_by FROM cowork_rooms WHERE id = ? AND board_id = ?`,
    [rId, bId],
  );
  if (!row) {
    return { ok: false, code: "NOT_FOUND", message: "Room not found" };
  }

  const uid = Number(session.user.id);
  const isPm = session.user.role === UserRole.PM;
  if (!isPm && row.created_by !== uid) {
    return { ok: false, code: "FORBIDDEN", message: "Only the creator or PM can delete" };
  }

  await sqlRun(`DELETE FROM cowork_rooms WHERE id = ?`, [rId]);
  return { ok: true, data: undefined };
}
