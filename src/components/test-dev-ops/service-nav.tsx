"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { toSimulatorKind } from "@/lib/test-dev-ops";

export function ServiceNav({
  teamId,
  services,
}: {
  teamId: string;
  services: Array<{ id: string; name: string; slug: string }>;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-2">
      <Link
        href={`/test-dev-ops/${teamId}`}
        className={`block rounded-lg px-3 py-2 text-sm font-semibold transition ${
          pathname === `/test-dev-ops/${teamId}`
            ? "border border-slate-200 bg-slate-100 text-slate-900"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        Team Overview
      </Link>
      {services.map((service) => {
        const active = pathname === `/test-dev-ops/${teamId}/${service.id}`;

        return (
          <Link
            key={service.id}
            href={`/test-dev-ops/${teamId}/${service.id}`}
            className={`block rounded-lg border px-3 py-2 text-sm transition ${
              active
                ? "border-slate-200 bg-slate-100 text-slate-900"
                : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
            }`}
          >
            <p className="font-semibold">{service.name}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">{toSimulatorKind(service.name, service.slug)}</p>
          </Link>
        );
      })}
    </div>
  );
}
