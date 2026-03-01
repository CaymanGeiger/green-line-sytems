import { z } from "zod";
import { NextRequest } from "next/server";

import { jsonError, jsonOk, requireApiUser } from "@/lib/api";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { prisma } from "@/lib/prisma";

const feedQuerySchema = z.object({
  teamId: z.string().cuid(),
});

type FeedItem = {
  id: string;
  type: "LOG" | "ERROR" | "DEPLOY" | "ALERT" | "INCIDENT";
  serviceId?: string;
  serviceName?: string;
  incidentId?: string;
  incidentKey?: string;
  level?: string;
  message: string;
  timestamp: string;
};

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const parsed = feedQuerySchema.safeParse({
    teamId: request.nextUrl.searchParams.get("teamId"),
  });

  if (!parsed.success) {
    return jsonError("Invalid team id", 400);
  }

  const canView = await canUserPerformTeamAction(user.id, parsed.data.teamId, "SIMULATOR", "VIEW");
  if (!canView) {
    return jsonError("Forbidden", 403);
  }

  const rateLimit = await checkRateLimit({
    key: `test-dev-ops:feed:${parsed.data.teamId}:${getClientIp(request)}`,
    limit: 180,
    windowMs: 60_000,
  });

  if (!rateLimit.allowed) {
    return jsonError("Too many requests", 429);
  }

  try {
    const teamId = parsed.data.teamId;

    const [logs, errors, deploys, alerts, incidents] = await Promise.all([
      prisma.logEvent.findMany({
        where: {
          simulated: true,
          service: {
            teamId,
          },
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 30,
        select: {
          id: true,
          level: true,
          message: true,
          timestamp: true,
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.errorEvent.findMany({
        where: {
          simulated: true,
          service: {
            teamId,
          },
        },
        orderBy: {
          lastSeenAt: "desc",
        },
        take: 30,
        select: {
          id: true,
          level: true,
          title: true,
          lastSeenAt: true,
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.deployEvent.findMany({
        where: {
          simulated: true,
          service: {
            teamId,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 25,
        select: {
          id: true,
          status: true,
          commitMessage: true,
          createdAt: true,
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.alertEvent.findMany({
        where: {
          simulated: true,
          service: {
            teamId,
          },
        },
        orderBy: {
          triggeredAt: "desc",
        },
        take: 30,
        select: {
          id: true,
          severity: true,
          title: true,
          triggeredAt: true,
          service: {
            select: {
              id: true,
              name: true,
            },
          },
          incident: {
            select: {
              id: true,
              incidentKey: true,
            },
          },
        },
      }),
      prisma.incident.findMany({
        where: {
          teamId,
          simulated: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          incidentKey: true,
          status: true,
          title: true,
          updatedAt: true,
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    const normalized: FeedItem[] = [
      ...logs.map((row) => ({
        id: row.id,
        type: "LOG" as const,
        serviceId: row.service.id,
        serviceName: row.service.name,
        level: row.level,
        message: row.message,
        timestamp: row.timestamp.toISOString(),
      })),
      ...errors.map((row) => ({
        id: row.id,
        type: "ERROR" as const,
        serviceId: row.service.id,
        serviceName: row.service.name,
        level: row.level,
        message: row.title,
        timestamp: row.lastSeenAt.toISOString(),
      })),
      ...deploys.map((row) => ({
        id: row.id,
        type: "DEPLOY" as const,
        serviceId: row.service.id,
        serviceName: row.service.name,
        level: row.status,
        message: row.commitMessage ?? "[SIM] Deploy event",
        timestamp: row.createdAt.toISOString(),
      })),
      ...alerts.map((row) => ({
        id: row.id,
        type: "ALERT" as const,
        serviceId: row.service.id,
        serviceName: row.service.name,
        incidentId: row.incident?.id,
        incidentKey: row.incident?.incidentKey,
        level: row.severity,
        message: row.title,
        timestamp: row.triggeredAt.toISOString(),
      })),
      ...incidents.map((row) => ({
        id: row.id,
        type: "INCIDENT" as const,
        serviceId: row.service?.id,
        serviceName: row.service?.name,
        incidentId: row.id,
        incidentKey: row.incidentKey,
        level: row.status,
        message: row.title,
        timestamp: row.updatedAt.toISOString(),
      })),
    ]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 80);

    return jsonOk({ items: normalized });
  } catch (error) {
    console.error("Simulator feed error", error);
    return jsonError("Unable to load feed", 500);
  }
}
