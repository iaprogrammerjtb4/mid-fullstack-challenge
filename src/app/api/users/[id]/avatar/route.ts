import { idParamSchema } from "@/lib/schemas";
import { loadUserProfileAvatar } from "@/lib/user-avatar";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await context.params;
  const parsed = idParamSchema.safeParse(idStr);
  if (!parsed.success) {
    return new Response("Invalid user id", { status: 400 });
  }

  const avatar = await loadUserProfileAvatar(parsed.data);
  if (!avatar) {
    return new Response("Avatar not found", { status: 404 });
  }

  const body = new Uint8Array(avatar.content);

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": avatar.mimeType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
