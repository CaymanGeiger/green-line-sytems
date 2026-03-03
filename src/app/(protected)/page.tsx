import Link from "next/link";
import { AppSelect } from "@/components/ui/app-select";

import { PageSavedViewPicker } from "@/components/saved-views/page-saved-view-picker";
import { AccordionCard } from "@/components/ui/accordion-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FilterApplyButton } from "@/components/ui/filter-apply-button";
import { SimulationOnlyToggle } from "@/components/ui/simulation-only-toggle";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { getDashboardPageData, parseDashboardSearchParams, type SearchParams } from "@/lib/dashboard/page-data";
import { deployStatusTone, errorLevelTone, incidentSeverityTone, incidentStatusTone } from "@/lib/presentation";
import { formatDateTime } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const filters = parseDashboardSearchParams(params);

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

  const {
    services,
    environments,
    serviceId,
    environmentId,
    savedViewOptions,
    selectedSavedViewId,
    metrics,
    statCards,
  } = await getDashboardPageData(user.id, activeTeamId, params);

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Command Dashboard"
        subtitle="Unified reliability view for incidents, deploys, and error telemetry."
        defaultOpen
      >
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-100 p-3">
          <PageSavedViewPicker
            key={selectedSavedViewId ?? "dashboard-saved-view-none"}
            pageLabel="dashboard"
            options={savedViewOptions}
            formId="dashboard-filters-form"
            fieldNames={["serviceId", "environmentId", "window", "showSimulation"]}
            defaultValues={{ window: 14, showSimulation: false }}
            initialSelectedViewId={selectedSavedViewId}
          />
        </div>
        <form id="dashboard-filters-form" className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" method="GET">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Team
            <p
              title={activeTeam.name}
              className="inline-flex h-10 w-full min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium leading-none text-slate-700"
            >
              {activeTeam.name}
            </p>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Service
            <AppSelect
              name="serviceId"
              defaultValue={serviceId ?? ""}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium leading-none text-slate-700"
            >
              <option value="">All services</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Environment
            <AppSelect
              name="environmentId"
              defaultValue={environmentId ?? ""}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium leading-none text-slate-700"
            >
              <option value="">All environments</option>
              {environments.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}
                </option>
              ))}
            </AppSelect>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Time window
            <AppSelect
              name="window"
              defaultValue={String(filters.windowDays)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium leading-none text-slate-700"
            >
              <option value="1">24h</option>
              <option value="7">7d</option>
              <option value="14">14d</option>
              <option value="30">30d</option>
              <option value="90">90d</option>
            </AppSelect>
          </label>
          <SimulationOnlyToggle name="showSimulation" value="1" defaultChecked={filters.showSimulation} className="md:col-span-2" />
          <FilterApplyButton />
        </form>
      </AccordionCard>

      <AccordionCard
        title="Overview"
        subtitle="Key reliability KPIs for the selected scope and time window."
        preferenceKey="dashboard-overview"
        defaultOpen
      >
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {statCards.map((card) => (
            <Card key={card.label} className="min-h-28">
              <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
            </Card>
          ))}
        </section>
      </AccordionCard>

      <section className="grid gap-4 xl:grid-cols-3">
        <AccordionCard title="Active Incidents" subtitle="Unresolved incidents ranked by severity" className="xl:col-span-2">
          {metrics.activeIncidents.length === 0 ? (
            <p className="text-sm text-slate-500">No active incidents in the selected window.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 pb-2 md:px-4">Incident</th>
                    <th className="px-3 pb-2 md:px-4">Service</th>
                    <th className="px-3 pb-2 md:px-4">Team</th>
                    <th className="px-3 pb-2 md:px-4">Severity</th>
                    <th className="px-3 pb-2 md:px-4">Status</th>
                    <th className="px-3 pb-2 md:px-4">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.activeIncidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-slate-100 last:border-none">
                      <td className="px-3 py-3 md:px-4">
                        <Link className="font-semibold text-green-700 hover:text-green-800" href={`/incidents/${incident.id}`}>
                          {incident.incidentKey}
                        </Link>
                        <p className="text-xs text-slate-500">{incident.title}</p>
                      </td>
                      <td className="px-3 py-3 md:px-4">{incident.service?.name ?? "—"}</td>
                      <td className="px-3 py-3 md:px-4">{incident.team.name}</td>
                      <td className="px-3 py-3 md:px-4">
                        <Badge tone={incidentSeverityTone(incident.severity)}>{incident.severity}</Badge>
                      </td>
                      <td className="px-3 py-3 md:px-4">
                        <Badge tone={incidentStatusTone(incident.status)}>{incident.status}</Badge>
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600 md:px-4">{formatDateTime(incident.startedAt)}</td>
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
                <li key={deploy.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{deploy.service.name}</p>
                    <Badge tone={deployStatusTone(deploy.status)}>{deploy.status}</Badge>
                  </div>
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

      <AccordionCard
        title="Recent Errors"
        subtitle="Most recent high-signal issues across services"
        preferenceKey="dashboard-recent-errors"
        defaultOpen
      >
        {metrics.recentErrors.length === 0 ? (
          <p className="text-sm text-slate-500">No errors in the selected window.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.recentErrors.map((error) => (
              <div key={error.id} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-sm font-semibold text-slate-900">{error.service.name}</p>
                <p className="mt-1 text-xs text-slate-600">{error.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <Badge tone={errorLevelTone(error.level)}>{error.level}</Badge>
                  <span>{error.occurrences} occurrences</span>
                  <span>·</span>
                  <span>{formatDateTime(error.lastSeenAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </AccordionCard>
    </div>
  );
}
