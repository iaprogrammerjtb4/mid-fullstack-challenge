import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiErrBody = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data } satisfies ApiSuccess<T>, {
    status,
  });
}

export function jsonErr(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  const body: ApiErrBody = {
    ok: false,
    error: details !== undefined ? { code, message, details } : { code, message },
  };
  return NextResponse.json(body, { status });
}

export function jsonZodError(error: ZodError) {
  return jsonErr("VALIDATION_ERROR", "Invalid input", 400, error.flatten());
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
