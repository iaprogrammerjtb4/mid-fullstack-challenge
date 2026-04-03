import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/auth";
import { jsonErr, jsonOk, jsonZodError, readJsonBody } from "@/lib/api-response";
import { sqlGet, sqlRun } from "@/lib/db";

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
  const row = await sqlGet<{
    id: number;
    email: string;
    password_hash: string;
  }>(`SELECT id, email, password_hash FROM users WHERE id = ?`, [
    Number(userId),
  ]);

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
    const taken = await sqlGet<{ id: number }>(
      `SELECT id FROM users WHERE lower(email) = ? AND id != ?`,
      [normalizedInput, row.id],
    );
    if (taken) {
      return jsonErr("EMAIL_TAKEN", "That email is already in use", 409);
    }
    await sqlRun(`UPDATE users SET email = ? WHERE id = ?`, [
      normalizedInput,
      row.id,
    ]);
    nextEmail = normalizedInput;
  }

  if (wantsPasswordChange) {
    const hash = bcrypt.hashSync(newPassword!, 10);
    await sqlRun(`UPDATE users SET password_hash = ? WHERE id = ?`, [
      hash,
      row.id,
    ]);
  }

  return jsonOk({ email: nextEmail });
}
