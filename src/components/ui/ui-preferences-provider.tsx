"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { isValidUiPreferenceKey } from "@/lib/ui-preferences";

type UiPreferencesMap = Record<string, boolean>;

type UiPreferencesContextValue = {
  preferences: UiPreferencesMap;
  setPreference: (preferenceKey: string, isOpen: boolean) => void;
};

const UiPreferencesContext = createContext<UiPreferencesContextValue | null>(null);

type UiPreferencesProviderProps = {
  initialPreferences: UiPreferencesMap;
  children: React.ReactNode;
};

export function UiPreferencesProvider({ initialPreferences, children }: UiPreferencesProviderProps) {
  const [preferences, setPreferences] = useState<UiPreferencesMap>(initialPreferences);

  const setPreference = useCallback((preferenceKey: string, isOpen: boolean) => {
    if (!isValidUiPreferenceKey(preferenceKey)) {
      return;
    }

    setPreferences((current) => {
      if (current[preferenceKey] === isOpen) {
        return current;
      }

      return {
        ...current,
        [preferenceKey]: isOpen,
      };
    });

    void fetch("/api/account/ui-preferences", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        preferenceKey,
        isOpen,
      }),
    }).catch((error) => {
      console.error("UI preference sync error", error);
    });
  }, []);

  const value = useMemo<UiPreferencesContextValue>(() => {
    return {
      preferences,
      setPreference,
    };
  }, [preferences, setPreference]);

  return <UiPreferencesContext.Provider value={value}>{children}</UiPreferencesContext.Provider>;
}

export function useUiBooleanPreference(preferenceKey: string, defaultValue: boolean) {
  const context = useContext(UiPreferencesContext);

  if (!context) {
    throw new Error("useUiBooleanPreference must be used within UiPreferencesProvider");
  }

  const value = preferenceKey in context.preferences ? context.preferences[preferenceKey] : defaultValue;

  const setValue = useCallback(
    (nextValue: boolean) => {
      context.setPreference(preferenceKey, nextValue);
    },
    [context, preferenceKey],
  );

  return [value, setValue] as const;
}
