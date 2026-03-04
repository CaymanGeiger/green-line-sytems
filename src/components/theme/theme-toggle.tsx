"use client";

import { useTheme } from "@/components/theme/theme-provider";

type ThemeToggleProps = {
  className?: string;
  variant?: "button" | "menu-switch";
};

export function ThemeToggle({ className, variant = "button" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === "dark" ? "Light mode" : "Dark mode";
  const nextIcon = theme === "dark" ? "☀" : "🌙";

  if (variant === "menu-switch") {
    const checked = theme === "dark";
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={toggleTheme}
        className={`mt-2 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${className ?? ""}`.trim()}
      >
        <span className="text-sm font-semibold text-slate-700">Theme</span>
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">{checked ? "Dark" : "Light"}</span>
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors ${
              checked ? "border-slate-500 bg-slate-700" : "border-slate-300 bg-slate-200"
            }`}
          >
            <span
              className={`absolute top-0.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] transition-all ${
                checked ? "left-[1.35rem] bg-slate-100 text-slate-800" : "left-0.5 bg-white text-amber-500"
              }`}
            >
              {checked ? "🌙" : "☀"}
            </span>
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextLabel}`}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white/95 px-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 focus-visible:border-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-100 ${className ?? ""}`.trim()}
    >
      <span
        aria-hidden
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[12px] ${
          theme === "dark" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
        }`}
      >
        {nextIcon}
      </span>
      <span>{nextLabel}</span>
    </button>
  );
}
