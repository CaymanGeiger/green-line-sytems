import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function PostmortemDetailLoading() {
  return (
    <Card title="Postmortem" subtitle="Loading details...">
      <LinesSkeleton lines={12} />
    </Card>
  );
}
