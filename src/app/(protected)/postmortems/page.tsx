import Link from "next/link";

import { AccordionCard } from "@/components/ui/accordion-card";
import { Badge } from "@/components/ui/badge";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { incidentSeverityTone, incidentStatusTone } from "@/lib/presentation";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function PostmortemsPage() {
  const user = await requireCurrentUser();
  const { activeTeam, activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeam || !activeTeamId) {
    return (
      <AccordionCard
        title="Postmortems"
        subtitle="Review incident learnings and operational follow-through."
        defaultOpen
      >
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </AccordionCard>
    );
  }

  const canViewPostmortems = await canUserPerformTeamAction(user.id, activeTeamId, "POSTMORTEM", "VIEW");
  if (!canViewPostmortems) {
    return (
      <AccordionCard
        title="Postmortems"
        subtitle="Review incident learnings and operational follow-through."
        defaultOpen
      >
        <p className="text-sm text-slate-500">You do not have permission to view postmortems for this team.</p>
      </AccordionCard>
    );
  }

  const postmortems = await prisma.postmortem.findMany({
    where: {
      incident: {
        teamId: activeTeamId,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 150,
    select: {
      incidentId: true,
      updatedAt: true,
      followUpBy: true,
      incident: {
        select: {
          incidentKey: true,
          title: true,
          severity: true,
          status: true,
        },
      },
      actionItems: {
        select: {
          status: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Postmortems"
        subtitle={`Review incident learnings and follow-through for ${activeTeam.name}.`}
        preferenceKey="postmortems-list"
        defaultOpen
      >
        {postmortems.length === 0 ? (
          <p className="text-sm text-slate-500">No postmortems yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 pb-2 md:px-4">Incident</th>
                  <th className="px-3 pb-2 md:px-4">Severity</th>
                  <th className="px-3 pb-2 md:px-4">Status</th>
                  <th className="px-3 pb-2 md:px-4">Action items</th>
                  <th className="px-3 pb-2 md:px-4">Follow up by</th>
                  <th className="px-3 pb-2 md:px-4">Updated</th>
                </tr>
              </thead>
              <tbody>
                {postmortems.map((postmortem) => {
                  const openCount = postmortem.actionItems.filter((item) => item.status !== "DONE").length;

                  return (
                    <tr key={postmortem.incidentId} className="border-b border-slate-100 last:border-none">
                      <td className="px-3 py-3 md:px-4">
                        <Link className="font-semibold text-green-700 hover:text-green-800" href={`/postmortems/${postmortem.incidentId}`}>
                          {postmortem.incident.incidentKey}
                        </Link>
                        <p className="text-xs text-slate-500">{postmortem.incident.title}</p>
                      </td>
                      <td className="px-3 py-3 md:px-4">
                        <Badge tone={incidentSeverityTone(postmortem.incident.severity)}>
                          {postmortem.incident.severity}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 md:px-4">
                        <Badge tone={incidentStatusTone(postmortem.incident.status)}>
                          {postmortem.incident.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 md:px-4">{openCount} open</td>
                      <td className="px-3 py-3 text-xs text-slate-600 md:px-4">{formatDateTime(postmortem.followUpBy)}</td>
                      <td className="px-3 py-3 text-xs text-slate-600 md:px-4">{formatDateTime(postmortem.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AccordionCard>
    </div>
  );
}
