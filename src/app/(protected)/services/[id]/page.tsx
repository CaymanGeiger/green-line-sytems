import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FilterApplyButton } from "@/components/ui/filter-apply-button";
import { SimulationOnlyToggle } from "@/components/ui/simulation-only-toggle";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { incidentSeverityTone, incidentStatusTone, serviceTierTone } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toBooleanParam(value?: string): boolean {
  return value === "1" || value === "true" || value === "yes";
}

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const query = await searchParams;
  const showSimulation = toBooleanParam(getStringParam(query.showSimulation));
  const { activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeamId) {
    notFound();
  }

  const service = await prisma.service.findFirst({
    where: {
      id,
      teamId: activeTeamId,
    },
    include: {
      team: {
        select: {
          name: true,
        },
      },
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
      environments: {
        orderBy: { name: "asc" },
      },
      incidents: {
        where: { simulated: showSimulation },
        orderBy: { startedAt: "desc" },
        take: 20,
        select: {
          id: true,
          incidentKey: true,
          title: true,
          severity: true,
          status: true,
          startedAt: true,
        },
      },
      deployEvents: {
        where: { simulated: showSimulation },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          provider: true,
          status: true,
          branch: true,
          commitSha: true,
          createdAt: true,
        },
      },
      errorEvents: {
        where: { simulated: showSimulation },
        orderBy: { lastSeenAt: "desc" },
        take: 20,
        select: {
          id: true,
          title: true,
          level: true,
          occurrences: true,
          lastSeenAt: true,
        },
      },
    },
  });

  if (!service) {
    notFound();
  }

  const canView = await canUserPerformTeamAction(user.id, activeTeamId, "SERVICE", "VIEW");
  if (!canView) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Card
        title={service.name}
        subtitle={`Team ${service.team.name} · ${service.slug}`}
        action={<Badge tone={serviceTierTone(service.tier)}>{service.tier}</Badge>}
      >
        <form method="GET" className="mb-3 flex flex-wrap items-center gap-2">
          <SimulationOnlyToggle name="showSimulation" value="1" defaultChecked={showSimulation} />
          <FilterApplyButton />
        </form>
        <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">Owner:</span> {service.owner?.name ?? "Unassigned"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Repo:</span> {service.repoUrl ?? "Not set"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Runbook URL:</span> {service.runbookUrl ?? "Not set"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Environments:</span>{" "}
            {service.environments.map((environment) => environment.name).join(", ") || "None"}
          </p>
        </div>
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card title="Recent Incidents" className="xl:col-span-2">
          {service.incidents.length === 0 ? (
            <p className="text-sm text-slate-500">No incidents found for this service.</p>
          ) : (
            <ul className="space-y-3">
              {service.incidents.map((incident) => (
                <li key={incident.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/incidents/${incident.id}`} className="font-semibold text-blue-700 hover:text-blue-800">
                      {incident.incidentKey}
                    </Link>
                    <div className="flex gap-2">
                      <Badge tone={incidentSeverityTone(incident.severity)}>{incident.severity}</Badge>
                      <Badge tone={incidentStatusTone(incident.status)}>{incident.status}</Badge>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{incident.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(incident.startedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent Deploys">
          {service.deployEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No deploy events yet.</p>
          ) : (
            <ul className="space-y-2">
              {service.deployEvents.map((deploy) => (
                <li key={deploy.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-slate-900">{deploy.provider} · {deploy.status}</p>
                  <p className="font-mono text-xs text-slate-600">{deploy.commitSha.slice(0, 10)}</p>
                  <p className="text-xs text-slate-500">{deploy.branch ?? "main"} · {formatDateTime(deploy.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <Card title="Recent Errors">
        {service.errorEvents.length === 0 ? (
          <p className="text-sm text-slate-500">No error events yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {service.errorEvents.map((error) => (
              <div key={error.id} className="rounded-xl border border-slate-100 bg-white px-3 py-3">
                <p className="text-sm font-semibold text-slate-900">{error.title}</p>
                <p className="mt-1 text-xs text-slate-500">
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
