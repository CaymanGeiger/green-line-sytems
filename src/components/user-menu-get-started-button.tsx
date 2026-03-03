"use client";

import type { MouseEvent } from "react";

import { GET_STARTED_OPEN_EVENT } from "@/lib/get-started/shared";

type UserMenuGetStartedButtonProps = {
  className?: string;
  children: string;
};

export function UserMenuGetStartedButton({ className, children }: UserMenuGetStartedButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const details = event.currentTarget.closest("details");
    if (details instanceof HTMLDetailsElement) {
      details.open = false;
    }

    window.dispatchEvent(new Event(GET_STARTED_OPEN_EVENT));
  }

  return (
    <button type="button" className={className} onClick={handleClick}>
      {children}
    </button>
  );
}

