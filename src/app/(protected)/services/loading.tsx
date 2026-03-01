import { GridSkeleton } from "@/components/skeletons";
import { Card } from "@/components/ui/card";

export default function ServicesLoading() {
  return (
    <Card title="Services" subtitle="Loading service inventory...">
      <GridSkeleton cards={6} />
    </Card>
  );
}
