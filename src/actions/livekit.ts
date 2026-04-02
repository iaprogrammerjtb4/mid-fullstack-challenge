"use server";

import { TrackType } from "@livekit/protocol";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import {
  assertLiveKitServerConfigured,
  getLiveKitApiKey,
  getLiveKitApiSecret,
  getLiveKitHttpUrl,
  liveKitRoomNameForWorkspacePair,
  resolveLiveKitRoomName,
} from "@/lib/livekit-env";
import { isPmOrDeveloper, UserRole, type UserRoleType } from "@/lib/roles";

export type LiveKitTokenResult =
  | { ok: true; token: string; roomName: string; role: UserRoleType; isHost: boolean }
  | { ok: false; code: string; message: string };

function roomService(): RoomServiceClient {
  assertLiveKitServerConfigured();
  const host = getLiveKitHttpUrl()!;
  const key = getLiveKitApiKey()!;
  const secret = getLiveKitApiSecret()!;
  return new RoomServiceClient(host, key, secret);
}

function parseCoworkRoomId(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

export async function requestLiveKitTokenAction(
  boardId: unknown,
  coworkRoomId?: unknown,
): Promise<LiveKitTokenResult> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in required" };
  }
  const role = session.user.role;
  if (!isPmOrDeveloper(role)) {
    return { ok: false, code: "FORBIDDEN", message: "Voice room is for PM and Developer roles" };
  }

  const id = typeof boardId === "number" ? boardId : Number(boardId);
  if (!Number.isFinite(id) || id < 1) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid board id" };
  }

  const coworkId = parseCoworkRoomId(coworkRoomId);

  const db = getDb();
  const row = db
    .prepare(`SELECT id FROM boards WHERE id = ?`)
    .get(id) as { id: number } | undefined;
  if (!row) {
    return { ok: false, code: "NOT_FOUND", message: "Board not found" };
  }

  if (coworkId != null) {
    const cr = db
      .prepare(`SELECT id FROM cowork_rooms WHERE id = ? AND board_id = ?`)
      .get(coworkId, id) as { id: number } | undefined;
    if (!cr) {
      return { ok: false, code: "NOT_FOUND", message: "Cowork room not found on this board" };
    }
  }

  try {
    assertLiveKitServerConfigured();
  } catch (e) {
    return {
      ok: false,
      code: "CONFIG",
      message: e instanceof Error ? e.message : "LiveKit not configured",
    };
  }

  const roomName = resolveLiveKitRoomName(id, coworkId);
  const isHost = role === UserRole.PM;
  const identity = `user-${session.user.id}`;
  const displayName = session.user.email;
  const metadata = JSON.stringify({
    role,
    email: session.user.email,
    boardId: id,
    coworkRoomId: coworkId,
  });

  const at = new AccessToken(getLiveKitApiKey()!, getLiveKitApiSecret()!, {
    identity,
    name: displayName.slice(0, 128),
    metadata,
    ttl: "1h",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isHost,
  });

  const token = await at.toJwt();

  return {
    ok: true,
    token,
    roomName,
    role,
    isHost,
  };
}

export type MuteRemoteResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * PM (host) mutes another participant's microphone via LiveKit Server API.
 */
export async function muteRemoteParticipantMicAction(
  boardId: unknown,
  participantIdentity: string,
  coworkRoomId?: unknown,
): Promise<MuteRemoteResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in required" };
  }
  if (session.user.role !== UserRole.PM) {
    return { ok: false, code: "FORBIDDEN", message: "Only the host can mute others" };
  }

  const bid = typeof boardId === "number" ? boardId : Number(boardId);
  if (!Number.isFinite(bid) || bid < 1) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid board id" };
  }

  const identity = String(participantIdentity ?? "").trim();
  if (!identity || identity === `user-${session.user.id}`) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid participant" };
  }

  const coworkId = parseCoworkRoomId(coworkRoomId);
  const roomName = resolveLiveKitRoomName(bid, coworkId);

  try {
    assertLiveKitServerConfigured();
    const svc = roomService();
    const p = await svc.getParticipant(roomName, identity);
    const audio = p.tracks.find((t) => t.type === TrackType.AUDIO);
    if (!audio?.sid) {
      return { ok: false, code: "NO_TRACK", message: "No microphone track to mute" };
    }
    await svc.mutePublishedTrack(roomName, identity, audio.sid, true);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      code: "LIVEKIT_ERROR",
      message: e instanceof Error ? e.message : "LiveKit request failed",
    };
  }
}

