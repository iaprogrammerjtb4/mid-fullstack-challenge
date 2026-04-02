/**
 * Single source of truth for the signing secret used by Auth.js and middleware JWT checks.
 * Set AUTH_SECRET in .env.local (32+ random bytes, e.g. openssl rand -base64 32).
 */
export function getAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is required in production. Set it in the environment.",
    );
  }
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "[auth] AUTH_SECRET not set — using a fixed dev secret. Add AUTH_SECRET to .env.local so middleware and sign-in stay in sync.",
    );
  }
  return "local-dev-auth-secret-do-not-use-in-production-min-32!";
}
