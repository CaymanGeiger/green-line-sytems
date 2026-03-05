"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AppSelect } from "@/components/ui/app-select";

type TeamOption = {
  id: string;
  name: string;
  organizationName?: string;
};

export function TeamSwitcher({
  teams,
  activeTeamId,
  className,
}: {
  teams: TeamOption[];
  activeTeamId: string | null;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [selectedTeamId, setSelectedTeamId] = useState(activeTeamId ?? "");
  const [pending, startTransition] = useTransition();
  const selectedTeamLabel = useMemo(() => {
    const selected = teams.find((team) => team.id === selectedTeamId) ?? teams[0];
    if (!selected) {
      return "";
    }
    return selected.organizationName ? `${selected.name} · ${selected.organizationName}` : selected.name;
  }, [selectedTeamId, teams]);
  const controlWidthCh = Math.min(96, Math.max(30, selectedTeamLabel.length + 14));

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
    <label
      className={`group relative inline-block max-w-full self-end ${className ?? ""}`.trim()}
      style={{ width: `min(100%, ${controlWidthCh}ch)` }}
    >
      <span className="sr-only">Active team</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-3 z-10 my-auto inline-flex h-6 w-6 items-center justify-center rounded-md bg-green-100 text-[10px] font-bold text-green-800"
      >
        TM
      </span>
      <AppSelect
        value={selectedTeamId}
        disabled={pending}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-0 cursor-pointer appearance-none rounded-lg border border-slate-300 bg-white/95 pl-11 pr-9 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
      >
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.organizationName ? `${team.name} · ${team.organizationName}` : team.name}
          </option>
        ))}
      </AppSelect>
    </label>
  );
}
