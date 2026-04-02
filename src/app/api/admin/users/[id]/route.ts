import bcrypt from "bcryptjs";
import { getPmApiUser } from "@/lib/require-api-user";
import {
  adminPatchUserSchema,
  idParamSchema,
} from "@/lib/schemas";
import { jsonErr, jsonOk, jsonZodError, readJsonBody } from "@/lib/api-response";
import { asNumber, getDb } from "@/lib/db";
import { isUserOnline, loadPresenceLastSeenMap } from "@/lib/presence";
import { unlinkProfileImage } from "@/lib/user-avatar";

function countProductManagers(db: ReturnType<typeof getDb>): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS n FROM users WHERE role = 'PM'`)
    .get() as { n: number | bigint };
  return asNumber(row.n);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getPmApiUser();
  if (auth.error) return auth.error;

  const { id: idStr } = await context.params;
  const idParsed = idParamSchema.safeParse(idStr);
  if (!idParsed.success) return jsonZodError(idParsed.error);
  const userId = idParsed.data;

  const raw = await readJsonBody(request);
  const parsed = adminPatchUserSchema.safeParse(raw);
  if (!parsed.success) return jsonZodError(parsed.error);

  const db = getDb();
  const target = db
    .prepare(`SELECT id, email, role, image FROM users WHERE id = ?`)
    .get(userId) as
    | { id: number; email: string; role: string; image: string }
    | undefined;

  if (!target) {
    return jsonErr("NOT_FOUND", "User not found", 404);
  }

  if (
    parsed.data.role === "DEVELOPER" &&
    target.role === "PM" &&
    countProductManagers(db) <= 1
  ) {
    return jsonErr(
      "LAST_PM",
      "Cannot remove the last Product Manager from the workspace",
      400,
    );
  }

  if (parsed.data.email !== undefined) {
    const normalized = parsed.data.email.trim().toLowerCase();
    if (normalized !== target.email.toLowerCase()) {
      const taken = db
        .prepare(`SELECT id FROM users WHERE lower(email) = ? AND id != ?`)
        .get(normalized, userId) as { id: number } | undefined;
      if (taken) {
        return jsonErr("EMAIL_TAKEN", "That email is already in use", 409);
      }
      db.prepare(`UPDATE users SET email = ? WHERE id = ?`).run(
        normalized,
        userId,
      );
    }
  }

  if (parsed.data.role !== undefined) {
    db.prepare(`UPDATE users SET role = ? WHERE id = ?`).run(
      parsed.data.role,
      userId,
    );
  }

  if (parsed.data.newPassword !== undefined) {
    const hash = bcrypt.hashSync(parsed.data.newPassword, 10);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(
      hash,
      userId,
    );
  }

  if (parsed.data.clearImage === true) {
    if (target.image) {
      unlinkProfileImage(target.image);
    }
    db.prepare(`UPDATE users SET image = ? WHERE id = ?`).run("", userId);
  }

  const row = db
    .prepare(`SELECT id, email, role, image, created_at FROM users WHERE id = ?`)
    .get(userId) as {
      id: number;
      email: string;
      role: string;
      image: string;
      created_at: string;
    };

  const presence = loadPresenceLastSeenMap(db);
  const now = Date.now();

  return jsonOk({
    id: row.id,
    email: row.email,
    role: row.role,
    image: row.image && row.image.trim() !== "" ? row.image.trim() : null,
    createdAt: row.created_at,
    isOnline: isUserOnline(presence.get(row.id) ?? null, now),
  });
}
