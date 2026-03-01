"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { normalizeAccordionPreferenceKey } from "@/lib/ui-preferences";
import { useUiBooleanPreference } from "@/components/ui/ui-preferences-provider";

type AccordionCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
  preferenceKey?: string;
};

export function AccordionCard({
  title,
  subtitle,
  action,
  children,
  className,
  defaultOpen = false,
  preferenceKey,
}: AccordionCardProps) {
  const pathname = usePathname();
  const key = preferenceKey ?? title;
  const preferenceStorageKey = normalizeAccordionPreferenceKey(pathname, key);
  const [open, setOpen] = useUiBooleanPreference(preferenceStorageKey, defaultOpen);

  function toggleOpen() {
    setOpen(!open);
  }

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white/90 shadow-sm backdrop-blur ${className ?? ""}`.trim()}>
      <header
        className="cursor-pointer border-b border-slate-100 px-5 py-4"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={toggleOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleOpen();
          }
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
            {action}
            <button
              type="button"
              onClick={toggleOpen}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {open ? "Hide" : "Show"}
            </button>
          </div>
        </div>
      </header>
      {open ? <div className="px-5 py-4">{children}</div> : null}
    </section>
  );
}
