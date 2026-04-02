"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { asNumber, getDb } from "@/lib/db";
import { isPm } from "@/lib/roles";
import { createBoardSchema, createColumnSchema } from "@/lib/schemas";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

export async function createBoardAction(
  input: unknown,
): Promise<ActionResult<{ id: number }>> {
  const session = await auth();
  if (!session?.user?.role || !isPm(session.user.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Only PM can create boards" };
  }

  const parsed = createBoardSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid board payload",
    };
  }

  const db = getDb();
  const info = db.prepare(`INSERT INTO boards (name) VALUES (?)`).run(
    parsed.data.name,
  );
  const id = asNumber(info.lastInsertRowid);

  revalidatePath("/");
  return { ok: true, data: { id } };
}

export async function createColumnAction(
  input: unknown,
): Promise<ActionResult<{ id: number; boardId: number }>> {
  const session = await auth();
  if (!session?.user?.role || !isPm(session.user.role)) {
    return { ok: false, code: "FORBIDDEN", message: "Only PM can add columns" };
  }

  const parsed = createColumnSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid column payload",
    };
  }

  const db = getDb();
  const board = db
    .prepare(`SELECT id FROM boards WHERE id = ?`)
    .get(parsed.data.boardId);
  if (!board) {
    return { ok: false, code: "NOT_FOUND", message: "Board not found" };
  }

  const existingOrder = db
    .prepare(
      `SELECT id FROM columns WHERE board_id = ? AND display_order = ?`,
    )
    .get(parsed.data.boardId, parsed.data.displayOrder);
  if (existingOrder) {
    return {
      ok: false,
      code: "CONFLICT",
      message: "A column with this display order already exists on the board",
    };
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO columns (board_id, name, display_order) VALUES (?, ?, ?)`,
      )
      .run(parsed.data.boardId, parsed.data.name, parsed.data.displayOrder);
    const id = asNumber(info.lastInsertRowid);
    revalidatePath(`/boards/${parsed.data.boardId}`);
    return { ok: true, data: { id, boardId: parsed.data.boardId } };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return {
        ok: false,
        code: "CONFLICT",
        message: "Duplicate column order for this board",
      };
    }
    throw e;
  }
}
