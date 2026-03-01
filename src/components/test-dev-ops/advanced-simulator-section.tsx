"use client";

import { useUiBooleanPreference } from "@/components/ui/ui-preferences-provider";

export function AdvancedSimulatorSection({
  children,
  preferenceKey,
}: {
  children: React.ReactNode;
  preferenceKey: string;
}) {
  const [open, setOpen] = useUiBooleanPreference(preferenceKey, false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-slate-50"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">Advanced Simulation Actions</p>
          <p className="text-xs text-slate-600">
            Full simulator workspace for detailed service actions, telemetry, and fault-driven investigations.
          </p>
        </div>
        <span className="text-sm font-semibold text-slate-500">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? <div className="border-t border-slate-200 px-2 py-3">{children}</div> : null}
    </div>
  );
}
