"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { TeamSwitcher } from "@/components/team-switcher";

type NavLinkItem = {
  href: string;
  label: string;
};

type NavLinksProps = {
  showAdmin: boolean;
  teams: Array<{
    id: string;
    name: string;
    organizationName?: string;
  }>;
  activeTeamId: string | null;
  mobileLeading?: ReactNode;
};

const DIRECT_LINKS: NavLinkItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/test-dev-ops", label: "Simulator" },
  { href: "/saved-views", label: "Saved Views" },
];

const OPERATIONS_LINKS: NavLinkItem[] = [
  { href: "/incidents", label: "Incidents" },
  { href: "/services", label: "Services" },
  { href: "/runbooks", label: "Runbooks" },
  { href: "/postmortems", label: "Postmortems" },
  { href: "/action-items", label: "Action Items" },
];

const ADMIN_LINKS: NavLinkItem[] = [
  { href: "/organizations", label: "Organizations" },
  { href: "/permissions", label: "Permissions" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupActive(pathname: string, links: NavLinkItem[]): boolean {
  return links.some((link) => isActive(pathname, link.href));
}

function desktopLinkClass(active: boolean): string {
  return `group relative rounded-md px-2.5 py-2 text-[13px] font-medium transition sm:px-3 sm:text-sm ${
    active ? "text-slate-900" : "text-slate-700 hover:text-slate-900"
  }`;
}

function MenuChevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path d="M7 10l5 5 5-5z" fill="currentColor" />
    </svg>
  );
}

function MobileNavGroup({
  title,
  links,
  pathname,
  defaultOpen = false,
  onNavigate,
}: {
  title: string;
  links: NavLinkItem[];
  pathname: string;
  defaultOpen?: boolean;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen || groupActive(pathname, links));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-2">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus-visible:outline-none"
      >
        {title}
        <MenuChevron open={open} />
      </button>

      {open ? (
        <div className="mt-1 space-y-1">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active ? "border border-slate-200 bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function NavLinks({
  showAdmin,
  teams,
  activeTeamId,
  mobileLeading,
}: NavLinksProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<"operations" | "admin" | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopNavRef = useRef<HTMLDivElement | null>(null);

  const visibleAdminLinks = useMemo(() => (showAdmin ? ADMIN_LINKS : []), [showAdmin]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!desktopNavRef.current) {
        return;
      }
      if (event.target instanceof Node && !desktopNavRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <div className="relative md:hidden">
        <div className="flex items-center justify-end gap-2">
          <div className="shrink-0">{mobileLeading ?? null}</div>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
          >
            <span className="sr-only">{mobileOpen ? "Close navigation" : "Open navigation"}</span>
            <span aria-hidden className="relative block h-3.5 w-4">
              <span
                className={`absolute left-0 top-0 h-0.5 w-4 rounded bg-current transition-transform duration-200 ${
                  mobileOpen ? "translate-y-[6px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[6px] h-0.5 w-4 rounded bg-current transition-opacity duration-200 ${
                  mobileOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 top-3 h-0.5 w-4 rounded bg-current transition-transform duration-200 ${
                  mobileOpen ? "translate-y-[-6px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>

      </div>

      {mobileOpen ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,24rem)] space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2 shadow-xl shadow-slate-900/10">
          <section className="rounded-lg border border-slate-200 bg-white p-2">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Active team</p>
            <TeamSwitcher teams={teams} activeTeamId={activeTeamId} className="w-full self-auto" />
          </section>

          {DIRECT_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-slate-200 bg-slate-100 text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <MobileNavGroup
            title="Operations"
            links={OPERATIONS_LINKS}
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />

          {visibleAdminLinks.length > 0 ? (
            <MobileNavGroup
              title="Admin"
              links={visibleAdminLinks}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          ) : null}
        </div>
      ) : null}

      <nav ref={desktopNavRef} className="hidden items-center gap-1 md:flex">
        {DIRECT_LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpenDropdown(null)}
              className={desktopLinkClass(active)}
            >
              {link.label}
              <span
                className={`absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-green-500 transition-transform duration-200 ${
                  active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-60"
                }`}
              />
            </Link>
          );
        })}

        <div className="relative">
          <button
            type="button"
            aria-expanded={openDropdown === "operations"}
            onClick={() => setOpenDropdown((current) => (current === "operations" ? null : "operations"))}
            className={`${desktopLinkClass(
              groupActive(pathname, OPERATIONS_LINKS),
            )} inline-flex cursor-pointer appearance-none items-center gap-1.5 border-0 bg-transparent align-middle hover:!shadow-none focus:outline-none focus-visible:!shadow-none focus-visible:outline-none`}
          >
            <span className="relative inline-block">
              Operations
              <span
                className={`pointer-events-none absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-green-500 transition-transform duration-200 ${
                  groupActive(pathname, OPERATIONS_LINKS) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-60"
                }`}
              />
            </span>
            <MenuChevron open={openDropdown === "operations"} />
          </button>
          {openDropdown === "operations" ? (
            <div className="absolute left-0 top-full z-50 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
              {OPERATIONS_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpenDropdown(null)}
                    className={`block rounded-lg px-3 py-2 text-sm transition ${
                      active ? "border border-slate-200 bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>

        {visibleAdminLinks.length > 0 ? (
          <div className="relative">
            <button
              type="button"
              aria-expanded={openDropdown === "admin"}
              onClick={() => setOpenDropdown((current) => (current === "admin" ? null : "admin"))}
              className={`${desktopLinkClass(
                groupActive(pathname, visibleAdminLinks),
              )} inline-flex cursor-pointer appearance-none items-center gap-1.5 border-0 bg-transparent align-middle hover:!shadow-none focus:outline-none focus-visible:!shadow-none focus-visible:outline-none`}
            >
              <span className="relative inline-block">
                Admin
                <span
                  className={`pointer-events-none absolute inset-x-0 -bottom-2 h-0.5 rounded-full bg-green-500 transition-transform duration-200 ${
                    groupActive(pathname, visibleAdminLinks) ? "scale-x-100" : "scale-x-0 group-hover:scale-x-60"
                  }`}
                />
              </span>
              <MenuChevron open={openDropdown === "admin"} />
            </button>
            {openDropdown === "admin" ? (
              <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {visibleAdminLinks.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpenDropdown(null)}
                      className={`block rounded-lg px-3 py-2 text-sm transition ${
                        active ? "border border-slate-200 bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>
    </>
  );
}
