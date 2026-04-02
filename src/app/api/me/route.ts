import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { jsonErr, jsonOk, jsonZodError, readJsonBody } from "@/lib/api-response";
import { getDb } from "@/lib/db";

const patchBodySchema = z
  .object({
    currentPassword: z.string().min(1),
    email: z.string().email().optional(),
    newPassword: z.string().optional(),
    confirmPassword: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const emailChange =
      data.email !== undefined && data.email.trim().length > 0;
    const pwChange = (data.newPassword ?? "").length > 0;
    if (!emailChange && !pwChange) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide a new email or a new password",
        path: [],
      });
    }
    if (pwChange) {
      if ((data.newPassword?.length ?? 0) < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password must be at least 8 characters",
          path: ["newPassword"],
        });
      }
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passwords do not match",
          path: ["confirmPassword"],
        });
      }
    }
  });

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return jsonErr("UNAUTHORIZED", "Sign in required", 401);
  }

  const raw = await readJsonBody(request);
  const parsed = patchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return jsonZodError(parsed.error);
  }

  const { currentPassword, email, newPassword } = parsed.data;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, email, password_hash FROM users WHERE id = ?`,
    )
    .get(Number(userId)) as
    | { id: number; email: string; password_hash: string }
    | undefined;

  if (!row) {
    return jsonErr("NOT_FOUND", "User not found", 404);
  }

  const passwordOk = bcrypt.compareSync(currentPassword, row.password_hash);
  if (!passwordOk) {
    return jsonErr("INVALID_PASSWORD", "Current password is incorrect", 400);
  }

  const normalizedInput =
    email !== undefined && email.trim().length > 0
      ? email.trim().toLowerCase()
      : null;
  const wantsEmailChange =
    normalizedInput !== null &&
    normalizedInput !== row.email.toLowerCase();
  const wantsPasswordChange = (newPassword ?? "").length > 0;
  if (!wantsEmailChange && !wantsPasswordChange) {
    return jsonErr("NO_CHANGES", "Nothing to update", 400);
  }

  let nextEmail = row.email;

  if (wantsEmailChange && normalizedInput) {
    const taken = db
      .prepare(`SELECT id FROM users WHERE lower(email) = ? AND id != ?`)
      .get(normalizedInput, row.id) as { id: number } | undefined;
    if (taken) {
      return jsonErr("EMAIL_TAKEN", "That email is already in use", 409);
    }
    db.prepare(`UPDATE users SET email = ? WHERE id = ?`).run(
      normalizedInput,
      row.id,
    );
    nextEmail = normalizedInput;
  }

  if (wantsPasswordChange) {
    const hash = bcrypt.hashSync(newPassword!, 10);
    db.prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(
      hash,
      row.id,
    );
  }

  return jsonOk({ email: nextEmail });
}
