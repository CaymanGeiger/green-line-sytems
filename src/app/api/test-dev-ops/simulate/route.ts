import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { simulateServiceAction } from "@/lib/test-dev-ops-server";
import { testDevOpsSimulateSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "test-dev-ops:simulate", 36, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = testDevOpsSimulateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid simulation payload", 400);
    }

    const service = await prisma.service.findFirst({
      where: {
        id: parsed.data.serviceId,
      },
      select: {
        id: true,
        teamId: true,
      },
    });

    if (!service) {
      return jsonError("Forbidden", 403);
    }

    const canSimulate = await canUserPerformTeamAction(user.id, service.teamId, "SIMULATOR", "CREATE");
    if (!canSimulate) {
      return jsonError("Forbidden", 403);
    }

    const result = await simulateServiceAction({
      userId: user.id,
      serviceId: parsed.data.serviceId,
      action: parsed.data.action,
      expectedOutcome: parsed.data.expectedOutcome,
      severityOverride: parsed.data.severityOverride,
      intensity: parsed.data.intensity,
      profile: parsed.data.profile,
      payload: parsed.data.payload,
      faults: parsed.data.faults,
    });

    return jsonOk({ result });
  } catch (error) {
    console.error("Simulator action error", error);
    return jsonError("Unable to run simulation", 500);
  }
}
