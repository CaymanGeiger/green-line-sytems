import Link from "next/link";

import { PageSavedViewPicker } from "@/components/saved-views/page-saved-view-picker";
import { AccordionCard } from "@/components/ui/accordion-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FilterApplyButton } from "@/components/ui/filter-apply-button";
import { SimulationOnlyToggle } from "@/components/ui/simulation-only-toggle";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { getDashboardMetrics } from "@/lib/queries/dashboard";
import { incidentSeverityTone, incidentStatusTone } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function getStringParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
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

function normalizeSavedViewFilters(filtersJson: unknown): Record<string, string | number | boolean> {
  if (!filtersJson || typeof filtersJson !== "object") {
    return {};
  }
  const filters = filtersJson as Record<string, unknown>;
  const normalized: Record<string, string | number | boolean> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      normalized[key] = value;
    }
  });
  return normalized;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const requestedServiceId = getStringParam(params.serviceId);
  const requestedEnvironmentId = getStringParam(params.environmentId);
  const windowDays = toWindowDays(getStringParam(params.window));
  const showSimulation = toBooleanParam(getStringParam(params.showSimulation));

  const { activeTeam, activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeamId || !activeTeam) {
    return (
      <Card title="Command Dashboard" subtitle="Unified reliability view for incidents, deploys, and error telemetry.">
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </Card>
    );
  }

  const canViewDashboard = await canUserPerformTeamAction(user.id, activeTeamId, "DASHBOARD", "VIEW");
  if (!canViewDashboard) {
    return (
      <Card title="Command Dashboard" subtitle="Unified reliability view for incidents, deploys, and error telemetry.">
        <p className="text-sm text-slate-500">You do not have permission to view dashboard metrics for this team.</p>
      </Card>
    );
  }

  const allowedTeamIds = [activeTeamId];
  const teamId = activeTeamId;

  const [allServices, savedViews] = await Promise.all([
    prisma.service.findMany({
      where: {
        teamId: activeTeamId,
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, teamId: true },
    }),
      prisma.savedView.findMany({
      where: {
        userId: user.id,
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

  const services = allServices;
  const serviceId = requestedServiceId && services.some((service) => service.id === requestedServiceId)
    ? requestedServiceId
    : undefined;

  const environments = await prisma.environment.findMany({
    where: {
      service: {
        teamId: activeTeamId,
      },
      ...(serviceId ? { serviceId } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
    take: 100,
  });

  const environmentId = requestedEnvironmentId && environments.some((environment) => environment.id === requestedEnvironmentId)
    ? requestedEnvironmentId
    : undefined;

  const metrics = await getDashboardMetrics({
    allowedTeamIds,
    teamId,
    serviceId,
    environmentId,
    windowDays,
    showSimulation,
  });

  const savedViewOptions = savedViews.map((view) => {
    return {
      id: view.id,
      name: view.name,
      filters: normalizeSavedViewFilters(view.filtersJson),
    };
  });

  const statCards = [
    { label: "Open incidents", value: metrics.kpis.openIncidents, detail: `Last ${windowDays}d` },
    { label: "SEV1 / SEV2", value: `${metrics.kpis.sev1Count} / ${metrics.kpis.sev2Count}`, detail: "Unresolved" },
    { label: "Deploys today", value: metrics.kpis.deploysToday, detail: "All providers" },
    { label: "Error spikes", value: metrics.kpis.errorSpikes, detail: "Occurrences >= 50" },
    { label: "Avg MTTA", value: `${metrics.kpis.avgMtta}m`, detail: `Window ${windowDays}d` },
    { label: "Avg MTTR", value: `${metrics.kpis.avgMttr}m`, detail: `Window ${windowDays}d` },
  ];

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Command Dashboard"
        subtitle="Unified reliability view for incidents, deploys, and error telemetry."
        defaultOpen
      >
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <PageSavedViewPicker
            pageLabel="dashboard"
            options={savedViewOptions}
            formId="dashboard-filters-form"
            fieldNames={["serviceId", "environmentId", "window", "showSimulation"]}
            defaultValues={{ window: 14, showSimulation: false }}
          />
        </div>
        <form id="dashboard-filters-form" className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" method="GET">
          <p
            title={activeTeam.name}
            className="inline-flex h-10 w-full min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700"
          >
            {activeTeam.name}
          </p>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Service
            <select
              name="serviceId"
              defaultValue={serviceId ?? ""}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="">All services</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Environment
            <select
              name="environmentId"
              defaultValue={environmentId ?? ""}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="">All environments</option>
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time window
            <select
              name="window"
              defaultValue={String(windowDays)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
            >
              <option value="1">24h</option>
              <option value="7">7d</option>
              <option value="14">14d</option>
              <option value="30">30d</option>
              <option value="90">90d</option>
            </select>
          </label>
          <SimulationOnlyToggle name="showSimulation" value="1" defaultChecked={showSimulation} className="md:col-span-2" />
          <FilterApplyButton />
        </form>
      </AccordionCard>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {statCards.map((card) => (
          <Card key={card.label} className="min-h-28">
            <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <AccordionCard title="Active Incidents" subtitle="Unresolved incidents ranked by severity" className="xl:col-span-2">
          {metrics.activeIncidents.length === 0 ? (
            <p className="text-sm text-slate-500">No active incidents in the selected window.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2">Incident</th>
                    <th className="pb-2">Service</th>
                    <th className="pb-2">Team</th>
                    <th className="pb-2">Severity</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.activeIncidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-slate-100 last:border-none">
                      <td className="py-3">
                        <Link className="font-semibold text-blue-700 hover:text-blue-800" href={`/incidents/${incident.id}`}>
                          {incident.incidentKey}
                        </Link>
                        <p className="text-xs text-slate-500">{incident.title}</p>
                      </td>
                      <td className="py-3">{incident.service?.name ?? "—"}</td>
                      <td className="py-3">{incident.team.name}</td>
                      <td className="py-3">
                        <Badge tone={incidentSeverityTone(incident.severity)}>{incident.severity}</Badge>
                      </td>
                      <td className="py-3">
                        <Badge tone={incidentStatusTone(incident.status)}>{incident.status}</Badge>
                      </td>
                      <td className="py-3 text-xs text-slate-600">{formatDateTime(incident.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AccordionCard>

        <AccordionCard title="Recent Deploys" subtitle="Latest deployment activity">
          {metrics.recentDeploys.length === 0 ? (
            <p className="text-sm text-slate-500">No deploy events in the selected window.</p>
          ) : (
            <ul className="space-y-3">
              {metrics.recentDeploys.map((deploy) => (
                <li key={deploy.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-sm font-semibold text-slate-900">
                    {deploy.service.name} · {deploy.status}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-600">{deploy.commitSha.slice(0, 10)}</p>
                  <p className="text-xs text-slate-500">
                    {deploy.provider} · {deploy.branch ?? "main"} · {formatDateTime(deploy.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </AccordionCard>
      </section>

      <Card title="Recent Errors" subtitle="Most recent high-signal issues across services">
        {metrics.recentErrors.length === 0 ? (
          <p className="text-sm text-slate-500">No errors in the selected window.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.recentErrors.map((error) => (
              <div key={error.id} className="rounded-xl border border-slate-100 bg-white px-3 py-3">
                <p className="text-sm font-semibold text-slate-900">{error.service.name}</p>
                <p className="mt-1 text-xs text-slate-600">{error.title}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {error.level} · {error.occurrences} occurrences · {formatDateTime(error.lastSeenAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
