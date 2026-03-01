import { ActionItemsWorkspace } from "@/components/action-items/action-items-workspace";
import { AccordionCard } from "@/components/ui/accordion-card";
import { Card } from "@/components/ui/card";
import { FilterApplyButton } from "@/components/ui/filter-apply-button";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamAction } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

type SearchParams = Record<string, string | string[] | undefined>;

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function buildOrderBy(sort: string | undefined) {
  if (sort === "priority") {
    return [{ priority: "asc" as const }, { updatedAt: "desc" as const }];
  }

  if (sort === "updated") {
    return [{ updatedAt: "desc" as const }];
  }

  return [{ dueDate: "asc" as const }, { updatedAt: "desc" as const }];
}

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;

  const q = getStringParam(params.q)?.trim();
  const status = getStringParam(params.status);
  const priority = getStringParam(params.priority);
  const requestedOwnerUserId = getStringParam(params.ownerUserId);
  const sort = getStringParam(params.sort) ?? "due";

  const { activeTeam, activeTeamId } = await getActiveTeamContext(user.id);
  if (!activeTeam || !activeTeamId) {
    return (
      <AccordionCard
        title="Action Items"
        subtitle="Remediation queue for post-incident follow-through and reliability hardening."
        defaultOpen
      >
        <p className="text-sm text-slate-500">You do not belong to a team yet. Join or create a team in Account.</p>
      </AccordionCard>
    );
  }

  const [canViewActionItems, canCreateActionItems, canUpdateActionItems, canDeleteActionItems] = await Promise.all([
    canUserPerformTeamAction(user.id, activeTeamId, "ACTION_ITEM", "VIEW"),
    canUserPerformTeamAction(user.id, activeTeamId, "ACTION_ITEM", "CREATE"),
    canUserPerformTeamAction(user.id, activeTeamId, "ACTION_ITEM", "UPDATE"),
    canUserPerformTeamAction(user.id, activeTeamId, "ACTION_ITEM", "DELETE"),
  ]);
  if (!canViewActionItems) {
    return (
      <AccordionCard
        title="Action Items"
        subtitle="Remediation queue for post-incident follow-through and reliability hardening."
        defaultOpen
      >
        <p className="text-sm text-slate-500">You do not have permission to view action items for this team.</p>
      </AccordionCard>
    );
  }

  const [users, postmortems] = await Promise.all([
    prisma.user.findMany({
      where: {
        teamMemberships: {
          some: {
            teamId: activeTeamId,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
      },
      distinct: ["id"],
    }),
    prisma.postmortem.findMany({
      where: {
        incident: {
          teamId: activeTeamId,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 200,
      select: {
        id: true,
        incidentId: true,
        incident: {
          select: {
            incidentKey: true,
            title: true,
          },
        },
      },
    }),
  ]);

  const allowedUserIds = new Set(users.map((entry) => entry.id));
  const ownerUserId = requestedOwnerUserId && allowedUserIds.has(requestedOwnerUserId) ? requestedOwnerUserId : undefined;
  const actionItems = await prisma.actionItem.findMany({
    where: {
      postmortem: {
        incident: {
          teamId: activeTeamId,
          ...(q
            ? {
                OR: [
                  { incidentKey: { contains: q } },
                  { title: { contains: q } },
                ],
              }
            : {}),
        },
      },
      ...(q
        ? {
            OR: [{ title: { contains: q } }, { description: { contains: q } }],
          }
        : {}),
      ...(status ? { status: status as "OPEN" | "IN_PROGRESS" | "DONE" } : {}),
      ...(priority ? { priority: priority as "P1" | "P2" | "P3" } : {}),
      ...(ownerUserId ? { ownerUserId } : {}),
    },
    orderBy: buildOrderBy(sort),
    take: 250,
    select: {
      id: true,
      postmortemId: true,
      title: true,
      description: true,
      ownerUserId: true,
      dueDate: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      ownerUser: {
        select: {
          id: true,
          name: true,
        },
      },
      postmortem: {
        select: {
          incidentId: true,
          incident: {
            select: {
              incidentKey: true,
              title: true,
              team: {
                select: {
                  name: true,
                },
              },
              service: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <AccordionCard
        title="Action Items"
        subtitle="Remediation queue for post-incident follow-through and reliability hardening."
        defaultOpen
      >
        <form method="GET" className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search task, incident key, incident title"
            className="md:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All status</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
          </select>
          <select
            name="priority"
            defaultValue={priority ?? ""}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All priority</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </select>
          <p
            title={activeTeam.name}
            className="inline-flex h-10 w-full min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700"
          >
            {activeTeam.name}
          </p>
          <select
            name="ownerUserId"
            defaultValue={ownerUserId ?? ""}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">All owners</option>
            {users.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="due">Due date</option>
            <option value="updated">Recently updated</option>
            <option value="priority">Priority</option>
          </select>
          <FilterApplyButton />
        </form>
      </AccordionCard>

      <Card title="Remediation Queue" subtitle={`${actionItems.length} action items`}>
        <ActionItemsWorkspace
          permissions={{
            canCreate: canCreateActionItems,
            canUpdate: canUpdateActionItems,
            canDelete: canDeleteActionItems,
          }}
          users={users}
          postmortems={postmortems.map((postmortem) => ({
            id: postmortem.id,
            incidentId: postmortem.incidentId,
            incidentKey: postmortem.incident.incidentKey,
            incidentTitle: postmortem.incident.title,
          }))}
          initialItems={actionItems.map((item) => ({
            id: item.id,
            postmortemId: item.postmortemId,
            title: item.title,
            description: item.description,
            ownerUserId: item.ownerUserId,
            dueDate: item.dueDate ? item.dueDate.toISOString() : null,
            status: item.status,
            priority: item.priority,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            ownerUser: item.ownerUser,
            incident: {
              id: item.postmortem.incidentId,
              incidentKey: item.postmortem.incident.incidentKey,
              title: item.postmortem.incident.title,
              teamName: item.postmortem.incident.team.name,
              serviceName: item.postmortem.incident.service?.name ?? null,
            },
          }))}
        />
      </Card>
    </div>
  );
}
