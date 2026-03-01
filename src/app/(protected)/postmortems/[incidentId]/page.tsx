import { notFound } from "next/navigation";

import { PostmortemEditor } from "@/components/postmortems/postmortem-editor";
import { Card } from "@/components/ui/card";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function PostmortemDetailPage({
  params,
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const user = await requireCurrentUser();
  const { activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeamId) {
    notFound();
  }

  const { incidentId } = await params;

  const incident = await prisma.incident.findFirst({
    where: {
      id: incidentId,
      teamId: activeTeamId,
    },
    include: {
      postmortem: {
        include: {
          actionItems: {
            orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
          },
        },
      },
    },
  });

  if (!incident) {
    notFound();
  }

  const [canViewPostmortem, canUpdatePostmortem] = await Promise.all([
    canUserPerformTeamAction(user.id, incident.teamId, "POSTMORTEM", "VIEW"),
    canUserPerformTeamAction(user.id, incident.teamId, "POSTMORTEM", "UPDATE"),
  ]);

  if (!canViewPostmortem) {
    notFound();
  }

  const users = await prisma.user.findMany({
    where: {
      teamMemberships: {
        some: {
          teamId: activeTeamId,
        },
      },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <Card title={`Postmortem · ${incident.incidentKey}`} subtitle={incident.title}>
        <PostmortemEditor
          incidentId={incident.id}
          readOnly={!canUpdatePostmortem}
          users={users}
          initial={{
            whatHappened: incident.postmortem?.whatHappened ?? "",
            impact: incident.postmortem?.impact ?? "",
            rootCause: incident.postmortem?.rootCause ?? "",
            detectionGaps: incident.postmortem?.detectionGaps ?? "",
            actionItemsSummary: incident.postmortem?.actionItemsSummary ?? "",
            followUpBy: incident.postmortem?.followUpBy
              ? incident.postmortem.followUpBy.toISOString().slice(0, 10)
              : "",
            actionItems:
              incident.postmortem?.actionItems.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description ?? "",
                ownerUserId: item.ownerUserId ?? "",
                dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : "",
                status: item.status,
                priority: item.priority,
              })) ?? [],
          }}
        />
      </Card>
    </div>
  );
}
