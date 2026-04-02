/**
 * LiveKit env helpers. Never commit API secrets — use .env locally.
 * Server: LIVEKIT_URL (wss://...) or derive from NEXT_PUBLIC_LIVEKIT_URL.
 * Client: NEXT_PUBLIC_LIVEKIT_URL (wss://...).
 */

function normalizeWsUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith("wss://") || t.startsWith("ws://")) return t;
  if (t.startsWith("https://")) return `wss://${t.slice("https://".length)}`;
  if (t.startsWith("http://")) return `ws://${t.slice("http://".length)}`;
  return `wss://${t}`;
}

/** WebSocket URL for the browser (LiveKitRoom). */
export function getLiveKitPublicWsUrl(): string | null {
  const pub = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim();
  const fallback = process.env.LIVEKIT_URL?.trim();
  const raw = pub || fallback;
  if (!raw) return null;
  return normalizeWsUrl(raw);
}

/** HTTPS host for RoomServiceClient (Twirp API). */
export function getLiveKitHttpUrl(): string | null {
  const ws = getLiveKitPublicWsUrl();
  if (!ws) return null;
  return ws.replace(/^wss:/, "https:").replace(/^ws:/, "http:");
}

export function getLiveKitApiKey(): string | null {
  const k = process.env.LIVEKIT_API_KEY?.trim();
  return k || null;
}

export function getLiveKitApiSecret(): string | null {
  const s = process.env.LIVEKIT_API_SECRET?.trim();
  return s || null;
}

export function assertLiveKitServerConfigured(): void {
  if (!getLiveKitHttpUrl() || !getLiveKitApiKey() || !getLiveKitApiSecret()) {
    throw new Error(
      "LiveKit is not configured. Set LIVEKIT_URL (or NEXT_PUBLIC_LIVEKIT_URL), LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
    );
  }
}

export function liveKitRoomNameForBoard(boardId: number): string {
  return `kanban-board-${boardId}`;
}

/** Dedicated LiveKit room for a cowork / pair-programming sala on a board. */
export function liveKitRoomNameForCowork(boardId: number, coworkRoomId: number): string {
  return `kanban-board-${boardId}-cowork-${coworkRoomId}`;
}

export function resolveLiveKitRoomName(
  boardId: number,
  coworkRoomId: number | null,
): string {
  if (coworkRoomId != null) {
    return liveKitRoomNameForCowork(boardId, coworkRoomId);
  }
  return liveKitRoomNameForBoard(boardId);
}

/** Stable 1:1 room for two workspace users (admin / team calls). */
export function liveKitRoomNameForWorkspacePair(
  userIdA: number,
  userIdB: number,
): string {
  const x = Math.min(userIdA, userIdB);
  const y = Math.max(userIdA, userIdB);
  return `workspace-users-${x}-${y}`;
}
