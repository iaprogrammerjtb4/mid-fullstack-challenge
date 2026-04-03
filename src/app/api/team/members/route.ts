import { auth } from "@/auth";
import { jsonErr, jsonOk } from "@/lib/api-response";
import { sqlAll } from "@/lib/db";
import { isUserOnline, loadPresenceLastSeenMap } from "@/lib/presence";
import { isPmOrDeveloper } from "@/lib/roles";

type Row = { id: number; email: string; role: string };

export async function GET() {
  const session = await auth();
  if (!session?.user?.role || !isPmOrDeveloper(session.user.role)) {
    return jsonErr("FORBIDDEN", "Not allowed", 403);
  }

  const rows = await sqlAll<Row>(
    `SELECT id, email, role FROM users ORDER BY id ASC`,
  );

  const presence = await loadPresenceLastSeenMap();
  const now = Date.now();

  return jsonOk(
    rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      isOnline: isUserOnline(presence.get(r.id) ?? null, now),
    })),
  );
}
