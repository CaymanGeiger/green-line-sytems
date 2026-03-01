import Link from "next/link";
import { notFound } from "next/navigation";

import { ServiceSimulator } from "@/components/test-dev-ops/service-simulator";
import { Card } from "@/components/ui/card";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { SIMULATOR_ACTIONS, toSimulatorKind } from "@/lib/test-dev-ops";
import { prisma } from "@/lib/prisma";

export default async function TestDevOpsServicePage({
  params,
}: {
  params: Promise<{ teamId: string; serviceId: string }>;
}) {
  const user = await requireCurrentUser();
  const { teamId, serviceId } = await params;
  const [canAccessTeam, canSimulate] = await Promise.all([
    canUserPerformTeamAction(user.id, teamId, "SIMULATOR", "VIEW"),
    canUserPerformTeamAction(user.id, teamId, "SIMULATOR", "CREATE"),
  ]);

  if (!canAccessTeam) {
    notFound();
  }

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      teamId,
    },
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
    },
  });

  if (!service) {
    notFound();
  }

  const kind = toSimulatorKind(service.name, service.slug);

  return (
    <div className="space-y-4">
      <Card
        title={`${service.name} Simulator`}
        subtitle={`Team ${service.team.name} · ${kind} · Tier ${service.tier}`}
      >
        <ServiceSimulator service={{ id: service.id, name: service.name, slug: service.slug }} canSimulate={canSimulate} />
      </Card>

      <Card title="Expected Behavior" subtitle="Action outcomes generated for this service category.">
        <ul className="space-y-2 text-sm text-slate-700">
          {SIMULATOR_ACTIONS[kind].map((action) => (
            <li key={action.id}>
              <p className="font-semibold text-slate-900">{action.label}</p>
              <p className="text-xs text-slate-600">{action.description}</p>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-3 text-sm">
          <Link href="/incidents" className="font-semibold text-blue-700 hover:text-blue-800">
            View incidents
          </Link>
          <Link href={`/services/${service.id}`} className="font-semibold text-blue-700 hover:text-blue-800">
            View service detail
          </Link>
        </div>
      </Card>
    </div>
  );
}
