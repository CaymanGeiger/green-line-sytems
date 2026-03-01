import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { resolveSimulationEvents } from "@/lib/test-dev-ops-server";
import { testDevOpsRecoverSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "test-dev-ops:recover", 16, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = testDevOpsRecoverSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid resolve payload", 400);
    }

    const canRecover = await canUserPerformTeamAction(user.id, parsed.data.teamId, "SIMULATOR", "UPDATE");
    if (!canRecover) {
      return jsonError("Forbidden", 403);
    }

    const result = await resolveSimulationEvents({
      userId: user.id,
      teamId: parsed.data.teamId,
    });

    return jsonOk({ result });
  } catch (error) {
    console.error("Simulator resolve error", error);
    return jsonError("Unable to resolve simulation events", 500);
  }
}
