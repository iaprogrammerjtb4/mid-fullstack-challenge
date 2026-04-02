/**
 * Single source of truth for the signing secret used by Auth.js and middleware JWT checks.
 * Set AUTH_SECRET in .env.local (32+ random bytes, e.g. openssl rand -base64 32).
 *
 * During `next build`, Next runs route modules with NODE_ENV=production but env vars may be
 * missing in CI until runtime. Next sets NEXT_PHASE=phase-production-build — we use a dummy
 * secret only for that phase so the build can finish; real requests still need AUTH_SECRET.
 */
const BUILD_TIME_PLACEHOLDER =
  "build-time-placeholder-auth-secret-do-not-use-in-prod-32chars";

function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function getAuthSecret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    if (isNextProductionBuild()) {
      return BUILD_TIME_PLACEHOLDER;
    }
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
