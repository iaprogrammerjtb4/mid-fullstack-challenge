import { createBoardSchema } from "@/lib/schemas";
import { jsonErr, jsonOk, jsonZodError, readJsonBody } from "@/lib/api-response";
import { asNumber, getDb } from "@/lib/db";
import { getApiUser } from "@/lib/require-api-user";
import { UserRole } from "@/lib/roles";

type BoardRow = { id: number; name: string; created_at: string };

function mapBoard(row: BoardRow) {
  return { id: row.id, name: row.name, createdAt: row.created_at };
}

export async function GET() {
  const authResult = await getApiUser();
  if (authResult.error) return authResult.error;

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, created_at FROM boards ORDER BY datetime(created_at) DESC`,
    )
    .all() as BoardRow[];
  return jsonOk(rows.map(mapBoard));
}

export async function POST(request: Request) {
  const authResult = await getApiUser();
  if (authResult.error) return authResult.error;
  if (authResult.user.role !== UserRole.PM) {
    return jsonErr("FORBIDDEN", "Only PM can create boards", 403);
  }

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
