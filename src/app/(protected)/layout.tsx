import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { UiPreferencesProvider } from "@/components/ui/ui-preferences-provider";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await requireCurrentUser();
  const [preferences, activeTeamContext] = await Promise.all([
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
  ]);

  const initialPreferences = preferences.reduce<Record<string, boolean>>((accumulator, preference) => {
    accumulator[preference.preferenceKey] = preference.isOpen;
    return accumulator;
  }, {});

  return (
    <UiPreferencesProvider initialPreferences={initialPreferences}>
      <AppShell
        user={{ name: user.name, email: user.email, role: user.role }}
        teams={activeTeamContext.teams.map((team) => ({ id: team.id, name: team.name }))}
        activeTeamId={activeTeamContext.activeTeamId}
      >
        {children}
      </AppShell>
    </UiPreferencesProvider>
  );
}
