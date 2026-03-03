"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AppSelect } from "@/components/ui/app-select";

type TeamOption = {
  id: string;
  name: string;
  organizationName?: string;
};

type PermissionsTeamSelectorProps = {
  selectedTeamId: string;
  teams: TeamOption[];
};

export function PermissionsTeamSelector({ selectedTeamId, teams }: PermissionsTeamSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(selectedTeamId);

  function handleChange(nextTeamId: string) {
    if (!nextTeamId || nextTeamId === selected) {
      return;
    }

    setSelected(nextTeamId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("teamId", nextTeamId);
    const nextQuery = params.toString();

    startTransition(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    });
  }

  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
      Team
      <AppSelect
        value={selected}
        disabled={pending || teams.length <= 1}
        onChange={(event) => handleChange(event.target.value)}
        className="h-10 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
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