/**
 * Token for a 1:1 workspace call room (same LiveKit room name for both users).
 */
export async function requestLiveKitWorkspaceCallTokenAction(
  peerUserId: unknown,
): Promise<LiveKitTokenResult> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in required" };
  }
  const role = session.user.role;
  if (!isPmOrDeveloper(role)) {
    return { ok: false, code: "FORBIDDEN", message: "Not allowed" };
  }

  const myId = Number(session.user.id);
  const peerId = typeof peerUserId === "number" ? peerUserId : Number(peerUserId);
  if (!Number.isFinite(peerId) || peerId < 1) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid user" };
  }
  if (peerId === myId) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Cannot call yourself" };
  }

  const db = getDb();
  const peer = db
    .prepare(`SELECT id, email FROM users WHERE id = ?`)
    .get(peerId) as { id: number; email: string } | undefined;
  if (!peer) {
    return { ok: false, code: "NOT_FOUND", message: "User not found" };
  }

  try {
    assertLiveKitServerConfigured();
  } catch (e) {
    return {
      ok: false,
      code: "CONFIG",
      message: e instanceof Error ? e.message : "LiveKit not configured",
    };
  }

  const roomName = liveKitRoomNameForWorkspacePair(myId, peerId);
  const isHost = role === UserRole.PM;
  const identity = `user-${session.user.id}`;
  const displayName = session.user.email;
  const metadata = JSON.stringify({
    role,
    email: session.user.email,
    workspaceCall: true,
    peerUserId: peerId,
    peerEmail: peer.email,
  });

  const at = new AccessToken(getLiveKitApiKey()!, getLiveKitApiSecret()!, {
    identity,
    name: displayName.slice(0, 128),
    metadata,
    ttl: "1h",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: isHost,
  });

  const token = await at.toJwt();

  return {
    ok: true,
    token,
    roomName,
    role,
    isHost,
  };
}

export async function muteRemoteWorkspaceParticipantAction(
  peerUserId: unknown,
  participantIdentity: string,
): Promise<MuteRemoteResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, code: "UNAUTHORIZED", message: "Sign in required" };
  }
  if (session.user.role !== UserRole.PM) {
    return { ok: false, code: "FORBIDDEN", message: "Only the host can mute others" };
  }

  const myId = Number(session.user.id);
  const peerId = typeof peerUserId === "number" ? peerUserId : Number(peerUserId);
  if (!Number.isFinite(peerId) || peerId < 1) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid user" };
  }

  const identity = String(participantIdentity ?? "").trim();
  if (!identity || identity === `user-${session.user.id}`) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Invalid participant" };
  }

  const roomName = liveKitRoomNameForWorkspacePair(myId, peerId);

  try {
    assertLiveKitServerConfigured();
    const svc = roomService();
    const p = await svc.getParticipant(roomName, identity);
    const audio = p.tracks.find((t) => t.type === TrackType.AUDIO);
    if (!audio?.sid) {
      return { ok: false, code: "NO_TRACK", message: "No microphone track to mute" };
    }
    await svc.mutePublishedTrack(roomName, identity, audio.sid, true);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      code: "LIVEKIT_ERROR",
      message: e instanceof Error ? e.message : "LiveKit request failed",
    };
  }
}
