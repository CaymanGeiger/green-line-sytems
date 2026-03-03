"use client";

import type { MouseEvent } from "react";

import { EMPLOYEE_ACCESS_DRAWER_OPEN_EVENT } from "@/lib/employee-access/shared";

type UserMenuEmployeeAccessButtonProps = {
  className?: string;
  children: string;
};

export function UserMenuEmployeeAccessButton({ className, children }: UserMenuEmployeeAccessButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const details = event.currentTarget.closest("details");
    if (details instanceof HTMLDetailsElement) {
      details.open = false;
    }

    window.dispatchEvent(new Event(EMPLOYEE_ACCESS_DRAWER_OPEN_EVENT));
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {children}
    </button>
  );
}

