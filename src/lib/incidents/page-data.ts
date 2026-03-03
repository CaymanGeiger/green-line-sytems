import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { selectSavedViewId, toSavedViewOptions, type SavedViewOption } from "@/lib/saved-views";
import { parseNumberParam, toDateParam } from "@/lib/utils";

export type SearchParams = Record<string, string | string[] | undefined>;

export type IncidentsPageFilters = {
  page: number;
  q?: string;
  status?: string;
  severity?: string;
  requestedServiceId?: string;
  requestedSavedViewId?: string;
  fromDate?: Date;
  toDate?: Date;
  sort: string;
  showSimulation: boolean;
};

export type IncidentsPageData = {
  filters: IncidentsPageFilters;
  incidents: Array<{
    id: string;
    incidentKey: string;
    title: string;
    severity: "SEV1" | "SEV2" | "SEV3" | "SEV4";
    status: "OPEN" | "INVESTIGATING" | "MITIGATED" | "RESOLVED";
    startedAt: Date;
    resolvedAt: Date | null;
    service: { name: string } | null;
    team: { name: string };
  }>;
  total: number;
  users: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string; teamId: string }>;
  serviceId?: string;
  savedViewOptions: SavedViewOption[];
  selectedSavedViewId?: string;
  totalPages: number;
  currentQuery: URLSearchParams;
};

const PAGE_SIZE = 20;

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toBooleanParam(value?: string): boolean {
  return value === "1" || value === "true" || value === "yes";
}

export function parseIncidentsSearchParams(params: SearchParams): IncidentsPageFilters {
  return {
    page: parseNumberParam(getStringParam(params.page), 1),
    q: getStringParam(params.q)?.trim(),
    status: getStringParam(params.status),
    severity: getStringParam(params.severity),
    requestedServiceId: getStringParam(params.serviceId),
    requestedSavedViewId: getStringParam(params.savedViewId),
    fromDate: toDateParam(getStringParam(params.from)),
    toDate: toDateParam(getStringParam(params.to)),
    sort: getStringParam(params.sort) ?? "newest",
    showSimulation: toBooleanParam(getStringParam(params.showSimulation)),
  };
}

export function buildOrderBy(sort: string | undefined): Prisma.IncidentOrderByWithRelationInput[] {
  if (sort === "severity") {
    return [{ severity: "asc" }, { startedAt: "desc" }];
  }

  if (sort === "time-open") {
    return [{ startedAt: "asc" }];
  }

  return [{ startedAt: "desc" }];
}

function buildWhereInput(teamId: string, filters: IncidentsPageFilters, serviceId?: string): Prisma.IncidentWhereInput {
  return {
    simulated: filters.showSimulation,
    teamId,
    ...(filters.q
      ? {
          OR: [
            { incidentKey: { contains: filters.q } },
            { title: { contains: filters.q } },
            { summary: { contains: filters.q } },
          ],
        }
      : {}),
    ...(filters.status
      ? { status: filters.status as "OPEN" | "INVESTIGATING" | "MITIGATED" | "RESOLVED" }
      : {}),
    ...(filters.severity
      ? { severity: filters.severity as "SEV1" | "SEV2" | "SEV3" | "SEV4" }
      : {}),
    ...(serviceId ? { serviceId } : {}),
    ...(filters.fromDate || filters.toDate
      ? {
          startedAt: {
            ...(filters.fromDate ? { gte: filters.fromDate } : {}),
            ...(filters.toDate ? { lte: filters.toDate } : {}),
          },
        }
      : {}),
  };
}

function toCurrentQuery(params: SearchParams): URLSearchParams {
  const currentQuery = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    currentQuery.set(key, Array.isArray(value) ? value[0] ?? "" : value);
  });

  return currentQuery;
}

export async function getIncidentsPageData(userId: string, teamId: string, params: SearchParams): Promise<IncidentsPageData> {
  const filters = parseIncidentsSearchParams(params);

  const services = await prisma.service.findMany({
    where: { teamId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, teamId: true },
  });

  const serviceId =
    filters.requestedServiceId && services.some((service) => service.id === filters.requestedServiceId)
      ? filters.requestedServiceId
      : undefined;

  const where = buildWhereInput(teamId, filters, serviceId);

  const [incidents, total, users, savedViews] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: buildOrderBy(filters.sort),
      take: PAGE_SIZE,
      skip: (filters.page - 1) * PAGE_SIZE,
      select: {
        id: true,
        incidentKey: true,
        title: true,
        severity: true,
        status: true,
        startedAt: true,
        resolvedAt: true,
        service: {
          select: { name: true },
        },
        team: {
          select: { name: true },
        },
      },
    }),
    prisma.incident.count({ where }),
    prisma.user.findMany({
      where: {
        teamMemberships: {
          some: {
            teamId: {
              equals: teamId,
            },
          },
        },
      },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true },
      distinct: ["id"],
    }),
    prisma.savedView.findMany({
      where: {
        userId,
        scope: "incidents",
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        filtersJson: true,
      },
    }),
  ]);

  const savedViewOptions = toSavedViewOptions(savedViews);

  return {
    filters,
    incidents,
    total,
    users,
    services,
    serviceId,
    savedViewOptions,
    selectedSavedViewId: selectSavedViewId(filters.requestedSavedViewId, savedViewOptions),
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    currentQuery: toCurrentQuery(params),
  };
}

export function withParam(params: URLSearchParams, key: string, value: string): string {
  const clone = new URLSearchParams(params);
  clone.set(key, value);
  return clone.toString();
}
