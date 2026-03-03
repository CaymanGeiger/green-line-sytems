import type { ButtonHTMLAttributes } from "react";

import { Button } from "@/components/ui/button";

type FilterApplyButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function FilterApplyButton({ className, ...props }: FilterApplyButtonProps) {
  return (
    <Button
      type="submit"
      className={`inline-flex h-10 w-full items-center justify-center border border-green-700 px-4 text-sm leading-none ring-0 sm:w-auto ${className ?? ""}`.trim()}
      {...props}
    >
      Apply
    </Button>
  );
}
