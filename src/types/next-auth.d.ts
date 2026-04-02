import type { DefaultSession } from "next-auth";
import type { UserRoleType } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRoleType;
      image?: string | null;
    };
  }

  interface User {
    role: UserRoleType;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRoleType;
  }
}
