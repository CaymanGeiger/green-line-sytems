import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function TestDevOpsTeamLoading() {
  return (
    <div className="space-y-4">
      <Card title="Simulator Controls">
        <LinesSkeleton lines={6} />
      </Card>
      <Card title="Team Simulator">
        <LinesSkeleton lines={8} />
      </Card>
    </div>
  );
}
