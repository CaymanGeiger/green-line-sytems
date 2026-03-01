"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/incidents", label: "Incidents" },
  { href: "/services", label: "Services" },
  { href: "/runbooks", label: "Runbooks" },
  { href: "/postmortems", label: "Postmortems" },
  { href: "/action-items", label: "Action Items" },
  { href: "/test-dev-ops", label: "Simulator" },
  { href: "/saved-views", label: "Saved Views" },
  { href: "/permissions", label: "Permissions" },
  { href: "/account", label: "Account" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group relative rounded-md px-2.5 py-2 text-[13px] font-medium transition sm:px-3 sm:text-sm ${
              active ? "text-blue-700" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {link.label}
            <span
              className={`absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-blue-600 transition-transform duration-200 ${
                active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-60"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
