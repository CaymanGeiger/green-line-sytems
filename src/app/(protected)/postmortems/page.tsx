import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function PostmortemsPage() {
  const user = await requireCurrentUser();
  const { activeTeam, activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeam || !activeTeamId) {
    return (
      <Card title="Postmortems" subtitle="Review incident learnings and operational follow-through.">
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </Card>
    );
  }

  const canViewPostmortems = await canUserPerformTeamAction(user.id, activeTeamId, "POSTMORTEM", "VIEW");
  if (!canViewPostmortems) {
    return (
      <Card title="Postmortems" subtitle="Review incident learnings and operational follow-through.">
        <p className="text-sm text-slate-500">You do not have permission to view postmortems for this team.</p>
      </Card>
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
      <Card title="Postmortems" subtitle={`Review incident learnings and follow-through for ${activeTeam.name}.`}>
        {postmortems.length === 0 ? (
          <p className="text-sm text-slate-500">No postmortems yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Incident</th>
                  <th className="pb-2">Severity</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Action items</th>
                  <th className="pb-2">Follow up by</th>
                  <th className="pb-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {postmortems.map((postmortem) => {
                  const openCount = postmortem.actionItems.filter((item) => item.status !== "DONE").length;

                  return (
                    <tr key={postmortem.incidentId} className="border-b border-slate-100 last:border-none">
                      <td className="py-3">
                        <Link className="font-semibold text-blue-700 hover:text-blue-800" href={`/postmortems/${postmortem.incidentId}`}>
                          {postmortem.incident.incidentKey}
                        </Link>
                        <p className="text-xs text-slate-500">{postmortem.incident.title}</p>
                      </td>
                      <td className="py-3">{postmortem.incident.severity}</td>
                      <td className="py-3">
                        <Badge tone={postmortem.incident.status === "RESOLVED" ? "resolved" : "warning"}>
                          {postmortem.incident.status}
                        </Badge>
                      </td>
                      <td className="py-3">{openCount} open</td>
                      <td className="py-3 text-xs text-slate-600">{formatDateTime(postmortem.followUpBy)}</td>
                      <td className="py-3 text-xs text-slate-600">{formatDateTime(postmortem.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
