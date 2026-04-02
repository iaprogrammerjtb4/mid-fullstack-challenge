import { createColumnSchema } from "@/lib/schemas";
import {
  jsonErr,
  jsonOk,
  jsonZodError,
  readJsonBody,
} from "@/lib/api-response";
import { asNumber, getDb } from "@/lib/db";
import { getApiUser } from "@/lib/require-api-user";
import { UserRole } from "@/lib/roles";

type ColumnRow = {
  id: number;
  board_id: number;
  name: string;
  display_order: number;
};

export async function POST(request: Request) {
  const authResult = await getApiUser();
  if (authResult.error) return authResult.error;
  if (authResult.user.role !== UserRole.PM) {
    return jsonErr("FORBIDDEN", "Only PM can create columns", 403);
  }

  const raw = await readJsonBody(request);
  const parsed = createColumnSchema.safeParse(raw);
  if (!parsed.success) return jsonZodError(parsed.error);

  const db = getDb();
  const board = db
    .prepare(`SELECT id FROM boards WHERE id = ?`)
    .get(parsed.data.boardId);
  if (!board) return jsonErr("NOT_FOUND", "Board not found", 404);

  const existingOrder = db
    .prepare(
      `SELECT id FROM columns WHERE board_id = ? AND display_order = ?`,
    )
    .get(parsed.data.boardId, parsed.data.displayOrder);
  if (existingOrder) {
    return jsonErr(
      "CONFLICT",
      "A column with this display order already exists on the board",
      409,
    );
  }

  try {
    const info = db
      .prepare(
        `INSERT INTO columns (board_id, name, display_order) VALUES (?, ?, ?)`,
      )
      .run(parsed.data.boardId, parsed.data.name, parsed.data.displayOrder);
    const row = db
      .prepare(
        `SELECT id, board_id, name, display_order FROM columns WHERE id = ?`,
      )
      .get(asNumber(info.lastInsertRowid)) as ColumnRow;
    return jsonOk({
      id: row.id,
      boardId: row.board_id,
      name: row.name,
      displayOrder: row.display_order,
    }, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("UNIQUE")) {
      return jsonErr(
        "CONFLICT",
        "Duplicate column order for this board",
        409,
      );
    }
    throw e;
  }
}
