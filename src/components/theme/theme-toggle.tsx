"use client";

import { useTheme } from "@/components/theme/theme-provider";

type ThemeToggleProps = {
  className?: string;
  variant?: "button" | "menu-switch";
};

export function ThemeToggle({ className, variant = "button" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === "dark" ? "Light mode" : "Dark mode";

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
      {theme === "dark" ? (
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-amber-500">
          <path
            fill="currentColor"
            d="M12 4a1 1 0 0 1 1 1v1.25a1 1 0 1 1-2 0V5a1 1 0 0 1 1-1Zm0 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7-5a1 1 0 1 1 0 2h-1.25a1 1 0 1 1 0-2H19Zm-12.75 0a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2h1.25Zm9.546-4.546a1 1 0 0 1 1.414 1.414l-.884.884a1 1 0 1 1-1.414-1.414l.884-.884ZM9.674 14.326a1 1 0 0 1 0 1.414l-.884.884a1 1 0 1 1-1.414-1.414l.884-.884a1 1 0 0 1 1.414 0Zm6.652 2.298a1 1 0 0 1-1.414 1.414l-.884-.884a1 1 0 1 1 1.414-1.414l.884.884ZM9.674 9.674a1 1 0 0 1-1.414 0l-.884-.884a1 1 0 1 1 1.414-1.414l.884.884a1 1 0 0 1 0 1.414ZM13 17.75a1 1 0 1 1-2 0V19a1 1 0 1 1 2 0v-1.25Z"
          />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-slate-500">
          <path
            fill="currentColor"
            d="M13.5 3.5a.75.75 0 0 1 .8.96 7.25 7.25 0 1 0 5.24 5.24.75.75 0 0 1 1.45-.39A8.75 8.75 0 1 1 12.31 3a.75.75 0 0 1 1.19.5Z"
          />
        </svg>
      )}
      <span>{nextLabel}</span>
    </button>
  );
}
