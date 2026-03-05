import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { computeMttaMinutes, computeMttrMinutes } from "@/lib/presentation";

type DashboardFilters = {
  allowedTeamIds: string[];
  teamId?: string;
  serviceId?: string;
  environmentId?: string;
  windowDays: number;
  showSimulation: boolean;
};

function buildWhere(filters: DashboardFilters) {
  const fromDate = new Date(Date.now() - filters.windowDays * 24 * 60 * 60 * 1000);
  const simulatedWhere = { simulated: filters.showSimulation };

  return {
    fromDate,
    incidentWhere: {
      startedAt: {
        gte: fromDate,
      },
      ...simulatedWhere,
      teamId: {
        in: filters.allowedTeamIds,
      },
      ...(filters.teamId ? { teamId: filters.teamId } : {}),
      ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    },
    deployWhere: {
      createdAt: {
        gte: fromDate,
      },
      ...simulatedWhere,
      service: {
        teamId: {
          in: filters.allowedTeamIds,
        },
      },
      ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
      ...(filters.environmentId ? { environmentId: filters.environmentId } : {}),
    },
    errorWhere: {
      lastSeenAt: {
        gte: fromDate,
      },
      ...simulatedWhere,
      service: {
        teamId: {
          in: filters.allowedTeamIds,
        },
      },
      ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
      ...(filters.environmentId ? { environmentId: filters.environmentId } : {}),
    },
  };
}

const getCachedMetrics = unstable_cache(
  async (filters: DashboardFilters) => {
    const { incidentWhere, deployWhere, errorWhere } = buildWhere(filters);

    const [
      openIncidentCountsBySeverity,
      deploysToday,
      errorSpikes,
      activeIncidents,
      recentDeploys,
      recentErrors,
      mttaAndMttrRows,
    ] = await Promise.all([
      prisma.incident.groupBy({
        by: ["severity"],
        where: { ...incidentWhere, status: { not: "RESOLVED" } },
        _count: {
          _all: true,
        },
      }),
      prisma.deployEvent.count({
        where: {
          ...deployWhere,
          startedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.errorEvent.count({
        where: {
          ...errorWhere,
          occurrences: {
            gte: 50,
          },
        },
      }),
      prisma.incident.findMany({
        where: {
          ...incidentWhere,
          status: {
            not: "RESOLVED",
          },
        },
        orderBy: [{ severity: "asc" }, { startedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          incidentKey: true,
          title: true,
          severity: true,
          status: true,
          startedAt: true,
          service: {
            select: {
              name: true,
            },
          },
          team: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.deployEvent.findMany({
        where: deployWhere,
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          status: true,
          provider: true,
          commitSha: true,
          branch: true,
          createdAt: true,
          service: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.errorEvent.findMany({
        where: errorWhere,
        orderBy: {
          lastSeenAt: "desc",
        },
        take: 8,
        select: {
          id: true,
          title: true,
          level: true,
          occurrences: true,
          lastSeenAt: true,
          service: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.incident.findMany({
        where: {
          ...incidentWhere,
          status: "RESOLVED",
          resolvedAt: {
            not: null,
          },
          acknowledgedAt: {
            not: null,
          },
          detectedAt: {
            not: null,
          },
        },
        take: 120,
        select: {
          startedAt: true,
          resolvedAt: true,
          detectedAt: true,
          acknowledgedAt: true,
        },
      }),
    ]);

    const openIncidents = openIncidentCountsBySeverity.reduce((sum, row) => sum + row._count._all, 0);
    const sev1Count = openIncidentCountsBySeverity.find((row) => row.severity === "SEV1")?._count._all ?? 0;
    const sev2Count = openIncidentCountsBySeverity.find((row) => row.severity === "SEV2")?._count._all ?? 0;

    const mttaRows = mttaAndMttrRows.map((row) =>
      computeMttaMinutes(row.detectedAt, row.acknowledgedAt),
    );
    const mttrRows = mttaAndMttrRows.map((row) => computeMttrMinutes(row.startedAt, row.resolvedAt));

    const avgMtta = mttaRows.length
      ? Math.round(mttaRows.reduce((acc, cur) => acc + cur, 0) / mttaRows.length)
      : 0;
    const avgMttr = mttrRows.length
      ? Math.round(mttrRows.reduce((acc, cur) => acc + cur, 0) / mttrRows.length)
      : 0;

    return {
      kpis: {
        openIncidents,
        sev1Count,
        sev2Count,
        deploysToday,
        errorSpikes,
        avgMtta,
        avgMttr,
      },
      activeIncidents,
      recentDeploys,
      recentErrors,
    };
  },
  ["dashboard-metrics-v2"],
  { revalidate: 45 },
);

export async function getDashboardMetrics(filters: DashboardFilters) {
  return getCachedMetrics(filters);
}
