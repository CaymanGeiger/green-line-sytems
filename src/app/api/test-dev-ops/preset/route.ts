import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { ensureTeamSimulationServices, runSimulationPreset } from "@/lib/test-dev-ops-server";
import { testDevOpsPresetSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "test-dev-ops:preset", 12, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = testDevOpsPresetSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid preset payload", 400);
    }

    const canRunPreset = await canUserPerformTeamAction(user.id, parsed.data.teamId, "SIMULATOR", "CREATE");
    if (!canRunPreset) {
      return jsonError("Forbidden", 403);
    }

    await ensureTeamSimulationServices(parsed.data.teamId);

    const result = await runSimulationPreset({
      userId: user.id,
      teamId: parsed.data.teamId,
      preset: parsed.data.preset,
      profile: parsed.data.profile,
      severityOverride: parsed.data.severityOverride,
      faults: parsed.data.faults,
      serviceId: parsed.data.serviceId,
    });

    return jsonOk({ result });
  } catch (error) {
    console.error("Simulator preset error", error);
    return jsonError("Unable to run preset", 500);
  }
}
