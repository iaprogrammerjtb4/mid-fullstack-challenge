import fs from "fs";
import path from "path";
import { sqlGet, sqlRun } from "@/lib/db";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

export const PROFILE_UPLOAD_DIR = path.join(
  process.cwd(),
  "public",
  "uploads",
  "profiles",
);

export function unlinkProfileImage(publicPath: string | null | undefined) {
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

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return {
      ok: false,
      code: "INVALID_TYPE",
      message: "Use JPEG, PNG, or WebP",
      status: 400,
    };
  }

  if (!fs.existsSync(PROFILE_UPLOAD_DIR)) {
    fs.mkdirSync(PROFILE_UPLOAD_DIR, { recursive: true });
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
    unlinkProfileImage(prev.image);
  }

  const filename = `${userId}${ext}`;
  const diskPath = path.join(PROFILE_UPLOAD_DIR, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(diskPath, buf);

  const publicUrl = `/uploads/profiles/${filename}`;
  await sqlRun(`UPDATE users SET image = ? WHERE id = ?`, [publicUrl, userId]);

  return { ok: true, url: publicUrl };
}
