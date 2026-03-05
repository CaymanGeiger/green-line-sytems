import { ActionItemsWorkspace } from "@/components/action-items/action-items-workspace";
import { AppSelect } from "@/components/ui/app-select";
import { AccordionCard } from "@/components/ui/accordion-card";
import { FilterApplyButton } from "@/components/ui/filter-apply-button";
import { getActionItemsPageData, type SearchParams } from "@/lib/action-items/page-data";
import { getActiveTeamContext } from "@/lib/auth/active-team";
import { canUserPerformTeamActions } from "@/lib/auth/permissions";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function ActionItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCurrentUser();
  const params = await searchParams;

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

  const [canViewActionItems, canCreateActionItems, canUpdateActionItems, canDeleteActionItems] =
    await canUserPerformTeamActions(user.id, activeTeamId, [
      { resource: "ACTION_ITEM", action: "VIEW" },
      { resource: "ACTION_ITEM", action: "CREATE" },
      { resource: "ACTION_ITEM", action: "UPDATE" },
      { resource: "ACTION_ITEM", action: "DELETE" },
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

  const { filters, users, postmortems, actionItems, ownerUserId } = await getActionItemsPageData(activeTeamId, params);

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
            defaultValue={filters.q ?? ""}
            placeholder="Search task, incident key, incident title"
            className="h-10 md:col-span-2 rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none"
          />
          <AppSelect
            name="status"
            defaultValue={filters.status ?? ""}
            className="h-10 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none"
          >
            <option value="">All status</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="DONE">DONE</option>
          </AppSelect>
          <AppSelect
            name="priority"
            defaultValue={filters.priority ?? ""}
            className="h-10 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none"
          >
            <option value="">All priority</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
            <option value="P3">P3</option>
          </AppSelect>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Team
            <p
              title={activeTeam.name}
              className="inline-flex h-10 w-full min-w-0 items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium leading-none text-slate-700"
            >
              {activeTeam.name}
            </p>
          </label>
          <AppSelect
            name="ownerUserId"
            defaultValue={ownerUserId ?? ""}
            className="h-10 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none"
          >
            <option value="">All owners</option>
            {users.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </AppSelect>
          <AppSelect
            name="sort"
            defaultValue={filters.sort}
            className="h-10 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm leading-none"
          >
            <option value="due">Due date</option>
            <option value="updated">Recently updated</option>
            <option value="priority">Priority</option>
          </AppSelect>
          <FilterApplyButton />
        </form>
      </AccordionCard>

      <AccordionCard
        title="Remediation Queue"
        subtitle={`${actionItems.length} action items`}
        preferenceKey="action-items-remediation-queue"
        defaultOpen
      >
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
      </AccordionCard>
    </div>
  );
}
