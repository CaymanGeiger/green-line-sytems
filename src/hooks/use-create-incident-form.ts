"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type TeamOption = { id: string; name: string };
type ServiceOption = { id: string; name: string; teamId: string };

type UseCreateIncidentFormArgs = {
  teams: TeamOption[];
  services: ServiceOption[];
};

export function useCreateIncidentForm({ teams, services }: UseCreateIncidentFormArgs) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [serviceId, setServiceId] = useState("");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("SEV2");
  const [summary, setSummary] = useState("");
  const [impact, setImpact] = useState("");
  const [commanderUserId, setCommanderUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredServices = useMemo(
    () => services.filter((service) => !teamId || service.teamId === teamId),
    [services, teamId],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
          serviceId: serviceId || null,
          title,
          severity,
          summary: summary || null,
          impact: impact || null,
          commanderUserId: commanderUserId || null,
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Unable to create incident");
        return;
      }

      setTitle("");
      setSummary("");
      setImpact("");
      setServiceId("");
      setCommanderUserId("");
      router.refresh();
    } catch {
      setError("Unable to create incident");
    } finally {
      setLoading(false);
    }
  }

  function onTeamChange(nextTeamId: string) {
    setTeamId(nextTeamId);
    setServiceId("");
  }

  return {
    teamId,
    serviceId,
    title,
    severity,
    summary,
    impact,
    commanderUserId,
    error,
    loading,
    filteredServices,
    onSubmit,
    onTeamChange,
    setServiceId,
    setTitle,
    setSeverity,
    setSummary,
    setImpact,
    setCommanderUserId,
  };
}
