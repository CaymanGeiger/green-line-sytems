import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { UiPreferencesProvider } from "@/components/ui/ui-preferences-provider";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { getGetStartedSnapshot } from "@/lib/get-started/server";
import { getManageableOrganizations } from "@/lib/auth/team-access";
import { prisma } from "@/lib/prisma";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();
  const [preferences, activeTeamContext, manageableOrganizations] = await Promise.all([
    prisma.uiPreference.findMany({
      where: {
        userId: user.id,
      },
      select: {
        preferenceKey: true,
        isOpen: true,
      },
    }),
    getActiveTeamContext(user.id),
    getManageableOrganizations(user.id),
  ]);

  const canManageTeamPermissions = activeTeamContext.activeTeamId
    ? await canUserPerformTeamAction(user.id, activeTeamContext.activeTeamId, "TEAM_PERMISSION", "UPDATE")
    : false;
  const showAdminNav = manageableOrganizations.length > 0 || canManageTeamPermissions;
  const showEmployeeAccessAction = manageableOrganizations.length > 0;
  const getStartedSnapshot = await getGetStartedSnapshot(
    user.id,
    user.role,
    activeTeamContext.organizations.map((organization) => organization.id),
    activeTeamContext.teams.map((team) => team.id),
  );

  const initialPreferences = preferences.reduce<Record<string, boolean>>((accumulator, preference) => {
    accumulator[preference.preferenceKey] = preference.isOpen;
    return accumulator;
  }, {});

  return (
    <UiPreferencesProvider initialPreferences={initialPreferences}>
      <AppShell
        user={{ name: user.name, email: user.email, role: user.role }}
        teams={activeTeamContext.teams.map((team) => ({
          id: team.id,
          name: team.name,
          organizationName: team.organizationName,
        }))}
        activeTeamId={activeTeamContext.activeTeamId}
        activeOrganizationName={
          activeTeamContext.activeTeam?.organizationName ?? activeTeamContext.activeOrganization?.name ?? null
        }
        showAdminNav={showAdminNav}
        showEmployeeAccessAction={showEmployeeAccessAction}
        getStartedSnapshot={getStartedSnapshot}
      >
        {children}
      </AppShell>
    </UiPreferencesProvider>
  );
}
