import { SignOutButton } from "@/components/signout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserMenuAccountLink } from "@/components/user-menu-account-link";
import { UserMenuEscapeClose } from "@/components/user-menu-escape-close";
import { UserMenuEmployeeAccessButton } from "@/components/user-menu-employee-access-button";
import { UserMenuGetStartedButton } from "@/components/user-menu-get-started-button";

type UserMenuProps = {
  user: {
    name: string;
    email: string;
    role: string;
  };
  activeOrganizationName?: string | null;
  showEmployeeAccessAction?: boolean;
};

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return parts.join("") || "U";
}

export function UserMenu({ user, activeOrganizationName, showEmployeeAccessAction = false }: UserMenuProps) {
  const initials = initialsFromName(user.name);
  const detailsId = "user-menu-dropdown";

  return (
    <details id={detailsId} className="group relative">
      <UserMenuEscapeClose detailsId={detailsId} />
      <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-300 bg-white/95 px-2.5 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 focus:outline-none focus-visible:outline-none">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-green-100 text-[11px] font-bold text-green-800">
          {initials}
        </span>
        <span className="inline max-w-[180px] truncate">{user.name}</span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5 text-slate-500 transition-transform duration-200 group-open:rotate-180"
        >
          <path d="M7 10l5 5 5-5z" fill="currentColor" />
        </svg>
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-[min(92vw,300px)] rounded-lg border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{user.role}</p>
          {activeOrganizationName ? (
            <p className="mt-1 truncate text-[11px] uppercase tracking-wide text-slate-500">
              Organization · {activeOrganizationName}
            </p>
          ) : null}
        </div>

        <UserMenuAccountLink
          href="/account"
          className="mt-2 block rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Account
        </UserMenuAccountLink>
        <ThemeToggle variant="menu-switch" />
        {showEmployeeAccessAction ? (
          <UserMenuEmployeeAccessButton className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            Use employee access link
          </UserMenuEmployeeAccessButton>
        ) : null}
        <UserMenuGetStartedButton className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          Get started
        </UserMenuGetStartedButton>

        <div className="mt-2">
          <SignOutButton
            className="inline-flex h-10 w-full items-center justify-center px-3 text-sm font-semibold"
            label="Sign Out"
            variant="secondary"
          />
        </div>
      </div>
    </details>
  );
}
