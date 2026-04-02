import { getPmApiUser } from "@/lib/require-api-user";
import { idParamSchema } from "@/lib/schemas";
import { jsonErr, jsonOk, jsonZodError } from "@/lib/api-response";
import { saveUserProfileAvatar } from "@/lib/user-avatar";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await getPmApiUser();
  if (auth.error) return auth.error;

  const { id: idStr } = await context.params;
  const idParsed = idParamSchema.safeParse(idStr);
  if (!idParsed.success) return jsonZodError(idParsed.error);

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

  const result = await saveUserProfileAvatar(idParsed.data, file);
  if (!result.ok) {
    return jsonErr(result.code, result.message, result.status);
  }

  return jsonOk({ image: result.url });
}
