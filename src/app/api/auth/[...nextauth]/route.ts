import { handlers } from "@/auth";

/** Auth + bcrypt + DB must run on Node, not Edge (Vercel). */
export const runtime = "nodejs";

export const { GET, POST } = handlers;
