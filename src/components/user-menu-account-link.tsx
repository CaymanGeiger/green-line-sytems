"use client";

import Link from "next/link";
import type { MouseEvent } from "react";

type UserMenuAccountLinkProps = {
  href: string;
  className?: string;
  children: string;
};

export function UserMenuAccountLink({ href, className, children }: UserMenuAccountLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const details = event.currentTarget.closest("details");
    if (details instanceof HTMLDetailsElement) {
      details.open = false;
    }
  }

  return (
    <Link href={href} onClick={handleClick} className={className}>
      {children}
    </Link>
  );
}
