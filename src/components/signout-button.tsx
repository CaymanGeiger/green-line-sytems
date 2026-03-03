import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { deleteSessionByToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { ACTIVE_TEAM_COOKIE_NAME } from "@/lib/auth/active-team";
import { Button } from "@/components/ui/button";

async function signOutAction() {
  "use server";

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  try {
    await deleteSessionByToken(token);
  } catch (error) {
    console.error("Sign out action error", error);
  } finally {
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
    cookieStore.set({
      name: ACTIVE_TEAM_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
  }

  redirect("/signin");
}

type SignOutButtonProps = {
  className?: string;
  label?: string;
  variant?: "primary" | "secondary" | "danger";
};

export function SignOutButton({
  className,
  label = "Sign Out",
  variant = "secondary",
}: SignOutButtonProps = {}) {
  return (
    <form action={signOutAction}>
      <Button type="submit" variant={variant} className={className}>
        {label}
      </Button>
    </form>
  );
}
