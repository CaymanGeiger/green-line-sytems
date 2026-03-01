import { CreateTeamForm } from "@/components/account/create-team-form";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { TeamMembersManager } from "@/components/account/team-members-manager";
import { AccordionCard } from "@/components/ui/accordion-card";
import { canUserPerformTeamAction, userHasAnyTeamPermission } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function AccountPage() {
  const user = await requireCurrentUser();
  const memberships = await prisma.teamMembership.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      team: {
        name: "asc",
      },
    },
    select: {
      role: true,
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          memberships: {
            orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          invites: {
            where: {
              consumedAt: null,
              expiresAt: {
                gt: new Date(),
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              id: true,
              email: true,
              role: true,
              expiresAt: true,
            },
          },
        },
      },
    },
  });

  const canManageByTeamId = new Map(
    await Promise.all(
      memberships.map(async (membership) => {
        const [canCreate, canUpdate, canDelete] = await Promise.all([
          canUserPerformTeamAction(user.id, membership.team.id, "TEAM_MEMBER", "CREATE"),
          canUserPerformTeamAction(user.id, membership.team.id, "TEAM_MEMBER", "UPDATE"),
          canUserPerformTeamAction(user.id, membership.team.id, "TEAM_MEMBER", "DELETE"),
        ]);
        return [membership.team.id, canCreate || canUpdate || canDelete] as const;
      }),
    ),
  );

  const membershipCount = memberships.length;
  const canCreateTeam =
    membershipCount === 0 ? true : await userHasAnyTeamPermission(user.id, "TEAM", "CREATE");

  const teamRecords = memberships.map((membership) => ({
    id: membership.team.id,
    name: membership.team.name,
    slug: membership.team.slug,
    currentUserRole: membership.role,
    canManageMembers: canManageByTeamId.get(membership.team.id) ?? false,
    members: membership.team.memberships.map((entry) => ({
      userId: entry.user.id,
      name: entry.user.name,
      email: entry.user.email,
      role: entry.role,
    })),
    pendingInvites: membership.team.invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
    })),
  }));

  return (
    <div className="space-y-6">
      <AccordionCard title="Account" subtitle="Profile, security settings, and team memberships." defaultOpen>
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <p>
            <span className="font-semibold text-slate-900">Role:</span> {user.role}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Created:</span> {formatDateTime(user.createdAt)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Updated:</span> {formatDateTime(user.updatedAt)}
          </p>
        </div>
      </AccordionCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <AccordionCard title="Profile" subtitle="Update your display information and identity details." defaultOpen>
          <ProfileForm initialName={user.name} email={user.email} />
        </AccordionCard>

        <AccordionCard title="Password" subtitle="Manage your sign-in password and account security." defaultOpen>
          <PasswordForm />
        </AccordionCard>
      </section>

      <AccordionCard
        title="Team Memberships"
        subtitle="Users can belong to multiple teams. Member management follows team permission settings."
        defaultOpen
      >
        <TeamMembersManager currentUserId={user.id} initialTeams={teamRecords} />
      </AccordionCard>

      <AccordionCard title="Create Team" subtitle="Create a new team and become its owner.">
        {canCreateTeam ? (
          <CreateTeamForm />
        ) : (
          <p className="text-sm text-slate-500">You do not have permission to create teams.</p>
        )}
      </AccordionCard>
    </div>
  );
}
