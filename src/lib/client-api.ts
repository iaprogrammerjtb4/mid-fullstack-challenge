import type { ApiErrBody, ApiSuccess } from "./api-response";

type ApiResult<T> = ApiSuccess<T> | ApiErrBody;

export async function apiJson<T>(res: Response): Promise<ApiResult<T>> {
  try {
    return (await res.json()) as ApiResult<T>;
  } catch {
    return {
      ok: false,
      error: { code: "PARSE_ERROR", message: "Invalid JSON response" },
    };
  }
}
