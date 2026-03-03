import Link from "next/link";

import { CreateSavedViewForm } from "@/components/saved-views/create-saved-view-form";
import { DeleteSavedViewButton } from "@/components/saved-views/delete-saved-view-button";
import { AccordionCard } from "@/components/ui/accordion-card";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

const FILTER_LABELS: Record<string, string> = {
  teamId: "Team",
  serviceId: "Service",
  environmentId: "Environment",
  window: "Time window",
  showSimulation: "Simulation only",
  q: "Search",
  status: "Status",
  severity: "Severity",
  sort: "Sort",
  from: "From",
  to: "To",
};

function queryFromFilters(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (key === "teamId") {
      return;
    }
    if (value === null || value === undefined) {
      return;
    }
    params.set(key, String(value));
  });

  return params.toString();
}

function formatFilterValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return keyForWindow(value);
  }
  return String(value);
}

function keyForWindow(value: number): string {
  if (value === 1) return "24h";
  if (value === 7) return "7d";
  if (value === 14) return "14d";
  if (value === 30) return "30d";
  if (value === 90) return "90d";
  return `${value}d`;
}

export default async function SavedViewsPage() {
  const user = await requireCurrentUser();
  const { activeTeam, activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeam || !activeTeamId) {
    return (
      <Card title="Saved Views">
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </Card>
    );
  }

  const [canViewSavedViews, canCreateSavedViews, canDeleteSavedViews] = await Promise.all([
    canUserPerformTeamAction(user.id, activeTeamId, "SAVED_VIEW", "VIEW"),
    canUserPerformTeamAction(user.id, activeTeamId, "SAVED_VIEW", "CREATE"),
    canUserPerformTeamAction(user.id, activeTeamId, "SAVED_VIEW", "DELETE"),
  ]);
  if (!canViewSavedViews) {
    return (
      <Card title="Saved Views">
        <p className="text-sm text-slate-500">You do not have permission to view saved views for this team.</p>
      </Card>
    );
  }

  const teams = [{ id: activeTeam.id, name: activeTeam.name, slug: activeTeam.slug, membershipRole: activeTeam.membershipRole }];
  const allowedTeamIds = [activeTeamId];

  const [savedViews, services, environments] = await Promise.all([
    prisma.savedView.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
    prisma.service.findMany({
      where: {
        teamId: {
          in: allowedTeamIds,
        },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, teamId: true },
    }),
    prisma.environment.findMany({
      where: {
        service: {
          teamId: {
            in: allowedTeamIds,
          },
        },
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, serviceId: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <AccordionCard title="Saved Views" subtitle="Reusable dashboard and incident filters for repeated workflows.">
        {canCreateSavedViews ? (
          <CreateSavedViewForm teams={teams} services={services} environments={environments} />
        ) : (
          <p className="text-sm text-slate-500">You do not have permission to create saved views for this team.</p>
        )}
      </AccordionCard>

      <AccordionCard
        title="My Views"
        subtitle="Saved dashboard and incident filters you can reapply in one click."
        preferenceKey="saved-views-my-views"
        defaultOpen
      >
        {savedViews.length === 0 ? (
          <p className="text-sm text-slate-500">No saved views yet.</p>
        ) : (
          <div className="space-y-3">
            {savedViews.map((view) => {
              const filters = typeof view.filtersJson === "object" && view.filtersJson ? (view.filtersJson as Record<string, unknown>) : {};
              const query = queryFromFilters(filters);
              const href = view.scope === "dashboard" ? `/?${query}` : `/incidents?${query}`;

              return (
                <article key={view.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{view.name}</p>
                      <p className="text-xs text-slate-500">Updated {formatDateTime(view.updatedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone="info">{view.scope}</Badge>
                      <DeleteSavedViewButton id={view.id} disabled={!canDeleteSavedViews} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link href={href} className="text-sm font-semibold text-green-700 hover:text-green-800">
                      Open view
                    </Link>
                    {Object.entries(filters).map(([key, value]) => (
                      <span
                        key={`${view.id}-${key}`}
                        className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                      >
                        {(FILTER_LABELS[key] ?? key)}: {formatFilterValue(value)}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </AccordionCard>
    </div>
  );
}
