import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function RunbooksLoading() {
  return (
    <div className="space-y-6">
      <Card title="Runbooks">
        <LinesSkeleton lines={2} />
      </Card>
      <Card title="Create Runbook">
        <LinesSkeleton lines={8} />
      </Card>
      <Card title="Runbook Library">
        <LinesSkeleton lines={10} />
      </Card>
    </div>
  );
}
