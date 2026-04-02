import { auth } from "@/auth";
import { jsonErr } from "@/lib/api-response";
import { UserRole, type UserRoleType } from "@/lib/roles";

export type ApiUser = {
  id: string;
  email: string;
  role: UserRoleType;
};

export async function getApiUser(): Promise<
  { user: ApiUser; error: null } | { user: null; error: Response }
> {
  const session = await auth();
  const u = session?.user;
  if (!u?.email || !u.role || !u.id) {
    return {
      user: null,
      error: jsonErr("UNAUTHORIZED", "Authentication required", 401),
    };
  }
  return {
    user: { id: u.id, email: u.email, role: u.role },
    error: null,
  };
}

export async function getPmApiUser(): Promise<
  { user: ApiUser; error: null } | { user: null; error: Response }
> {
  const base = await getApiUser();
  if (base.error) return { user: null, error: base.error };
  if (base.user.role !== UserRole.PM) {
    return {
      user: null,
      error: jsonErr("FORBIDDEN", "PM role required", 403),
    };
  }
  return { user: base.user, error: null };
}
