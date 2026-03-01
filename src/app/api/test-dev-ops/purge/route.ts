import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { purgeSimulationData } from "@/lib/test-dev-ops-server";
import { testDevOpsPurgeSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "test-dev-ops:purge", 4, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = testDevOpsPurgeSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid purge payload", 400);
    }

    const canDelete = await canUserPerformTeamAction(user.id, parsed.data.teamId, "SIMULATOR", "DELETE");
    if (!canDelete) {
      return jsonError("Forbidden", 403);
    }

    const result = await purgeSimulationData({
      teamId: parsed.data.teamId,
    });

    return jsonOk({ result });
  } catch (error) {
    console.error("Simulator purge error", error);
    return jsonError("Unable to delete simulation data", 500);
  }
}
