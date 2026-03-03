"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type TeamOption = {
  id: string;
  name: string;
};

type ServiceOption = {
  id: string;
  name: string;
  teamId: string;
};

type EnvironmentOption = {
  id: string;
  name: string;
  serviceId: string;
};

type Scope = "dashboard" | "incidents";

type UseCreateSavedViewFormArgs = {
  services: ServiceOption[];
  environments: EnvironmentOption[];
};

export function useCreateSavedViewForm({ services, environments }: UseCreateSavedViewFormArgs) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [scope, setScope] = useState<Scope>("incidents");

  const [dashboardTeamId, setDashboardTeamId] = useState("");
  const [dashboardServiceId, setDashboardServiceId] = useState("");
  const [dashboardEnvironmentId, setDashboardEnvironmentId] = useState("");
  const [dashboardWindow, setDashboardWindow] = useState("14");
  const [dashboardSimulationOnly, setDashboardSimulationOnly] = useState(false);

  const [incidentsQuery, setIncidentsQuery] = useState("");
  const [incidentsStatus, setIncidentsStatus] = useState("OPEN");
  const [incidentsSeverity, setIncidentsSeverity] = useState("");
  const [incidentsTeamId, setIncidentsTeamId] = useState("");
  const [incidentsServiceId, setIncidentsServiceId] = useState("");
  const [incidentsFrom, setIncidentsFrom] = useState("");
  const [incidentsTo, setIncidentsTo] = useState("");
  const [incidentsSort, setIncidentsSort] = useState("newest");
  const [incidentsSimulationOnly, setIncidentsSimulationOnly] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeTeamId = scope === "dashboard" ? dashboardTeamId : incidentsTeamId;

  const filteredServices = useMemo(() => {
    if (!activeTeamId) {
      return services;
    }

    return services.filter((service) => service.teamId === activeTeamId);
  }, [activeTeamId, services]);

  const filteredEnvironments = useMemo(() => {
    if (!dashboardServiceId) {
      return [];
    }

    return environments.filter((environment) => environment.serviceId === dashboardServiceId);
  }, [dashboardServiceId, environments]);

  function onScopeChange(nextScope: Scope) {
    setScope(nextScope);
  }

  function onDashboardTeamChange(nextTeamId: string) {
    setDashboardTeamId(nextTeamId);

    const nextServiceValid = services.some(
      (service) => service.id === dashboardServiceId && (!nextTeamId || service.teamId === nextTeamId),
    );

    if (!nextServiceValid) {
      setDashboardServiceId("");
      setDashboardEnvironmentId("");
    }
  }

  function onDashboardServiceChange(nextServiceId: string) {
    setDashboardServiceId(nextServiceId);

    if (!nextServiceId) {
      setDashboardEnvironmentId("");
      return;
    }

    const environmentStillValid = environments.some(
      (environment) => environment.id === dashboardEnvironmentId && environment.serviceId === nextServiceId,
    );

    if (!environmentStillValid) {
      setDashboardEnvironmentId("");
    }
  }

  function onIncidentsTeamChange(nextTeamId: string) {
    setIncidentsTeamId(nextTeamId);

    const nextServiceValid = services.some(
      (service) => service.id === incidentsServiceId && (!nextTeamId || service.teamId === nextTeamId),
    );

    if (!nextServiceValid) {
      setIncidentsServiceId("");
    }
  }

  function buildFiltersJson(): Record<string, unknown> {
    const filtersJson: Record<string, unknown> = {};

    if (scope === "dashboard") {
      if (dashboardTeamId) filtersJson.teamId = dashboardTeamId;
      if (dashboardServiceId) filtersJson.serviceId = dashboardServiceId;
      if (dashboardEnvironmentId) filtersJson.environmentId = dashboardEnvironmentId;
      filtersJson.window = Number(dashboardWindow);
      if (dashboardSimulationOnly) filtersJson.showSimulation = true;
      return filtersJson;
    }

    if (incidentsQuery.trim()) filtersJson.q = incidentsQuery.trim();
    if (incidentsStatus) filtersJson.status = incidentsStatus;
    if (incidentsSeverity) filtersJson.severity = incidentsSeverity;
    if (incidentsTeamId) filtersJson.teamId = incidentsTeamId;
    if (incidentsServiceId) filtersJson.serviceId = incidentsServiceId;
    if (incidentsFrom) filtersJson.from = incidentsFrom;
    if (incidentsTo) filtersJson.to = incidentsTo;
    if (incidentsSort) filtersJson.sort = incidentsSort;
    if (incidentsSimulationOnly) filtersJson.showSimulation = true;

    return filtersJson;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/saved-views", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          scope,
          filtersJson: buildFiltersJson(),
        }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(body.error ?? "Unable to create saved view");
        return;
      }

      setName("");
      router.refresh();
    } catch {
      setError("Unable to create saved view.");
    } finally {
      setLoading(false);
    }
  }

  return {
    name,
    scope,
    dashboardTeamId,
    dashboardServiceId,
    dashboardEnvironmentId,
    dashboardWindow,
    dashboardSimulationOnly,
    incidentsQuery,
    incidentsStatus,
    incidentsSeverity,
    incidentsTeamId,
    incidentsServiceId,
    incidentsFrom,
    incidentsTo,
    incidentsSort,
    incidentsSimulationOnly,
    error,
    loading,
    filteredServices,
    filteredEnvironments,
    setName,
    onScopeChange,
    onDashboardTeamChange,
    onDashboardServiceChange,
    setDashboardEnvironmentId,
    setDashboardWindow,
    setDashboardSimulationOnly,
    setIncidentsQuery,
    setIncidentsStatus,
    setIncidentsSeverity,
    onIncidentsTeamChange,
    setIncidentsServiceId,
    setIncidentsFrom,
    setIncidentsTo,
    setIncidentsSort,
    setIncidentsSimulationOnly,
    onSubmit,
  };
}

export type { TeamOption, ServiceOption, EnvironmentOption, Scope };
