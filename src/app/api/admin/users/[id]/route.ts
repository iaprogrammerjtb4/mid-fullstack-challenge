import bcrypt from "bcryptjs";
import { getPmApiUser } from "@/lib/require-api-user";
import {
  adminPatchUserSchema,
  idParamSchema,
} from "@/lib/schemas";
import { jsonErr, jsonOk, jsonZodError, readJsonBody } from "@/lib/api-response";
import { asNumber, sqlGet, sqlRun } from "@/lib/db";
import { isUserOnline, loadPresenceLastSeenMap } from "@/lib/presence";
import { unlinkProfileImage } from "@/lib/user-avatar";

async function countProductManagers(): Promise<number> {
  const row = await sqlGet<{ n: number | bigint }>(
    `SELECT COUNT(*) AS n FROM users WHERE role = 'PM'`,
  );
  return row ? asNumber(row.n) : 0;
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

  const target = await sqlGet<{
    id: number;
    email: string;
    role: string;
    image: string;
  }>(`SELECT id, email, role, image FROM users WHERE id = ?`, [userId]);

  if (!target) {
    return jsonErr("NOT_FOUND", "User not found", 404);
  }

  if (
    parsed.data.role === "DEVELOPER" &&
    target.role === "PM" &&
    (await countProductManagers()) <= 1
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
      const taken = await sqlGet<{ id: number }>(
        `SELECT id FROM users WHERE lower(email) = ? AND id != ?`,
        [normalized, userId],
      );
      if (taken) {
        return jsonErr("EMAIL_TAKEN", "That email is already in use", 409);
      }
      await sqlRun(`UPDATE users SET email = ? WHERE id = ?`, [
        normalized,
        userId,
      ]);
    }
  }

  if (parsed.data.role !== undefined) {
    await sqlRun(`UPDATE users SET role = ? WHERE id = ?`, [
      parsed.data.role,
      userId,
    ]);
  }

  if (parsed.data.newPassword !== undefined) {
    const hash = bcrypt.hashSync(parsed.data.newPassword, 10);
    await sqlRun(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      hash,
      userId,
    ]);
  }

  if (parsed.data.clearImage === true) {
    if (target.image) {
      unlinkProfileImage(target.image);
    }
    await sqlRun(`UPDATE users SET image = ? WHERE id = ?`, ["", userId]);
  }

  const row = await sqlGet<{
    id: number;
    email: string;
    role: string;
    image: string;
    created_at: string;
  }>(`SELECT id, email, role, image, created_at FROM users WHERE id = ?`, [
    userId,
  ]);
  if (!row) {
    return jsonErr("NOT_FOUND", "User not found after update", 404);
  }

  const presence = await loadPresenceLastSeenMap();
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
