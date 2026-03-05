import Link from "next/link";
import { AppSelect } from "@/components/ui/app-select";

import { CreateIncidentForm } from "@/components/incidents/create-incident-form";
import { PageSavedViewPicker } from "@/components/saved-views/page-saved-view-picker";
import { AccordionCard } from "@/components/ui/accordion-card";
import { Badge } from "@/components/ui/badge";
import { FilterApplyButton } from "@/components/ui/filter-apply-button";
import { SimulationOnlyToggle } from "@/components/ui/simulation-only-toggle";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamActions } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { withParam, type SearchParams, getIncidentsPageData } from "@/lib/incidents/page-data";
import { incidentSeverityTone, incidentStatusTone } from "@/lib/presentation";
import { formatDateTime } from "@/lib/utils";

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;

  const { activeTeam, activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeam || !activeTeamId) {
    return (
      <AccordionCard title="Incidents" subtitle="Search and manage incidents with operational filters and timeline depth." defaultOpen>
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </AccordionCard>
    );
  }

  const [canViewIncidents, canCreateIncidents] = await canUserPerformTeamActions(user.id, activeTeamId, [
    { resource: "INCIDENT", action: "VIEW" },
    { resource: "INCIDENT", action: "CREATE" },
  ]);

  if (!canViewIncidents) {
    return (
      <AccordionCard title="Incidents" subtitle="Search and manage incidents with operational filters and timeline depth." defaultOpen>
        <p className="text-sm text-slate-500">You do not have permission to view incidents for this team.</p>
      </AccordionCard>
    );
  }

  const {
    filters,
    incidents,
    total,
    users,
    services,
    serviceId,
    savedViewOptions,
    selectedSavedViewId,
    totalPages,
    currentQuery,
  } = await getIncidentsPageData(user.id, activeTeamId, params);

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Incidents"
        subtitle="Search and manage incidents with operational filters and timeline depth."
        defaultOpen
      >
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <PageSavedViewPicker
            key={selectedSavedViewId ?? "incidents-saved-view-none"}
            pageLabel="incidents"
            options={savedViewOptions}
            formId="incidents-filters-form"
            fieldNames={["q", "status", "severity", "serviceId", "sort", "from", "to", "showSimulation"]}
            defaultValues={{ sort: "newest", showSimulation: false }}
            initialSelectedViewId={selectedSavedViewId}
          />
        </div>
        <form id="incidents-filters-form" className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12" method="GET">
          <input
            name="q"
            defaultValue={filters.q ?? ""}
            placeholder="Search key, title, summary"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none sm:col-span-2 lg:col-span-4 xl:col-span-4"
          />

          <div className="xl:col-span-2">
            <AppSelect
              name="status"
              defaultValue={filters.status ?? ""}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none"
            >
              <option value="">All status</option>
              <option value="OPEN">OPEN</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="MITIGATED">MITIGATED</option>
              <option value="RESOLVED">RESOLVED</option>
            </AppSelect>
          </div>

          <div className="xl:col-span-2">
            <AppSelect
              name="severity"
              defaultValue={filters.severity ?? ""}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none"
            >
              <option value="">All severity</option>
              <option value="SEV1">SEV1</option>
              <option value="SEV2">SEV2</option>
              <option value="SEV3">SEV3</option>
              <option value="SEV4">SEV4</option>
            </AppSelect>
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 xl:col-span-2">
            Team
            <p
              title={activeTeam.name}
              className="inline-flex h-10 w-full min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium leading-none text-slate-700"
            >
              {activeTeam.name}
            </p>
          </label>

          <div className="xl:col-span-2">
            <AppSelect
              name="serviceId"
              defaultValue={serviceId ?? ""}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none"
            >
              <option value="">All services</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </AppSelect>
          </div>

          <input
            name="from"
            type="date"
            defaultValue={filters.fromDate?.toISOString().slice(0, 10) ?? ""}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none xl:col-span-2 xl:col-start-1"
          />
          <input
            name="to"
            type="date"
            defaultValue={filters.toDate?.toISOString().slice(0, 10) ?? ""}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none xl:col-span-2"
          />

          <div className="xl:col-span-2">
            <AppSelect
              name="sort"
              defaultValue={filters.sort}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none"
            >
              <option value="newest">Newest</option>
              <option value="severity">Severity</option>
              <option value="time-open">Time open</option>
            </AppSelect>
          </div>
          <SimulationOnlyToggle
            name="showSimulation"
            value="1"
            defaultChecked={filters.showSimulation}
            className="sm:col-span-2 xl:col-span-4"
          />

          <FilterApplyButton className="xl:col-span-2" />
        </form>
      </AccordionCard>

      <AccordionCard title="Create Incident" subtitle="Open a new incident and initialize commander context.">
        {canCreateIncidents ? (
          <CreateIncidentForm teams={[{ id: activeTeam.id, name: activeTeam.name }]} services={services} users={users} />
        ) : (
          <p className="text-sm text-slate-500">You do not have permission to create incidents for this team.</p>
        )}
      </AccordionCard>

      <AccordionCard title="Incident List" subtitle={`${total} total incidents`}>
        {incidents.length === 0 ? (
          <p className="text-sm text-slate-500">No incidents found for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 pb-2 md:px-4">Incident</th>
                  <th className="px-3 pb-2 md:px-4">Team</th>
                  <th className="px-3 pb-2 md:px-4">Service</th>
                  <th className="px-3 pb-2 md:px-4">Severity</th>
                  <th className="px-3 pb-2 md:px-4">Status</th>
                  <th className="px-3 pb-2 md:px-4">Started</th>
                  <th className="px-3 pb-2 md:px-4">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id} className="border-b border-slate-100 last:border-none">
                    <td className="px-3 py-3 md:px-4">
                      <Link className="font-semibold text-green-700 hover:text-green-800" href={`/incidents/${incident.id}`}>
                        {incident.incidentKey}
                      </Link>
                      <p className="text-xs text-slate-500">{incident.title}</p>
                    </td>
                    <td className="px-3 py-3 md:px-4">{incident.team.name}</td>
                    <td className="px-3 py-3 md:px-4">{incident.service?.name ?? "—"}</td>
                    <td className="px-3 py-3 md:px-4">
                      <Badge tone={incidentSeverityTone(incident.severity)}>{incident.severity}</Badge>
                    </td>
                    <td className="px-3 py-3 md:px-4">
                      <Badge tone={incidentStatusTone(incident.status)}>{incident.status}</Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 md:px-4">{formatDateTime(incident.startedAt)}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 md:px-4">{formatDateTime(incident.resolvedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
          <p className="text-slate-500">
            Page {filters.page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/incidents?${withParam(currentQuery, "page", String(Math.max(1, filters.page - 1)))}`}
              className={`rounded-lg px-3 py-1.5 font-medium ${
                filters.page <= 1
                  ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-green-600 bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              Previous
            </Link>
            <Link
              href={`/incidents?${withParam(currentQuery, "page", String(Math.min(totalPages, filters.page + 1)))}`}
              className={`rounded-lg px-3 py-1.5 font-medium ${
                filters.page >= totalPages
                  ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-green-600 bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              Next
            </Link>
          </div>
        </div>
      </AccordionCard>
    </div>
  );
}
