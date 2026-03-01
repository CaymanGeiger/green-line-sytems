import { cookies } from "next/headers";

import { getAccessibleTeams, type AccessibleTeam } from "@/lib/auth/team-access";

export const ACTIVE_TEAM_COOKIE_NAME = "dcc_active_team";
export const ACTIVE_TEAM_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export type ActiveTeamContext = {
  teams: AccessibleTeam[];
  activeTeamId: string | null;
  activeTeam: AccessibleTeam | null;
};

export function pickActiveTeamId(teamIds: string[], candidate?: string | null): string | null {
  if (teamIds.length === 0) {
    return null;
  }

  if (candidate && teamIds.includes(candidate)) {
    return candidate;
  }

  return teamIds[0] ?? null;
}

export async function getActiveTeamContext(userId: string): Promise<ActiveTeamContext> {
  const teams = await getAccessibleTeams(userId);
  const teamIds = teams.map((team) => team.id);
  const cookieStore = await cookies();
  const cookieTeamId = cookieStore.get(ACTIVE_TEAM_COOKIE_NAME)?.value ?? null;
  const activeTeamId = pickActiveTeamId(teamIds, cookieTeamId);
  const activeTeam = activeTeamId ? teams.find((team) => team.id === activeTeamId) ?? null : null;

  return {
    teams,
    activeTeamId,
    activeTeam,
  };
}
