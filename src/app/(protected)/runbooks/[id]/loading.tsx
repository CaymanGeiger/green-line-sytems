import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function RunbookDetailLoading() {
  return (
    <div className="space-y-6">
      <Card title="Runbook">
        <LinesSkeleton lines={10} />
      </Card>
      <Card title="Version History">
        <LinesSkeleton lines={5} />
      </Card>
    </div>
  );
}
