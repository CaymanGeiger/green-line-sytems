"use client";

import { createContext, useContext, useState } from "react";

import {
  DEFAULT_SIMULATION_FAULT_STATE,
  SIMULATION_PROFILE_VALUES,
  type SimulationFaultState,
  type SimulationProfile,
  type SimulationSeverityOverride,
} from "@/lib/test-dev-ops";

type TestDevOpsContextValue = {
  profile: SimulationProfile;
  setProfile: (profile: SimulationProfile) => void;
  severityOverride: SimulationSeverityOverride;
  setSeverityOverride: (severityOverride: SimulationSeverityOverride) => void;
  faults: SimulationFaultState;
  setFaults: (faults: SimulationFaultState) => void;
  resetFaults: () => void;
};

const TestDevOpsContext = createContext<TestDevOpsContextValue | null>(null);

const PROFILE_STORAGE_KEY = "test-devops-profile";
const SEVERITY_OVERRIDE_STORAGE_KEY = "test-devops-severity-override";

function isProfile(value: string): value is SimulationProfile {
  return SIMULATION_PROFILE_VALUES.some((entry) => entry === value);
}

function faultsStorageKey(teamId: string): string {
  return `test-devops-faults-${teamId}`;
}

function readInitialProfile(): SimulationProfile {
  if (typeof window === "undefined") {
    return "SAFE_DEMO";
  }

  const persistedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (persistedProfile && isProfile(persistedProfile)) {
    return persistedProfile;
  }

  return "SAFE_DEMO";
}

function readInitialSeverityOverride(): SimulationSeverityOverride {
  if (typeof window === "undefined") {
    return "AUTO";
  }

  const persistedSeverity = window.localStorage.getItem(SEVERITY_OVERRIDE_STORAGE_KEY);
  if (
    persistedSeverity === "AUTO" ||
    persistedSeverity === "SEV1" ||
    persistedSeverity === "SEV2" ||
    persistedSeverity === "SEV3" ||
    persistedSeverity === "SEV4"
  ) {
    return persistedSeverity;
  }

  return "AUTO";
}

function readInitialFaults(teamId: string): SimulationFaultState {
  if (typeof window === "undefined") {
    return DEFAULT_SIMULATION_FAULT_STATE;
  }

  const persistedFaults = window.localStorage.getItem(faultsStorageKey(teamId));
  if (!persistedFaults) {
    return DEFAULT_SIMULATION_FAULT_STATE;
  }

  try {
    const parsed = JSON.parse(persistedFaults) as Partial<SimulationFaultState>;
    return {
      ...DEFAULT_SIMULATION_FAULT_STATE,
      ...parsed,
    };
  } catch {
    return DEFAULT_SIMULATION_FAULT_STATE;
  }
}

export function TestDevOpsProvider({
  teamId,
  children,
}: {
  teamId: string;
  children: React.ReactNode;
}) {
  const [profile, setProfileState] = useState<SimulationProfile>(() => readInitialProfile());
  const [severityOverride, setSeverityOverrideState] = useState<SimulationSeverityOverride>(() =>
    readInitialSeverityOverride(),
  );
  const [faults, setFaultsState] = useState<SimulationFaultState>(() => readInitialFaults(teamId));

  function setProfile(nextProfile: SimulationProfile) {
    setProfileState(nextProfile);
    window.localStorage.setItem(PROFILE_STORAGE_KEY, nextProfile);
  }

  function setSeverityOverride(nextSeverityOverride: SimulationSeverityOverride) {
    setSeverityOverrideState(nextSeverityOverride);
    window.localStorage.setItem(SEVERITY_OVERRIDE_STORAGE_KEY, nextSeverityOverride);
  }

  function setFaults(nextFaults: SimulationFaultState) {
    setFaultsState(nextFaults);
    window.localStorage.setItem(faultsStorageKey(teamId), JSON.stringify(nextFaults));
  }

  function resetFaults() {
    setFaults(DEFAULT_SIMULATION_FAULT_STATE);
  }

  const value = {
    profile,
    setProfile,
    severityOverride,
    setSeverityOverride,
    faults,
    setFaults,
    resetFaults,
  };

  return <TestDevOpsContext.Provider value={value}>{children}</TestDevOpsContext.Provider>;
}

export function useTestDevOps() {
  const context = useContext(TestDevOpsContext);

  if (!context) {
    throw new Error("useTestDevOps must be used within TestDevOpsProvider");
  }

  return context;
}
