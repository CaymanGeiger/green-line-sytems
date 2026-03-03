"use client";

import { ReactNode, useState } from "react";
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
  forceOpen?: boolean;
};

export function AccordionCard({
  title,
  subtitle,
  action,
  children,
  className,
  defaultOpen = false,
  preferenceKey,
  forceOpen = false,
}: AccordionCardProps) {
  const pathname = usePathname();
  const key = preferenceKey ?? title;
  const preferenceStorageKey = normalizeAccordionPreferenceKey(pathname, key);
  const [storedOpen, setStoredOpen] = useUiBooleanPreference(preferenceStorageKey, defaultOpen);
  const [forceOpenActive, setForceOpenActive] = useState(forceOpen);
  const open = forceOpenActive ? true : storedOpen;

  return (
    <section
      className={`panel-stroke self-start rounded-xl border border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(148,163,184,0.1)] transition hover:border-slate-300 ${className ?? ""}`.trim()}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (forceOpenActive) {
            setForceOpenActive(false);
            setStoredOpen(false);
            return;
          }
          setStoredOpen(!open);
        }}
        className={`flex w-full cursor-pointer items-start justify-between gap-4 px-5 py-4 text-left ${open ? "border-b border-slate-200" : ""}`}
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <span className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
            {open ? "Hide" : "Show"}
          </span>
        </div>
      </button>
      {open ? <div className="px-5 py-4">{children}</div> : null}
    </section>
  );
}
