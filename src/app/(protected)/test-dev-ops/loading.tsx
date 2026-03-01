import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function TestDevOpsLandingLoading() {
  return (
    <div className="space-y-6">
      <Card title="DevOps Failure Simulator" subtitle="Loading team options...">
        <LinesSkeleton lines={5} />
      </Card>
      <Card title="How This Works">
        <LinesSkeleton lines={4} />
      </Card>
    </div>
  );
}
