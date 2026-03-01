"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type TeamOption = {
  id: string;
  name: string;
};

export function TeamSwitcher({
  teams,
  activeTeamId,
}: {
  teams: TeamOption[];
  activeTeamId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedTeamId, setSelectedTeamId] = useState(activeTeamId ?? "");
  const [pending, startTransition] = useTransition();

  async function onChange(nextTeamId: string) {
    if (!nextTeamId || nextTeamId === selectedTeamId) {
      return;
    }

    const previous = selectedTeamId;
    setSelectedTeamId(nextTeamId);

    try {
      const response = await fetch("/api/account/active-team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId: nextTeamId,
        }),
      });

      if (!response.ok) {
        setSelectedTeamId(previous);
        return;
      }

      startTransition(() => {
        if (pathname.startsWith("/test-dev-ops/")) {
          router.push(`/test-dev-ops/${nextTeamId}`);
          return;
        }

        router.refresh();
      });
    } catch {
      setSelectedTeamId(previous);
    }
  }

  if (teams.length <= 1) {
    return null;
  }

  return (
    <label className="group relative block w-full sm:w-auto sm:min-w-[220px]">
      <span className="sr-only">Active team</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 my-auto inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-[10px] font-bold text-blue-700"
      >
        TM
      </span>
      <select
        value={selectedTeamId}
        disabled={pending}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-300 bg-white pl-11 pr-9 text-sm font-semibold text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 my-auto h-2 w-2 rotate-45 border-b-2 border-r-2 border-slate-500 transition group-hover:border-slate-700"
      />
    </label>
  );
}
