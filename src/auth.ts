import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAuthSecret } from "@/lib/auth-secret";
import { bootstrapLoginDb, sqlGet } from "@/lib/db";
import { UserRole } from "@/lib/roles";
import type { UserRoleType } from "@/lib/roles";

function firstFormString(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  if (Array.isArray(val) && typeof val[0] === "string") return val[0];
  return undefined;
}

const credentialsSchema = z.object({
  email: z.preprocess(
    (val) => {
      const s = firstFormString(val);
      return s === undefined ? val : s.trim().toLowerCase();
    },
    z.string().email(),
  ),
  password: z.preprocess(
    (val) => {
      const s = firstFormString(val);
      return s === undefined ? val : s.trim();
    },
    z.string().min(1),
  ),
});

type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  role: UserRoleType;
  image: string;
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: getAuthSecret(),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await bootstrapLoginDb();

        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const email = parsed.data.email;
        const row = await sqlGet<UserRow>(
          `SELECT id, email, password_hash, role, image FROM users WHERE LOWER(TRIM(email)) = ?`,
          [email],
        );
        if (!row) return null;

        const stored =
          typeof row.password_hash === "string"
            ? row.password_hash
            : row.password_hash != null
              ? String(row.password_hash)
              : "";
        if (!stored) return null;

        const ok = await bcrypt.compare(parsed.data.password, stored);
        if (!ok) return null;

        if (row.role !== UserRole.PM && row.role !== UserRole.DEVELOPER) {
          return null;
        }

        const image =
          row.image && row.image.trim() !== "" ? row.image.trim() : null;

        return {
          id: String(row.id),
          email: row.email,
          role: row.role,
          image,
        };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email ?? token.email;
        token.picture =
          user.image && String(user.image).trim() !== ""
            ? String(user.image).trim()
            : null;
      }
      if (trigger === "update" && session?.user) {
        const u = session.user as {
          email?: string | null;
          image?: string | null;
        };
        if (u.email) token.email = u.email;
        if (u.image !== undefined) {
          token.picture =
            u.image && u.image.trim() !== "" ? u.image.trim() : null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRoleType;
        if (token.email) session.user.email = token.email as string;
        session.user.image =
          (token.picture as string | null | undefined) ?? null;
      }
      return session;
    },
  },
});
