import fs from "fs";
import path from "path";
import { getStoredUserAvatar, sqlGet, sqlRun } from "@/lib/db";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

function unlinkLegacyProfileImage(publicPath: string | null | undefined) {
  if (!publicPath || !publicPath.startsWith("/uploads/profiles/")) return;
  const rel = publicPath.slice(1);
  const full = path.join(process.cwd(), "public", rel);
  if (fs.existsSync(full)) {
    try {
      fs.unlinkSync(full);
    } catch {
      /* ignore */
    }
  }
}

export type SaveAvatarResult =
  | { ok: true; url: string }
  | {
      ok: false;
      code: string;
      message: string;
      status: number;
    };

export function avatarPublicUrl(userId: number, version = Date.now()): string {
  return `/api/users/${userId}/avatar?v=${version}`;
}

export async function clearUserProfileAvatar(
  userId: number,
  currentImage: string | null | undefined,
) {
  if (currentImage) {
    unlinkLegacyProfileImage(currentImage);
  }
  await sqlRun(`DELETE FROM user_avatars WHERE user_id = ?`, [userId]);
  await sqlRun(`UPDATE users SET image = '' WHERE id = ?`, [userId]);
}

export async function loadUserProfileAvatar(userId: number) {
  return getStoredUserAvatar(userId);
}

export async function saveUserProfileAvatar(
  userId: number,
  file: File,
): Promise<SaveAvatarResult> {
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      code: "NO_FILE",
      message: "Choose an image file",
      status: 400,
    };
  }

  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "Image must be 2 MB or smaller",
      status: 400,
    };
  }

  if (!ALLOWED.has(file.type)) {
    return {
      ok: false,
      code: "INVALID_TYPE",
      message: "Use JPEG, PNG, or WebP",
      status: 400,
    };
  }

  const prev = await sqlGet<{ image: string }>(
    `SELECT image FROM users WHERE id = ?`,
    [userId],
  );
  if (!prev) {
    return {
      ok: false,
      code: "NOT_FOUND",
      message: "User not found",
      status: 404,
    };
  }

  if (prev.image) {
    unlinkLegacyProfileImage(prev.image);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  await sqlRun(
    `
      INSERT INTO user_avatars (user_id, mime_type, content, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        mime_type = excluded.mime_type,
        content = excluded.content,
        updated_at = datetime('now')
    `,
    [userId, file.type, buf],
  );

  const publicUrl = avatarPublicUrl(userId);
  await sqlRun(`UPDATE users SET image = ? WHERE id = ?`, [publicUrl, userId]);

  return { ok: true, url: publicUrl };
}
