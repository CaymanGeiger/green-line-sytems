import { NextRequest } from "next/server";

import { enforceMutationProtection, jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction, getTeamIdsForPermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/prisma";
import { parseNumberParam, toDateParam } from "@/lib/utils";
import { incidentCreateSchema } from "@/lib/validation";

const DEFAULT_PAGE_SIZE = 20;

function getStringParam(value: string | null): string | undefined {
  return value ?? undefined;
}

function toBooleanParam(value: string | null): boolean {
  return value === "1" || value === "true" || value === "yes";
}

async function generateIncidentKey() {
  const latest = await prisma.incident.findFirst({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      incidentKey: true,
    },
  });

  const currentNumber = latest?.incidentKey ? Number.parseInt(latest.incidentKey.split("-")[1] ?? "0", 10) : 0;
  const nextNumber = Number.isFinite(currentNumber) ? currentNumber + 1 : 1;

  return `INC-${String(nextNumber).padStart(6, "0")}`;
}

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const allowedTeamIds = await getTeamIdsForPermission(user.id, "INCIDENT", "VIEW");
    if (allowedTeamIds.length === 0) {
      return jsonOk({ incidents: [], total: 0, page: 1, pageSize: DEFAULT_PAGE_SIZE });
    }

    const { searchParams } = request.nextUrl;
    const page = parseNumberParam(searchParams.get("page") ?? undefined, 1);
    const pageSize = Math.min(100, parseNumberParam(searchParams.get("pageSize") ?? undefined, DEFAULT_PAGE_SIZE));
    const q = getStringParam(searchParams.get("q"));
    const status = getStringParam(searchParams.get("status"));
    const severity = getStringParam(searchParams.get("severity"));
    const serviceId = getStringParam(searchParams.get("serviceId"));
    const requestedTeamId = getStringParam(searchParams.get("teamId"));
    const teamId = requestedTeamId && allowedTeamIds.includes(requestedTeamId) ? requestedTeamId : undefined;
    const fromDate = toDateParam(searchParams.get("from") ?? undefined);
    const toDate = toDateParam(searchParams.get("to") ?? undefined);
    const showSimulation =
      toBooleanParam(searchParams.get("showSimulation")) ||
      toBooleanParam(searchParams.get("includeSimulated"));

    const where = {
      simulated: showSimulation,
      teamId: {
        in: allowedTeamIds,
      },
      ...(q
        ? {
            OR: [{ incidentKey: { contains: q } }, { title: { contains: q } }, { summary: { contains: q } }],
          }
        : {}),
      ...(status ? { status: status as "OPEN" | "INVESTIGATING" | "MITIGATED" | "RESOLVED" } : {}),
      ...(severity ? { severity: severity as "SEV1" | "SEV2" | "SEV3" | "SEV4" } : {}),
      ...(serviceId ? { serviceId } : {}),
      ...(teamId ? { teamId } : {}),
      ...((fromDate || toDate)
        ? {
            startedAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const [incidents, total] = await Promise.all([
      prisma.incident.findMany({
        where,
        orderBy: {
          startedAt: "desc",
        },
        take: pageSize,
        skip: (page - 1) * pageSize,
        select: {
          id: true,
          incidentKey: true,
          title: true,
          severity: true,
          status: true,
          startedAt: true,
          resolvedAt: true,
          team: {
            select: {
              name: true,
            },
          },
          service: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.incident.count({ where }),
    ]);

    return jsonOk({ incidents, total, page, pageSize });
  } catch (error) {
    console.error("Incident list error", error);
    return jsonError("Unable to load incidents", 500);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const protectionError = await enforceMutationProtection(request, "incidents:create", 60, 60_000);
  if (protectionError) {
    return protectionError;
  }

  try {
    const body = await request.json();
    const parsed = incidentCreateSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Invalid incident payload", 400);
    }

    const canCreate = await canUserPerformTeamAction(user.id, parsed.data.teamId, "INCIDENT", "CREATE");
    if (!canCreate) {
      return jsonError("Forbidden", 403);
    }

    if (parsed.data.serviceId) {
      const linkedService = await prisma.service.findFirst({
        where: {
          id: parsed.data.serviceId,
          teamId: parsed.data.teamId,
        },
        select: {
          id: true,
        },
      });

      if (!linkedService) {
        return jsonError("Invalid service selection", 400);
      }
    }

    const incidentKey = await generateIncidentKey();
    const startedAt = parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date();

    const incident = await prisma.$transaction(async (tx) => {
      const created = await tx.incident.create({
        data: {
          teamId: parsed.data.teamId,
          serviceId: parsed.data.serviceId,
          incidentKey,
          title: parsed.data.title.trim(),
          severity: parsed.data.severity,
          status: "OPEN",
          startedAt,
          detectedAt: startedAt,
          summary: parsed.data.summary ?? null,
          impact: parsed.data.impact ?? null,
          createdByUserId: user.id,
          commanderUserId: parsed.data.commanderUserId ?? null,
        },
      });

      if (parsed.data.commanderUserId) {
        await tx.incidentAssignee.create({
          data: {
            incidentId: created.id,
            userId: parsed.data.commanderUserId,
            role: "COMMANDER",
          },
        });
      }

      await tx.incidentTimelineEvent.create({
        data: {
          incidentId: created.id,
          type: "CREATED",
          message: `Incident ${incidentKey} created`,
          createdByUserId: user.id,
        },
      });

      return created;
    });

    return jsonOk({ incident }, { status: 201 });
  } catch (error) {
    console.error("Incident create error", error);
    return jsonError("Unable to create incident", 500);
  }
}
