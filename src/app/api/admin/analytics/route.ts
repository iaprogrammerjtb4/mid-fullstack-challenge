import { auth } from "@/auth";
import { jsonErr, jsonOk } from "@/lib/api-response";
import { getAdminAnalytics } from "@/lib/admin-analytics";
import { UserRole } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return jsonErr("UNAUTHORIZED", "Sign in required", 401);
  }
  if (session.user.role !== UserRole.PM) {
    return jsonErr("FORBIDDEN", "PM role required", 403);
  }

  return jsonOk(await getAdminAnalytics());
}
