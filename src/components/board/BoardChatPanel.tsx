"use client";

import { GripVertical, MessageSquare, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getChatSocketUrl } from "@/lib/chat-socket-url";

export type ChatMessage = {
  boardId: number;
  email: string;
  text: string;
  ts: number;
};

type Props = {
  boardId: number;
  userEmail: string;
  onClose: () => void;
  labels: {
    title: string;
    /** Shown under title (e.g. current board while navigating). */
    boardCaption?: string;
    placeholder: string;
    send: string;
    empty: string;
    typingOne: string;
    typingMany: string;
    offline: string;
    dragHint: string;
  };
};

export function BoardChatPanel({ boardId, userEmail, onClose, labels }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const emitTypingStop = useCallback(() => {
    const s = socketRef.current;
    if (s?.connected) {
      s.emit("typing:stop", { boardId, email: userEmail });
    }
  }, [boardId, userEmail]);

  useEffect(() => {
    const timeoutMap = typingTimeoutsRef.current;
    const url = getChatSocketUrl();
    const socket = io(url, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 800,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("board:join", boardId);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("connect_error", () => {
      setConnected(false);
    });

    socket.on("chat:message", (payload: ChatMessage) => {
      if (payload?.boardId !== boardId) return;
      setMessages((m) => [...m, payload]);
    });

    socket.on("typing:user", (payload: { boardId: number; email: string }) => {
      if (payload.boardId !== boardId || payload.email === userEmail) return;
      setTypingNames((prev) => {
        if (prev.includes(payload.email)) return prev;
        return [...prev, payload.email];
      });
      const existing = timeoutMap.get(payload.email);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => {
        setTypingNames((prev) => prev.filter((e) => e !== payload.email));
        timeoutMap.delete(payload.email);
      }, 2800);
      timeoutMap.set(payload.email, t);
    });

    socket.on("typing:stop", (payload: { boardId: number; email: string }) => {
      if (payload.boardId !== boardId) return;
      const existing = timeoutMap.get(payload.email);
      if (existing) clearTimeout(existing);
      timeoutMap.delete(payload.email);
      setTypingNames((prev) => prev.filter((e) => e !== payload.email));
    });

    return () => {
      emitTypingStop();
      socket.emit("board:leave");
      socket.disconnect();
      socketRef.current = null;
      timeoutMap.forEach(clearTimeout);
      timeoutMap.clear();
    };
  }, [boardId, userEmail, emitTypingStop]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function onDraftChange(v: string) {
    setDraft(v);
    const s = socketRef.current;
    if (!s?.connected) return;
    s.emit("typing:start", { boardId, email: userEmail });
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    typingStopRef.current = setTimeout(() => {
      emitTypingStop();
    }, 1500);
  }

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !socketRef.current?.connected) return;
    emitTypingStop();
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
    const payload: ChatMessage = {
      boardId,
      email: userEmail,
      text,
      ts: Date.now(),
    };
    socketRef.current.emit("chat:message", payload);
    setDraft("");
  }

  function typingLine() {
    if (typingNames.length === 0) return null;
    if (typingNames.length === 1) {
      return labels.typingOne.replace("{name}", typingNames[0]);
    }
    return labels.typingMany;
  }

  function onHeaderPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y,
    };
  }

  function onHeaderPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
    });
  }

  function onHeaderPointerUp(e: React.PointerEvent) {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className="fixed z-[94] flex w-[calc(100vw-1.25rem)] max-w-[min(20rem,calc(100vw-1.25rem))] flex-col rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.2)] dark:border-slate-600 dark:bg-slate-900 sm:max-w-[20rem] sm:w-[min(100vw-1.5rem,20rem)]"
      style={{
        left: "max(0.625rem, env(safe-area-inset-left))",
        bottom: "max(0.625rem, env(safe-area-inset-bottom))",
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        maxHeight: "min(420px, 58dvh)",
      }}
      role="dialog"
      aria-label={labels.title}
    >
      <div
        className="flex cursor-grab items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
        onPointerCancel={onHeaderPointerUp}
      >
        <GripVertical className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <MessageSquare className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
            {labels.title}
          </p>
          {labels.boardCaption ? (
            <p className="truncate text-[10px] font-medium text-sky-600 dark:text-sky-400">
              {labels.boardCaption}
            </p>
          ) : null}
          <p className="truncate text-[10px] text-slate-500">{labels.dragHint}</p>
        </div>
        {!connected ? (
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
            offline
          </span>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!connected ? (
        <p className="border-b border-slate-100 px-3 py-2 text-[11px] text-amber-800 dark:border-slate-800 dark:text-amber-200">
          {labels.offline}
        </p>
      ) : null}

      <div
        ref={listRef}
        className="min-h-[140px] flex-1 space-y-2 overflow-y-auto px-3 py-2"
      >
        {messages.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">{labels.empty}</p>
        ) : (
          messages.map((m, i) => (
            <div
              key={`${m.ts}-${i}`}
              className={`rounded-lg px-2.5 py-1.5 text-xs ${
                m.email === userEmail
                  ? "ml-4 bg-sky-600 text-white dark:bg-sky-700"
                  : "mr-4 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100"
              }`}
            >
              <p className="text-[10px] font-semibold opacity-80">{m.email}</p>
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
            </div>
          ))
        )}
      </div>

      {typingNames.length > 0 ? (
        <p className="px-3 pb-1 text-[10px] italic text-slate-500 dark:text-slate-400">
          {typingLine()}
        </p>
      ) : null}

      <form
        onSubmit={send}
        className="flex gap-2 border-t border-slate-200 p-2 dark:border-slate-700"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onBlur={() => emitTypingStop()}
          placeholder={labels.placeholder}
          disabled={!connected}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-40 dark:bg-sky-600"
          title={labels.send}
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
