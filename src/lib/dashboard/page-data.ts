import { prisma } from "@/lib/prisma";
import { getDashboardMetrics } from "@/lib/queries/dashboard";
import { selectSavedViewId, toSavedViewOptions, type SavedViewOption } from "@/lib/saved-views";

export type SearchParams = Record<string, string | string[] | undefined>;

export type DashboardPageFilters = {
  requestedServiceId?: string;
  requestedEnvironmentId?: string;
  requestedSavedViewId?: string;
  windowDays: number;
  showSimulation: boolean;
};

export type DashboardPageData = {
  services: Array<{ id: string; name: string; teamId: string }>;
  environments: Array<{ id: string; name: string }>;
  serviceId?: string;
  environmentId?: string;
  savedViewOptions: SavedViewOption[];
  selectedSavedViewId?: string;
  metrics: Awaited<ReturnType<typeof getDashboardMetrics>>;
  statCards: Array<{ label: string; value: number | string; detail: string }>;
};

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toWindowDays(value?: string): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 90) {
    return 14;
  }

  return parsed;
}

function toBooleanParam(value?: string): boolean {
  return value === "1" || value === "true" || value === "yes";
}

export function parseDashboardSearchParams(params: SearchParams): DashboardPageFilters {
  return {
    requestedServiceId: getStringParam(params.serviceId),
    requestedEnvironmentId: getStringParam(params.environmentId),
    requestedSavedViewId: getStringParam(params.savedViewId),
    windowDays: toWindowDays(getStringParam(params.window)),
    showSimulation: toBooleanParam(getStringParam(params.showSimulation)),
  };
}

export async function getDashboardPageData(userId: string, teamId: string, params: SearchParams): Promise<DashboardPageData> {
  const filters = parseDashboardSearchParams(params);

  const [services, savedViews] = await Promise.all([
    prisma.service.findMany({
      where: {
        teamId,
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, teamId: true },
    }),
    prisma.savedView.findMany({
      where: {
        userId,
        scope: "dashboard",
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

  const serviceId =
    filters.requestedServiceId && services.some((service) => service.id === filters.requestedServiceId)
      ? filters.requestedServiceId
      : undefined;

  const environments = await prisma.environment.findMany({
    where: {
      service: {
        teamId,
      },
      ...(serviceId ? { serviceId } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 100,
  });

  const environmentId =
    filters.requestedEnvironmentId && environments.some((environment) => environment.id === filters.requestedEnvironmentId)
      ? filters.requestedEnvironmentId
      : undefined;

  const metrics = await getDashboardMetrics({
    allowedTeamIds: [teamId],
    teamId,
    serviceId,
    environmentId,
    windowDays: filters.windowDays,
    showSimulation: filters.showSimulation,
  });

  const savedViewOptions = toSavedViewOptions(savedViews);

  return {
    services,
    environments,
    serviceId,
    environmentId,
    savedViewOptions,
    selectedSavedViewId: selectSavedViewId(filters.requestedSavedViewId, savedViewOptions),
    metrics,
    statCards: [
      { label: "Open incidents", value: metrics.kpis.openIncidents, detail: `Last ${filters.windowDays}d` },
      { label: "SEV1 / SEV2", value: `${metrics.kpis.sev1Count} / ${metrics.kpis.sev2Count}`, detail: "Unresolved" },
      { label: "Deploys today", value: metrics.kpis.deploysToday, detail: "All providers" },
      { label: "Error spikes", value: metrics.kpis.errorSpikes, detail: "Occurrences >= 50" },
      { label: "Avg MTTA", value: `${metrics.kpis.avgMtta}m`, detail: `Window ${filters.windowDays}d` },
      { label: "Avg MTTR", value: `${metrics.kpis.avgMttr}m`, detail: `Window ${filters.windowDays}d` },
    ],
  };
}
