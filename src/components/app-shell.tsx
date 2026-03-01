import type { ReactNode } from "react";

import { NavLinks } from "@/components/nav-links";
import { SignOutButton } from "@/components/signout-button";
import { TeamSwitcher } from "@/components/team-switcher";

type AppShellProps = {
  user: {
    name: string;
    email: string;
    role: string;
  };
  teams: Array<{
    id: string;
    name: string;
  }>;
  activeTeamId: string | null;
  children: ReactNode;
};

export function AppShell({ user, teams, activeTeamId, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.17),_transparent_48%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <header className="sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">DevOps Incident Command Center</p>
            <p className="text-sm text-slate-500">Unified command dashboard for incidents, deploys, and reliability signals.</p>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:gap-3 md:w-auto md:flex-nowrap md:gap-4">
            <div className="w-full text-left sm:w-auto sm:text-right">
              <p className="text-sm font-semibold text-slate-900">{user.name}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {user.role} · {user.email}
              </p>
            </div>
            <TeamSwitcher teams={teams} activeTeamId={activeTeamId} />
            <SignOutButton />
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl px-4 pb-2 md:px-6">
          <NavLinks />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">{children}</main>
    </div>
  );
}
