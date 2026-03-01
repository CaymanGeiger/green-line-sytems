import { LinesSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function PostmortemsLoading() {
  return (
    <Card title="Postmortems" subtitle="Loading postmortem list...">
      <LinesSkeleton lines={10} />
    </Card>
  );
}
