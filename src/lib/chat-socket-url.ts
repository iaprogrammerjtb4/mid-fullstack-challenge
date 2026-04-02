export function getChatSocketUrl(): string {
  if (typeof process.env.NEXT_PUBLIC_CHAT_SOCKET_URL === "string") {
    return process.env.NEXT_PUBLIC_CHAT_SOCKET_URL.replace(/\/$/, "");
  }
  return "http://localhost:3001";
}
