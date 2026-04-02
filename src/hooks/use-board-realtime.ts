"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type RefObject,
} from "react";
import { io, type Socket } from "socket.io-client";
import { getChatSocketUrl } from "@/lib/chat-socket-url";

/**
 * Subscribes to board data refresh events on the chat Socket.io server.
 * After local mutations, call notifyOthers(boardId) so other clients refetch the board.
 */
export function useBoardRealtime(
  boardId: number | null,
  onSilentRefresh: () => void | Promise<void>,
  /** When true, ignore remote refresh (e.g. while dragging a card). */
  draggingRef: RefObject<boolean | null>,
) {
  const refreshRef = useRef(onSilentRefresh);

  useEffect(() => {
    refreshRef.current = onSilentRefresh;
  }, [onSilentRefresh]);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (boardId === null || !Number.isFinite(boardId) || boardId <= 0) {
      return;
    }

    const url = getChatSocketUrl();
    const socket = io(url, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 8,
      reconnectionDelay: 600,
    });
    socketRef.current = socket;

    const onConnect = () => {
      socket.emit("board:join", boardId);
    };

    const onRefresh = (payload: { boardId?: number }) => {
      if (payload?.boardId !== boardId) return;
      if (draggingRef.current) return;
      void refreshRef.current();
    };

    socket.on("connect", onConnect);
    socket.on("board:data:refresh", onRefresh);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("board:data:refresh", onRefresh);
      socket.emit("board:leave");
      socket.disconnect();
      socketRef.current = null;
    };
    // draggingRef: stable ref; read .current inside handler only
    // eslint-disable-next-line react-hooks/exhaustive-deps -- draggingRef identity is stable
  }, [boardId]);

  const notifyOthers = useCallback((bid: number) => {
    const s = socketRef.current;
    if (!s) return;
    const emit = () => {
      if (s.connected) s.emit("board:notify", { boardId: bid });
    };
    if (s.connected) emit();
    else s.once("connect", emit);
  }, []);

  return { notifyOthers };
}
