import { notFound } from "next/navigation";

import { AdvancedSimulatorSection } from "@/components/test-dev-ops/advanced-simulator-section";
import { GlobalControls } from "@/components/test-dev-ops/global-controls";
import { ServiceNav } from "@/components/test-dev-ops/service-nav";
import { TelemetryFeed } from "@/components/test-dev-ops/telemetry-feed";
import { TestDevOpsProvider } from "@/components/test-dev-ops/test-devops-provider";
import { Card } from "@/components/ui/card";
import { canUserPerformTeamActions } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ensureTeamSimulationServices } from "@/lib/test-dev-ops-server";

export default async function TestDevOpsTeamLayout({
  params,
  children,
}: {
  params: Promise<{ teamId: string }>;
  children: React.ReactNode;
}) {
  const user = await requireCurrentUser();
  const { teamId } = await params;
  const [canViewSimulator, canCreateSimulator, canUpdateSimulator, canDeleteSimulator] =
    await canUserPerformTeamActions(user.id, teamId, [
      { resource: "SIMULATOR", action: "VIEW" },
      { resource: "SIMULATOR", action: "CREATE" },
      { resource: "SIMULATOR", action: "UPDATE" },
      { resource: "SIMULATOR", action: "DELETE" },
    ]);

  if (!canViewSimulator) {
    notFound();
  }

  const team = await prisma.team.findUnique({
    where: {
      id: teamId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!team) {
    notFound();
  }

  if (canCreateSimulator) {
    await ensureTeamSimulationServices(team.id);
  }

  const services = await prisma.service.findMany({
    where: {
      teamId: team.id,
    },
    orderBy: [{ tier: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return (
    <TestDevOpsProvider teamId={team.id}>
      <div className="space-y-4">
        <Card
          title={`${team.name} · Simulator Controls`}
          subtitle="Scenario presets and global fault injection are applied to all service simulators in this team."
        >
          <GlobalControls
            teamId={team.id}
            services={services.map((service) => ({ id: service.id, name: service.name }))}
            canRunPresets={canCreateSimulator}
            canResolveEvents={canUpdateSimulator}
            canDeleteData={canDeleteSimulator}
          />
        </Card>

        <AdvancedSimulatorSection preferenceKey={`test-dev-ops:advanced-section-open:${team.id}`}>
          <section className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_330px]">
            <Card title="Services" subtitle="Navigate service simulators" className="order-2 lg:order-1">
              <ServiceNav teamId={team.id} services={services} />
            </Card>

            <div className="order-1 lg:order-2">{children}</div>

            <Card title="Telemetry Generated" subtitle="Live simulation feed (refresh every ~2.5s)" className="order-3">
              <TelemetryFeed teamId={team.id} />
            </Card>
          </section>
        </AdvancedSimulatorSection>
      </div>
    </TestDevOpsProvider>
  );
}
