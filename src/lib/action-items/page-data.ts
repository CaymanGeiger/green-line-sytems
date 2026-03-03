import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type SearchParams = Record<string, string | string[] | undefined>;

export type ActionItemsPageFilters = {
  q?: string;
  status?: string;
  priority?: string;
  requestedOwnerUserId?: string;
  sort: string;
};

export type ActionItemsPageData = {
  filters: ActionItemsPageFilters;
  users: Array<{ id: string; name: string }>;
  postmortems: Array<{
    id: string;
    incidentId: string;
    incident: {
      incidentKey: string;
      title: string;
    };
  }>;
  actionItems: Array<{
    id: string;
    postmortemId: string;
    title: string;
    description: string | null;
    ownerUserId: string | null;
    dueDate: Date | null;
    status: "OPEN" | "IN_PROGRESS" | "DONE";
    priority: "P1" | "P2" | "P3";
    createdAt: Date;
    updatedAt: Date;
    ownerUser: {
      id: string;
      name: string;
    } | null;
    postmortem: {
      incidentId: string;
      incident: {
        incidentKey: string;
        title: string;
        team: {
          name: string;
        };
        service: {
          name: string;
        } | null;
      };
    };
  }>;
  ownerUserId?: string;
};

function getStringParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseActionItemsSearchParams(params: SearchParams): ActionItemsPageFilters {
  return {
    q: getStringParam(params.q)?.trim(),
    status: getStringParam(params.status),
    priority: getStringParam(params.priority),
    requestedOwnerUserId: getStringParam(params.ownerUserId),
    sort: getStringParam(params.sort) ?? "due",
  };
}

function buildOrderBy(sort: string | undefined): Prisma.ActionItemOrderByWithRelationInput[] {
  if (sort === "priority") {
    return [{ priority: "asc" }, { updatedAt: "desc" }];
  }

  if (sort === "updated") {
    return [{ updatedAt: "desc" }];
  }

  return [{ dueDate: "asc" }, { updatedAt: "desc" }];
}

export async function getActionItemsPageData(teamId: string, params: SearchParams): Promise<ActionItemsPageData> {
  const filters = parseActionItemsSearchParams(params);

  const [users, postmortems] = await Promise.all([
    prisma.user.findMany({
      where: {
        teamMemberships: {
          some: {
            teamId,
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
          teamId,
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
  const ownerUserId =
    filters.requestedOwnerUserId && allowedUserIds.has(filters.requestedOwnerUserId)
      ? filters.requestedOwnerUserId
      : undefined;

  const actionItems = await prisma.actionItem.findMany({
    where: {
      postmortem: {
        incident: {
          teamId,
          ...(filters.q
            ? {
                OR: [{ incidentKey: { contains: filters.q } }, { title: { contains: filters.q } }],
              }
            : {}),
        },
      },
      ...(filters.q
        ? {
            OR: [{ title: { contains: filters.q } }, { description: { contains: filters.q } }],
          }
        : {}),
      ...(filters.status ? { status: filters.status as "OPEN" | "IN_PROGRESS" | "DONE" } : {}),
      ...(filters.priority ? { priority: filters.priority as "P1" | "P2" | "P3" } : {}),
      ...(ownerUserId ? { ownerUserId } : {}),
    },
    orderBy: buildOrderBy(filters.sort),
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

  return {
    filters,
    users,
    postmortems,
    actionItems,
    ownerUserId,
  };
}
