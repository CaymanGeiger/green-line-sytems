import type { InputHTMLAttributes } from "react";

type SimulationOnlyToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  className?: string;
};

export function SimulationOnlyToggle({
  label = "Show simulation metrics only",
  className,
  ...props
}: SimulationOnlyToggleProps) {
  return (
    <label
      className={`inline-flex h-10 w-full min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600 sm:w-auto lg:min-w-[250px] ${className ?? ""}`.trim()}
    >
      <input type="checkbox" className="h-3.5 w-3.5 shrink-0" {...props} />
      <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
    </label>
  );
}
