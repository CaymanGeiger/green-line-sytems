import Link from "next/link";
import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { SIMULATOR_ACTIONS, toSimulatorKind } from "@/lib/test-dev-ops";

export default async function TestDevOpsTeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await requireCurrentUser();
  const { teamId } = await params;
  const canAccessTeam = await canUserPerformTeamAction(user.id, teamId, "SIMULATOR", "VIEW");

  if (!canAccessTeam) {
    notFound();
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      services: {
        orderBy: [{ tier: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!team) {
    notFound();
  }

  const firstService = team.services[0];

  return (
    <div className="space-y-4">
      <Card title={`${team.name} Team Simulator`} subtitle="Select a service from the left rail to trigger deterministic outcomes.">
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            This simulator writes real telemetry to your platform tables: <code>LogEvent</code>, <code>ErrorEvent</code>, <code>AlertEvent</code>, <code>DeployEvent</code>, and auto-incidents when thresholds are crossed.
          </p>
          <p>
            Use healthy/warning/failure outcomes per action to demonstrate incident lifecycle behavior live.
          </p>
          {firstService ? (
            <Link
              href={`/test-dev-ops/${team.id}/${firstService.id}`}
              className="inline-flex rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Start with {firstService.name}
            </Link>
          ) : null}
        </div>
      </Card>

      <Card title="Service Simulation Coverage" subtitle="Mandatory simulator categories mapped to available services.">
        {team.services.length === 0 ? (
          <p className="text-sm text-slate-500">No services available.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {team.services.map((service) => {
              const kind = toSimulatorKind(service.name, service.slug);

              return (
                <div key={service.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-sm font-semibold text-slate-900">{service.name}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{kind}</p>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {SIMULATOR_ACTIONS[kind].map((action) => (
                      <li key={action.id}>• {action.label}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
