"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { SIMULATION_PROFILE_VALUES, type SimulationProfile } from "@/lib/test-dev-ops";

const PROFILE_LABELS: Record<SimulationProfile, string> = {
  SAFE_DEMO: "Safe Demo",
  HIGH_TRAFFIC: "High Traffic",
  RELEASE_DAY: "Release Day",
};

export function TeamEntryForm({
  teams,
}: {
  teams: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [profile, setProfile] = useState<SimulationProfile>("SAFE_DEMO");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!teamId) {
      return;
    }

    window.localStorage.setItem("test-devops-profile", profile);
    router.push(`/test-dev-ops/${teamId}`);
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Team to test
        <select
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          required
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Environment profile
        <select
          value={profile}
          onChange={(event) => setProfile(event.target.value as SimulationProfile)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {SIMULATION_PROFILE_VALUES.map((entry) => (
            <option key={entry} value={entry}>
              {PROFILE_LABELS[entry]}
            </option>
          ))}
        </select>
      </label>

      <Button type="submit">Enter Simulator</Button>
    </form>
  );
}
