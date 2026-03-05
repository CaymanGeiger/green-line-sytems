"use client";

import { LoadingInline } from "@/components/ui/loading-spinner";

type RouteLoadingProps = {
  label?: string;
};

export function RouteLoading({ label = "Loading page..." }: RouteLoadingProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <LoadingInline label={label} className="text-slate-600" spinnerClassName="text-green-700" size={20} />
    </div>
  );
}
