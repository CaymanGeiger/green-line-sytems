import { TeamPermissionsManager } from "@/components/account/team-permissions-manager";
import { AccordionCard } from "@/components/ui/accordion-card";
import { Card } from "@/components/ui/card";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function PermissionsPage() {
  const user = await requireCurrentUser();
  const { activeTeam, activeTeamId } = await getActiveTeamContext(user.id);

  if (!activeTeam || !activeTeamId) {
    return (
      <Card title="Permissions" subtitle="Team-scoped access control for every platform feature.">
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </Card>
    );
  }

  const canView = await canUserPerformTeamAction(user.id, activeTeamId, "TEAM_PERMISSION", "VIEW");
  if (!canView) {
    return (
      <Card title="Permissions" subtitle="Team-scoped access control for every platform feature.">
        <p className="text-sm text-slate-500">You do not have permission to view team permissions for this team.</p>
      </Card>
    );
  }

  const [memberships, overrides] = await Promise.all([
    prisma.teamMembership.findMany({
      where: {
        teamId: activeTeamId,
      },
      orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
      select: {
        userId: true,
        role: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.teamPermission.findMany({
      where: {
        teamId: activeTeamId,
      },
      select: {
        userId: true,
        resource: true,
        action: true,
        allowed: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Permissions"
        subtitle="Configure which members can view, create, update, or delete each team feature."
        defaultOpen
      >
        <TeamPermissionsManager
          teamId={activeTeamId}
          teamName={activeTeam.name}
          members={memberships.map((membership) => ({
            userId: membership.userId,
            name: membership.user.name,
            email: membership.user.email,
            role: membership.role,
          }))}
          overrides={overrides.map((override) => ({
            userId: override.userId,
            resource: override.resource,
            action: override.action,
            allowed: override.allowed,
          }))}
        />
      </AccordionCard>
    </div>
  );
}
