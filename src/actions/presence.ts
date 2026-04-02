"use server";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";

/**
 * Updates last-seen for the signed-in user (call periodically while the app is open).
 */
export async function presenceHeartbeatAction(): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false };
  }
  const id = Number(session.user.id);
  if (!Number.isFinite(id) || id < 1) {
    return { ok: false };
  }

  const db = getDb();
  const now = Date.now();
  db.prepare(
    `INSERT INTO user_presence (user_id, last_seen_ms) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET last_seen_ms = excluded.last_seen_ms`,
  ).run(id, now);

  return { ok: true };
}
