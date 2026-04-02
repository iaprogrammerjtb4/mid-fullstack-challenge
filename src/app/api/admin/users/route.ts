import bcrypt from "bcryptjs";
import { getPmApiUser } from "@/lib/require-api-user";
import { adminCreateUserSchema } from "@/lib/schemas";
import { jsonErr, jsonOk, jsonZodError, readJsonBody } from "@/lib/api-response";
import { asNumber, getDb } from "@/lib/db";
import { isUserOnline, loadPresenceLastSeenMap } from "@/lib/presence";

type UserListRow = {
  id: number;
  email: string;
  role: string;
  image: string;
  created_at: string;
};

export async function GET() {
  const auth = await getPmApiUser();
  if (auth.error) return auth.error;

  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, email, role, image, created_at FROM users ORDER BY id ASC`,
    )
    .all() as UserListRow[];

  const presence = loadPresenceLastSeenMap(db);
  const now = Date.now();

  return jsonOk(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      image: r.image && r.image.trim() !== "" ? r.image.trim() : null,
      createdAt: r.created_at,
      isOnline: isUserOnline(presence.get(r.id) ?? null, now),
    })),
  );
}

export async function POST(request: Request) {
  const auth = await getPmApiUser();
  if (auth.error) return auth.error;

  const raw = await readJsonBody(request);
  const parsed = adminCreateUserSchema.safeParse(raw);
  if (!parsed.success) return jsonZodError(parsed.error);

  const email = parsed.data.email.trim().toLowerCase();
  const db = getDb();
  const taken = db
    .prepare(`SELECT id FROM users WHERE lower(email) = ?`)
    .get(email) as { id: number } | undefined;
  if (taken) {
    return jsonErr("EMAIL_TAKEN", "That email is already registered", 409);
  }

  const hash = bcrypt.hashSync(parsed.data.password, 10);
  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, role, image) VALUES (?, ?, ?, '')`,
    )
    .run(email, hash, parsed.data.role);

  const id = asNumber(info.lastInsertRowid);
  const row = db
    .prepare(
      `SELECT id, email, role, image, created_at FROM users WHERE id = ?`,
    )
    .get(id) as {
      id: number;
      email: string;
      role: string;
      image: string;
      created_at: string;
    };

  return jsonOk({
    id: row.id,
    email: row.email,
    role: row.role,
    image: row.image && row.image.trim() !== "" ? row.image.trim() : null,
    createdAt: row.created_at,
    isOnline: false,
  });
}
