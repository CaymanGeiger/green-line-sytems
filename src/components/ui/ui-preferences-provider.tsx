"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

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
  const preferencesRef = useRef<UiPreferencesMap>(initialPreferences);

  const setPreference = useCallback((preferenceKey: string, isOpen: boolean) => {
    const canPersist = isValidUiPreferenceKey(preferenceKey);
    const currentValue = preferencesRef.current[preferenceKey];

    if (currentValue === isOpen) {
      return;
    }

    const nextPreferences = {
      ...preferencesRef.current,
      [preferenceKey]: isOpen,
    };
    preferencesRef.current = nextPreferences;
    setPreferences(nextPreferences);

    if (!canPersist) {
      return;
    }

    void fetch("/api/account/ui-preferences", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        preferenceKey,
        isOpen,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`UI preference sync failed with status ${response.status}`);
        }
      })
      .catch((error) => {
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
  const [fallbackValue, setFallbackValue] = useState(defaultValue);

  const setValue = useCallback(
    (nextValue: boolean) => {
      if (context) {
        context.setPreference(preferenceKey, nextValue);
        return;
      }
      setFallbackValue(nextValue);
    },
    [context, preferenceKey],
  );

  const value = context
    ? (preferenceKey in context.preferences ? context.preferences[preferenceKey] : defaultValue)
    : fallbackValue;

  return [value, setValue] as const;
}
