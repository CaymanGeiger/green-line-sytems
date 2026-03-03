import { TeamEntryForm } from "@/components/test-dev-ops/team-entry-form";
import { Card } from "@/components/ui/card";
import { getTeamIdsForPermission } from "@/lib/auth/permissions";
import { getAccessibleTeams } from "@/lib/auth/team-access";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function TestDevOpsLandingPage() {
  const user = await requireCurrentUser();
  const [teams, allowedTeamIds] = await Promise.all([
    getAccessibleTeams(user.id),
    getTeamIdsForPermission(user.id, "SIMULATOR", "VIEW"),
  ]);
  const allowedTeamIdSet = new Set(allowedTeamIds);
  const scopedTeams = teams.filter((team) => allowedTeamIdSet.has(team.id));

  return (
    <div className="space-y-6">
      <Card
        title="GreenLine Systems Failure Simulator"
        subtitle="Pick a team, enter a realistic multi-service sandbox, and intentionally trigger reliability events."
      >
        {scopedTeams.length === 0 ? (
          <p className="text-sm text-slate-500">No teams available with simulator access.</p>
        ) : (
          <TeamEntryForm teams={scopedTeams} />
        )}
      </Card>

      <Card title="How This Works" subtitle="Each action writes real telemetry rows to your existing platform schema.">
        <ul className="space-y-2 text-sm text-slate-700">
          <li>1. Select a team and environment profile.</li>
          <li>2. Open a service simulator and trigger healthy, warning, or failure outcomes.</li>
          <li>3. Watch dashboard/incidents/services update from generated logs, errors, alerts, deploys, and incidents.</li>
          <li>4. Use presets, resolve controls, and delete controls to reset or replay incident lifecycles.</li>
        </ul>
      </Card>
    </div>
  );
}
