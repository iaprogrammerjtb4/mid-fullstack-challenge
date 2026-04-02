/**
 * Real-time board chat + board data sync (Socket.io). Run alongside Next.js:
 *   bun run socket
 *   npm run socket
 *
 * Set NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:3001 in .env.local
 *
 * Board sync: clients emit `board:notify` after a successful mutation; the server
 * broadcasts `board:data:refresh` to everyone else in that board room so they refetch.
 */

import { createServer } from "node:http";
import { Server } from "socket.io";

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Kanban board chat socket — connect via Socket.io client\n");
});

const io = new Server(httpServer, {
  cors: { origin: true, methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
  let currentRoom: string | null = null;

  socket.on("board:join", (boardId: unknown) => {
    const id = Number(boardId);
    if (!Number.isFinite(id) || id <= 0) return;
    if (currentRoom) socket.leave(currentRoom);
    currentRoom = `board:${id}`;
    socket.join(currentRoom);
  });

  socket.on("board:leave", () => {
    if (currentRoom) socket.leave(currentRoom);
    currentRoom = null;
  });

  socket.on("board:notify", (payload: { boardId?: unknown }) => {
    const id = Number(payload?.boardId);
    if (!Number.isFinite(id) || id <= 0) return;
    socket.broadcast.to(`board:${id}`).emit("board:data:refresh", {
      boardId: id,
    });
  });

  socket.on(
    "chat:message",
    (payload: {
      boardId: number;
      email: string;
      text: string;
      ts: number;
    }) => {
      if (
        !payload ||
        !Number.isFinite(payload.boardId) ||
        typeof payload.email !== "string" ||
        typeof payload.text !== "string"
      ) {
        return;
      }
      const trimmed = payload.text.trim().slice(0, 2000);
      if (!trimmed) return;
      io.to(`board:${payload.boardId}`).emit("chat:message", {
        boardId: payload.boardId,
        email: payload.email.slice(0, 200),
        text: trimmed,
        ts: payload.ts || Date.now(),
      });
    },
  );

  socket.on("typing:start", (payload: { boardId: number; email: string }) => {
    if (!payload?.boardId || !payload?.email) return;
    socket.to(`board:${payload.boardId}`).emit("typing:user", {
      boardId: payload.boardId,
      email: payload.email.slice(0, 200),
    });
  });

  socket.on("typing:stop", (payload: { boardId: number; email: string }) => {
    if (!payload?.boardId || !payload?.email) return;
    socket.to(`board:${payload.boardId}`).emit("typing:stop", {
      boardId: payload.boardId,
      email: payload.email.slice(0, 200),
    });
  });

  socket.on("disconnect", () => {
    currentRoom = null;
  });
});

const PORT = Number(process.env.SOCKET_CHAT_PORT ?? 3001);
httpServer.listen(PORT, () => {
  console.log(`[socket-chat] http://localhost:${PORT}`);
});
