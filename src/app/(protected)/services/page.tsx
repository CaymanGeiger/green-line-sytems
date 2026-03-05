import Link from "next/link";

import { AccordionCard } from "@/components/ui/accordion-card";
import { Badge } from "@/components/ui/badge";
import { FilterApplyButton } from "@/components/ui/filter-apply-button";
import { SimulationOnlyToggle } from "@/components/ui/simulation-only-toggle";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { deployStatusTone, serviceTierTone } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toBooleanParam(value?: string): boolean {
  return value === "1" || value === "true" || value === "yes";
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const showSimulation = toBooleanParam(getStringParam(params.showSimulation));
  const { activeTeam, activeTeamId } = await getActiveTeamContext(user.id);

  if (!activeTeam || !activeTeamId) {
    return (
      <AccordionCard title="Services" subtitle="Service inventory with live operational health context." defaultOpen>
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </AccordionCard>
    );
  }

  const canViewServices = await canUserPerformTeamAction(user.id, activeTeamId, "SERVICE", "VIEW");
  if (!canViewServices) {
    return (
      <AccordionCard title="Services" subtitle="Service inventory with live operational health context." defaultOpen>
        <p className="text-sm text-slate-500">You do not have permission to view services for this team.</p>
      </AccordionCard>
    );
  }

  const services = await prisma.service.findMany({
    where: {
      teamId: activeTeamId,
    },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      tier: true,
      team: {
        select: {
          name: true,
        },
      },
      owner: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          incidents: {
            where: {
              simulated: showSimulation,
              status: {
                not: "RESOLVED",
              },
            },
          },
        },
      },
      deployEvents: {
        where: { simulated: showSimulation },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          status: true,
          createdAt: true,
        },
      },
      errorEvents: {
        where: { simulated: showSimulation },
        orderBy: {
          lastSeenAt: "desc",
        },
        take: 1,
        select: {
          lastSeenAt: true,
          title: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Services"
        subtitle={`Service inventory with live operational health context for ${activeTeam.name}.`}
        preferenceKey="services-inventory"
        defaultOpen
      >
        <form method="GET" className="mb-4 flex flex-wrap items-center gap-2">
          <SimulationOnlyToggle name="showSimulation" value="1" defaultChecked={showSimulation} />
          <FilterApplyButton />
        </form>
        {services.length === 0 ? (
          <p className="text-sm text-slate-500">No services found.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service) => (
              <article key={service.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/services/${service.id}${showSimulation ? "?showSimulation=1" : ""}`}
                    className="text-base font-semibold text-green-700 hover:text-green-800"
                  >
                    {service.name}
                  </Link>
                  <Badge tone={serviceTierTone(service.tier)}>{service.tier}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Team {service.team.name} · Owner {service.owner?.name ?? "Unassigned"}
                </p>
                <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-sm">
                  <p>
                    <span className="font-semibold text-slate-900">Open incidents:</span> {service._count.incidents}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Last deploy:</span>{" "}
                    {service.deployEvents[0] ? (
                      <span className="inline-flex items-center gap-2">
                        <Badge tone={deployStatusTone(service.deployEvents[0].status)}>
                          {service.deployEvents[0].status}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {formatDateTime(service.deployEvents[0].createdAt)}
                        </span>
                      </span>
                    ) : (
                      "No deploy data"
                    )}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Last error:</span>{" "}
                    {service.errorEvents[0]
                      ? `${service.errorEvents[0].title} (${formatDateTime(service.errorEvents[0].lastSeenAt)})`
                      : "No error data"}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </AccordionCard>
    </div>
  );
}
