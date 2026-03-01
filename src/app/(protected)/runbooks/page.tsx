import Link from "next/link";

import { CreateRunbookForm } from "@/components/runbooks/create-runbook-form";
import { AccordionCard } from "@/components/ui/accordion-card";
import { Badge } from "@/components/ui/badge";
import { FilterApplyButton } from "@/components/ui/filter-apply-button";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RunbooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const requestedServiceId = getStringParam(params.serviceId);
  const tag = getStringParam(params.tag);
  const { activeTeam, activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeam || !activeTeamId) {
    return (
      <AccordionCard title="Runbooks" subtitle="Procedure catalog with versioned markdown and service context." defaultOpen>
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </AccordionCard>
    );
  }

  const [canViewRunbooks, canCreateRunbooks] = await Promise.all([
    canUserPerformTeamAction(user.id, activeTeamId, "RUNBOOK", "VIEW"),
    canUserPerformTeamAction(user.id, activeTeamId, "RUNBOOK", "CREATE"),
  ]);
  if (!canViewRunbooks) {
    return (
      <AccordionCard title="Runbooks" subtitle="Procedure catalog with versioned markdown and service context." defaultOpen>
        <p className="text-sm text-slate-500">You do not have permission to view runbooks for this team.</p>
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
    requestedServiceId && services.some((service) => service.id === requestedServiceId)
      ? requestedServiceId
      : undefined;

  const where = {
    teamId: activeTeamId,
    ...(serviceId ? { serviceId } : {}),
  };

  const runbooksRaw = await prisma.runbook.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      version: true,
      isActive: true,
      updatedAt: true,
      tagsJson: true,
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
  });

  const runbooks = tag
    ? runbooksRaw.filter((runbook) =>
        Array.isArray(runbook.tagsJson)
          ? runbook.tagsJson.some((entry) => String(entry).toLowerCase() === tag.toLowerCase())
          : false,
      )
    : runbooksRaw;

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Runbooks"
        subtitle="Procedure catalog with versioned markdown and service context."
        defaultOpen
      >
        <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" method="GET">
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
          <input
            name="tag"
            defaultValue={tag ?? ""}
            placeholder="Tag filter"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <FilterApplyButton />
        </form>
      </AccordionCard>

      <AccordionCard title="Create Runbook" subtitle="Publish new guidance or response templates.">
        {canCreateRunbooks ? (
          <CreateRunbookForm teams={[{ id: activeTeam.id, name: activeTeam.name }]} services={services} />
        ) : (
          <p className="text-sm text-slate-500">You do not have permission to create runbooks for this team.</p>
        )}
      </AccordionCard>

      <AccordionCard title="Runbook Library" subtitle={`${runbooks.length} runbooks`}>
        {runbooks.length === 0 ? (
          <p className="text-sm text-slate-500">No runbooks match current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Runbook</th>
                  <th className="pb-2">Team</th>
                  <th className="pb-2">Service</th>
                  <th className="pb-2">Version</th>
                  <th className="pb-2">State</th>
                  <th className="pb-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {runbooks.map((runbook) => (
                  <tr key={runbook.id} className="border-b border-slate-100 last:border-none">
                    <td className="py-3">
                      <Link className="font-semibold text-blue-700 hover:text-blue-800" href={`/runbooks/${runbook.id}`}>
                        {runbook.title}
                      </Link>
                      <p className="text-xs text-slate-500">{runbook.slug}</p>
                    </td>
                    <td className="py-3">{runbook.team.name}</td>
                    <td className="py-3">{runbook.service?.name ?? "Team-level"}</td>
                    <td className="py-3">v{runbook.version}</td>
                    <td className="py-3">
                      <Badge tone={runbook.isActive ? "success" : "neutral"}>
                        {runbook.isActive ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                    </td>
                    <td className="py-3 text-xs text-slate-600">{formatDateTime(runbook.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AccordionCard>
    </div>
  );
}
