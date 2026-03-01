import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function TestDevOpsServiceLoading() {
  return (
    <div className="space-y-4">
      <Card title="Service Simulator">
        <LinesSkeleton lines={10} />
      </Card>
      <Card title="Expected Behavior">
        <LinesSkeleton lines={6} />
      </Card>
    </div>
  );
}
