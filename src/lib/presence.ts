import { sqlAll } from "@/lib/db";

/** Consider a user online if heartbeat arrived within this window. */
export const PRESENCE_ONLINE_MS = 90_000;

export function isUserOnline(
  lastSeenMs: number | null | undefined,
  now = Date.now(),
): boolean {
  if (lastSeenMs == null || !Number.isFinite(lastSeenMs)) return false;
  return now - lastSeenMs < PRESENCE_ONLINE_MS;
}

export async function loadPresenceLastSeenMap(): Promise<Map<number, number>> {
  const rows = await sqlAll<{ user_id: number; last_seen_ms: number }>(
    `SELECT user_id, last_seen_ms FROM user_presence`,
  );
  return new Map(rows.map((r) => [r.user_id, r.last_seen_ms]));
}
