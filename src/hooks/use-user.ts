"use client";

import { useSession } from "next-auth/react";
import { UserRole } from "@/lib/roles";
import type { UserRoleType } from "@/lib/roles";

export function useUser() {
  const { data: session, status } = useSession();
  const role = (session?.user?.role as UserRoleType | undefined) ?? undefined;
  const isPm = role === UserRole.PM;
  const isDeveloper = role === UserRole.DEVELOPER;
  const isAuthenticated = status === "authenticated";

  return {
    session,
    status,
    user: session?.user,
    role,
    isPm,
    isDeveloper,
    isAuthenticated,
    isLoading: status === "loading",
  };
}
