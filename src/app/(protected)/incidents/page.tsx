import Link from "next/link";

import { CreateIncidentForm } from "@/components/incidents/create-incident-form";
import { PageSavedViewPicker } from "@/components/saved-views/page-saved-view-picker";
import { AccordionCard } from "@/components/ui/accordion-card";
import { Badge } from "@/components/ui/badge";
import { FilterApplyButton } from "@/components/ui/filter-apply-button";
import { SimulationOnlyToggle } from "@/components/ui/simulation-only-toggle";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { incidentSeverityTone, incidentStatusTone } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, parseNumberParam, toDateParam } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

const PAGE_SIZE = 20;

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toBooleanParam(value?: string): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function buildOrderBy(sort: string | undefined) {
  if (sort === "severity") {
    return [{ severity: "asc" as const }, { startedAt: "desc" as const }];
  }

  if (sort === "time-open") {
    return [{ startedAt: "asc" as const }];
  }

  return [{ startedAt: "desc" as const }];
}

function withParam(params: URLSearchParams, key: string, value: string) {
  const clone = new URLSearchParams(params);
  clone.set(key, value);
  return clone.toString();
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

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;

  const page = parseNumberParam(getStringParam(params.page), 1);
  const q = getStringParam(params.q)?.trim();
  const status = getStringParam(params.status);
  const severity = getStringParam(params.severity);
  const requestedServiceId = getStringParam(params.serviceId);
  const fromDate = toDateParam(getStringParam(params.from));
  const toDate = toDateParam(getStringParam(params.to));
  const sort = getStringParam(params.sort) ?? "newest";
  const showSimulation = toBooleanParam(getStringParam(params.showSimulation));

  const { activeTeam, activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeam || !activeTeamId) {
    return (
      <AccordionCard title="Incidents" subtitle="Search and manage incidents with operational filters and timeline depth." defaultOpen>
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </AccordionCard>
    );
  }
  const [canViewIncidents, canCreateIncidents] = await Promise.all([
    canUserPerformTeamAction(user.id, activeTeamId, "INCIDENT", "VIEW"),
    canUserPerformTeamAction(user.id, activeTeamId, "INCIDENT", "CREATE"),
  ]);
  if (!canViewIncidents) {
    return (
      <AccordionCard title="Incidents" subtitle="Search and manage incidents with operational filters and timeline depth." defaultOpen>
        <p className="text-sm text-slate-500">You do not have permission to view incidents for this team.</p>
      </AccordionCard>
    );
  }

  const services = await prisma.service.findMany({
    where: {
      teamId: activeTeamId,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, teamId: true },
  });

  const serviceId =
    requestedServiceId && services.some((service) => service.id === requestedServiceId) ? requestedServiceId : undefined;

  const where = {
    simulated: showSimulation,
    teamId: activeTeamId,
    ...(q
      ? {
          OR: [
            { incidentKey: { contains: q } },
            { title: { contains: q } },
            { summary: { contains: q } },
          ],
        }
      : {}),
    ...(status ? { status: status as "OPEN" | "INVESTIGATING" | "MITIGATED" | "RESOLVED" } : {}),
    ...(severity ? { severity: severity as "SEV1" | "SEV2" | "SEV3" | "SEV4" } : {}),
    ...(serviceId ? { serviceId } : {}),
    ...((fromDate || toDate)
      ? {
          startedAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };

  const [incidents, total, users, savedViews] = await Promise.all([
    prisma.incident.findMany({
      where,
      orderBy: buildOrderBy(sort),
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
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
              equals: activeTeamId,
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
        userId: user.id,
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const savedViewOptions = savedViews.map((view) => {
    return {
      id: view.id,
      name: view.name,
      filters: normalizeSavedViewFilters(view.filtersJson),
    };
  });
  const currentQuery = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    currentQuery.set(key, Array.isArray(value) ? value[0] ?? "" : value);
  });

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Incidents"
        subtitle="Search and manage incidents with operational filters and timeline depth."
        defaultOpen
      >
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          <PageSavedViewPicker
            pageLabel="incidents"
            options={savedViewOptions}
            formId="incidents-filters-form"
            fieldNames={["q", "status", "severity", "serviceId", "sort", "from", "to", "showSimulation"]}
            defaultValues={{ sort: "newest", showSimulation: false }}
          />
        </div>
        <form id="incidents-filters-form" className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7" method="GET">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search key, title, summary"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm sm:col-span-2 lg:col-span-3 xl:col-span-2"
          />

          <select
            name="status"
            defaultValue={status ?? ""}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All status</option>
            <option value="OPEN">OPEN</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="MITIGATED">MITIGATED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          <select
            name="severity"
            defaultValue={severity ?? ""}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All severity</option>
            <option value="SEV1">SEV1</option>
            <option value="SEV2">SEV2</option>
            <option value="SEV3">SEV3</option>
            <option value="SEV4">SEV4</option>
          </select>

          <p
            title={activeTeam.name}
            className="inline-flex h-10 w-full min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700"
          >
            {activeTeam.name}
          </p>

          <select
            name="serviceId"
            defaultValue={serviceId ?? ""}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All services</option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>

          <select
            name="sort"
            defaultValue={sort}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="severity">Severity</option>
            <option value="time-open">Time open</option>
          </select>

          <input name="from" type="date" defaultValue={fromDate?.toISOString().slice(0, 10) ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <input name="to" type="date" defaultValue={toDate?.toISOString().slice(0, 10) ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          <SimulationOnlyToggle
            name="showSimulation"
            value="1"
            defaultChecked={showSimulation}
            className="sm:col-span-2 lg:col-span-2 xl:col-span-2"
          />

          <FilterApplyButton />
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
                  <th className="pb-2">Incident</th>
                  <th className="pb-2">Team</th>
                  <th className="pb-2">Service</th>
                  <th className="pb-2">Severity</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Started</th>
                  <th className="pb-2">Resolved</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((incident) => (
                  <tr key={incident.id} className="border-b border-slate-100 last:border-none">
                    <td className="py-3">
                      <Link className="font-semibold text-blue-700 hover:text-blue-800" href={`/incidents/${incident.id}`}>
                        {incident.incidentKey}
                      </Link>
                      <p className="text-xs text-slate-500">{incident.title}</p>
                    </td>
                    <td className="py-3">{incident.team.name}</td>
                    <td className="py-3">{incident.service?.name ?? "—"}</td>
                    <td className="py-3">
                      <Badge tone={incidentSeverityTone(incident.severity)}>{incident.severity}</Badge>
                    </td>
                    <td className="py-3">
                      <Badge tone={incidentStatusTone(incident.status)}>{incident.status}</Badge>
                    </td>
                    <td className="py-3 text-xs text-slate-600">{formatDateTime(incident.startedAt)}</td>
                    <td className="py-3 text-xs text-slate-600">{formatDateTime(incident.resolvedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm">
          <p className="text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link
              href={`/incidents?${withParam(currentQuery, "page", String(Math.max(1, page - 1)))}`}
              className={`rounded-lg px-3 py-1.5 font-medium ${
                page <= 1
                  ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Previous
            </Link>
            <Link
              href={`/incidents?${withParam(currentQuery, "page", String(Math.min(totalPages, page + 1)))}`}
              className={`rounded-lg px-3 py-1.5 font-medium ${
                page >= totalPages
                  ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                  : "border border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
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
