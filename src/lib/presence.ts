import type { DatabaseSync } from "node:sqlite";

/** Consider a user online if heartbeat arrived within this window. */
export const PRESENCE_ONLINE_MS = 90_000;

export function isUserOnline(
  lastSeenMs: number | null | undefined,
  now = Date.now(),
): boolean {
  if (lastSeenMs == null || !Number.isFinite(lastSeenMs)) return false;
  return now - lastSeenMs < PRESENCE_ONLINE_MS;
}

export function loadPresenceLastSeenMap(db: DatabaseSync): Map<number, number> {
  const rows = db
    .prepare(`SELECT user_id, last_seen_ms FROM user_presence`)
    .all() as { user_id: number; last_seen_ms: number }[];
  return new Map(rows.map((r) => [r.user_id, r.last_seen_ms]));
}
