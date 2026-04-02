import { createBoardSchema } from "@/lib/schemas";
import { jsonOk, jsonZodError, readJsonBody } from "@/lib/api-response";
import { asNumber, getDb } from "@/lib/db";

type BoardRow = { id: number; name: string; created_at: string };

function mapBoard(row: BoardRow) {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export async function GET() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, created_at FROM boards ORDER BY datetime(created_at) DESC`,
    )
    .all() as BoardRow[];
  return jsonOk(rows.map(mapBoard));
}

export async function POST(request: Request) {
  const raw = await readJsonBody(request);
  const parsed = createBoardSchema.safeParse(raw);
  if (!parsed.success) return jsonZodError(parsed.error);

  const db = getDb();
  const info = db.prepare(`INSERT INTO boards (name) VALUES (?)`).run(
    parsed.data.name,
  );
  const row = db
    .prepare(`SELECT id, name, created_at FROM boards WHERE id = ?`)
    .get(asNumber(info.lastInsertRowid)) as BoardRow;
  return jsonOk(mapBoard(row), 201);
}
