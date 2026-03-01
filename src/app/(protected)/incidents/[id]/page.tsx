import Link from "next/link";
import { notFound } from "next/navigation";

import { IncidentDetailActions } from "@/components/incidents/incident-detail-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { incidentSeverityTone, incidentStatusTone } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const { activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeamId) {
    notFound();
  }

  const incident = await prisma.incident.findFirst({
    where: {
      id,
      teamId: activeTeamId,
    },
    include: {
      service: {
        select: {
          id: true,
          name: true,
        },
      },
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      commanderUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignees: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      timelineEvents: {
        orderBy: {
          createdAt: "desc",
        },
        include: {
          createdByUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      postmortem: {
        select: {
          id: true,
          actionItemsSummary: true,
        },
      },
    },
  });

  if (!incident) {
    notFound();
  }

  const [canViewIncident, canUpdateIncident, canUpdatePostmortem] = await Promise.all([
    canUserPerformTeamAction(user.id, incident.teamId, "INCIDENT", "VIEW"),
    canUserPerformTeamAction(user.id, incident.teamId, "INCIDENT", "UPDATE"),
    canUserPerformTeamAction(user.id, incident.teamId, "POSTMORTEM", "UPDATE"),
  ]);

  if (!canViewIncident) {
    notFound();
  }

  const [linkedDeploys, linkedAlerts, runbooks] = await Promise.all([
    prisma.deployEvent.findMany({
      where: incident.serviceId
        ? {
            serviceId: incident.serviceId,
          }
        : undefined,
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        provider: true,
        status: true,
        commitSha: true,
        createdAt: true,
        url: true,
      },
    }),
    prisma.alertEvent.findMany({
      where: {
        OR: [{ incidentId: incident.id }, ...(incident.serviceId ? [{ serviceId: incident.serviceId }] : [])],
      },
      orderBy: {
        triggeredAt: "desc",
      },
      take: 8,
      select: {
        id: true,
        source: true,
        title: true,
        severity: true,
        status: true,
        triggeredAt: true,
      },
    }),
    prisma.runbook.findMany({
      where: {
        teamId: incident.teamId,
        isActive: true,
        ...(incident.serviceId ? { OR: [{ serviceId: incident.serviceId }, { serviceId: null }] } : {}),
      },
      orderBy: [{ serviceId: "desc" }, { updatedAt: "desc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        slug: true,
        version: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <Card
        title={`${incident.incidentKey} · ${incident.title}`}
        subtitle={`Team ${incident.team.name}${incident.service ? ` · Service ${incident.service.name}` : ""}`}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={incidentSeverityTone(incident.severity)}>{incident.severity}</Badge>
            <Badge tone={incidentStatusTone(incident.status)}>{incident.status}</Badge>
          </div>
        }
      >
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-4">
          <p>
            <span className="font-semibold text-slate-900">Started:</span> {formatDateTime(incident.startedAt)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Detected:</span> {formatDateTime(incident.detectedAt)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Acknowledged:</span> {formatDateTime(incident.acknowledgedAt)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Resolved:</span> {formatDateTime(incident.resolvedAt)}
          </p>
        </div>
        {incident.summary ? <p className="mt-3 text-sm text-slate-700">{incident.summary}</p> : null}
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card title="Timeline" subtitle="Event stream and operational notes" className="xl:col-span-2">
          {incident.timelineEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No timeline events yet.</p>
          ) : (
            <ul className="space-y-3">
              {incident.timelineEvents.map((event) => (
                <li key={event.id} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{event.type}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{event.message}</p>
                  {event.createdByUser ? (
                    <p className="mt-1 text-xs text-slate-500">By {event.createdByUser.name}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card title="Actions" subtitle="Status, severity, and timeline updates">
            {canUpdateIncident ? (
              <IncidentDetailActions
                incidentId={incident.id}
                currentStatus={incident.status}
                currentSeverity={incident.severity}
              />
            ) : (
              <p className="text-sm text-slate-500">You do not have permission to modify incidents for this team.</p>
            )}
          </Card>

          <Card title="Assignees" subtitle="Current incident team">
            {incident.assignees.length === 0 ? (
              <p className="text-sm text-slate-500">No assignees yet.</p>
            ) : (
              <ul className="space-y-2">
                {incident.assignees.map((assignee) => (
                  <li key={assignee.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-slate-900">{assignee.user.name}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{assignee.role}</p>
                  </li>
                ))}
              </ul>
            )}
            {incident.commanderUser ? (
              <p className="mt-3 text-xs text-slate-500">Commander: {incident.commanderUser.name}</p>
            ) : null}
          </Card>

          <Card title="Linked Deploys" subtitle="Potentially related rollout activity">
            {linkedDeploys.length === 0 ? (
              <p className="text-sm text-slate-500">No linked deploys.</p>
            ) : (
              <ul className="space-y-2">
                {linkedDeploys.map((deploy) => (
                  <li key={deploy.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-slate-900">{deploy.provider} · {deploy.status}</p>
                    <p className="font-mono text-xs text-slate-600">{deploy.commitSha.slice(0, 10)}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(deploy.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Linked Alerts" subtitle="Related alert states">
            {linkedAlerts.length === 0 ? (
              <p className="text-sm text-slate-500">No linked alerts.</p>
            ) : (
              <ul className="space-y-2">
                {linkedAlerts.map((alert) => (
                  <li key={alert.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-semibold text-slate-900">{alert.title}</p>
                    <p className="text-xs text-slate-500">
                      {alert.source} · {alert.severity} · {alert.status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Runbooks" subtitle="Suggested procedures">
            {runbooks.length === 0 ? (
              <p className="text-sm text-slate-500">No matching runbooks.</p>
            ) : (
              <ul className="space-y-2">
                {runbooks.map((runbook) => (
                  <li key={runbook.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <Link className="font-semibold text-blue-700" href={`/runbooks/${runbook.id}`}>
                      {runbook.title}
                    </Link>
                    <p className="text-xs text-slate-500">{runbook.slug} · v{runbook.version}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </section>

      {incident.status === "RESOLVED" ? (
        <Card title="Postmortem" subtitle="Capture learnings and action items while context is fresh.">
          {incident.postmortem ? (
            <div>
              <p className="text-sm text-slate-700">{incident.postmortem.actionItemsSummary}</p>
              <Link className="mt-2 inline-block text-sm font-semibold text-blue-700" href={`/postmortems/${incident.id}`}>
                Open postmortem
              </Link>
            </div>
          ) : (
            <div>
              {canUpdatePostmortem ? (
                <Link className="text-sm font-semibold text-blue-700" href={`/postmortems/${incident.id}`}>
                  Create postmortem
                </Link>
              ) : (
                <p className="text-sm text-slate-500">You do not have permission to create a postmortem for this incident.</p>
              )}
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
