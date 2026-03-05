import type { ReactNode } from "react";

import { GetStartedDrawer } from "@/components/get-started-drawer";
import { NavLinks } from "@/components/nav-links";
import { EmployeeAccessDrawer } from "@/components/employee-access-drawer";
import { TeamSwitcher } from "@/components/team-switcher";
import { UserMenu } from "@/components/user-menu";
import { WelcomeGetStartedModal } from "@/components/welcome-get-started-modal";
import type { GetStartedSnapshot } from "@/lib/get-started/shared";

type AppShellProps = {
  user: {
    name: string;
    email: string;
    role: string;
  };
  teams: Array<{
    id: string;
    name: string;
    organizationName?: string;
  }>;
  activeTeamId: string | null;
  activeOrganizationName?: string | null;
  showAdminNav: boolean;
  showEmployeeAccessAction: boolean;
  getStartedSnapshot: GetStartedSnapshot;
  children: ReactNode;
};

export function AppShell({
  user,
  teams,
  activeTeamId,
  activeOrganizationName,
  showAdminNav,
  showEmployeeAccessAction,
  getStartedSnapshot,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell-bg min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/92 shadow-[0_1px_0_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-start justify-between gap-3 px-4 py-3 md:flex-row md:flex-wrap md:items-start md:px-6">
          <div className="min-w-0 md:max-w-[48rem]">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-900">
              GreenLine Systems
            </p>
            <p className="text-sm text-slate-500">
              Production operations, simplified.
            </p>
          </div>
          <div className="flex min-w-0 items-start justify-end gap-2 sm:ml-auto sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 lg:flex-nowrap lg:gap-4">
            <div className="md:hidden">
              <NavLinks
                showAdmin={showAdminNav}
                teams={teams}
                activeTeamId={activeTeamId}
                mobileLeading={
                  <UserMenu
                    user={user}
                    activeOrganizationName={activeOrganizationName}
                    showEmployeeAccessAction={showEmployeeAccessAction}
                  />
                }
              />
            </div>
            <div className="hidden md:block">
              <TeamSwitcher teams={teams} activeTeamId={activeTeamId} />
            </div>
            <div className="hidden md:block">
              <UserMenu
                user={user}
                activeOrganizationName={activeOrganizationName}
                showEmployeeAccessAction={showEmployeeAccessAction}
              />
            </div>
          </div>
        </div>
        <div className="mx-auto hidden w-full max-w-7xl px-4 pb-2 md:block md:px-6">
          <NavLinks
            showAdmin={showAdminNav}
            teams={teams}
            activeTeamId={activeTeamId}
            mobileLeading={
              <UserMenu
                user={user}
                activeOrganizationName={activeOrganizationName}
                showEmployeeAccessAction={showEmployeeAccessAction}
              />
            }
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
        {children}
      </main>
      <WelcomeGetStartedModal snapshot={getStartedSnapshot} />
      <GetStartedDrawer snapshot={getStartedSnapshot} />
      <EmployeeAccessDrawer />
    </div>
  );
}
