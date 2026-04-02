import { auth } from "@/auth";
import { jsonErr, jsonOk } from "@/lib/api-response";
import { saveUserProfileAvatar } from "@/lib/user-avatar";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonErr("UNAUTHORIZED", "Sign in required", 401);
  }

  const idNum = Number(userId);
  if (!Number.isFinite(idNum)) {
    return jsonErr("INVALID_USER", "Invalid session", 400);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonErr("INVALID_BODY", "Expected multipart form data", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonErr("NO_FILE", "Choose an image file", 400);
  }

  const result = await saveUserProfileAvatar(idNum, file);
  if (!result.ok) {
    return jsonErr(result.code, result.message, result.status);
  }

  return jsonOk({ image: result.url });
}
