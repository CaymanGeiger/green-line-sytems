import Link from "next/link";

import { DeleteAccountSection } from "@/components/account/delete-account-section";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { AccordionCard } from "@/components/ui/accordion-card";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function AccountPage() {
  const user = await requireCurrentUser();
  const ownedOrganizationMemberships = await prisma.organizationMembership.findMany({
    where: {
      userId: user.id,
      role: "OWNER",
    },
    orderBy: {
      organization: {
        name: "asc",
      },
    },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          memberships: {
            where: {
              userId: {
                not: user.id,
              },
            },
            orderBy: [{ role: "asc" }, { user: { name: "asc" } }],
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const ownedOrganizations = ownedOrganizationMemberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    candidates: membership.organization.memberships.map((member) => ({
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
    })),
  }));

  return (
    <div className="space-y-6">
      <AccordionCard title="Account" subtitle="Profile and personal security settings." defaultOpen>
        <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <p>
            <span className="font-semibold text-slate-900">Role:</span> {user.role}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Created:</span> {formatDateTime(user.createdAt)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Updated:</span> {formatDateTime(user.updatedAt)}
          </p>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Organization, member invites, and team management moved to{" "}
          <Link className="font-semibold text-green-700 hover:text-green-800" href="/organizations">
            Organizations
          </Link>
          .
        </p>
      </AccordionCard>

      <section className="grid gap-4 xl:grid-cols-2">
        <AccordionCard title="Profile" subtitle="Update your display information and identity details." defaultOpen>
          <ProfileForm initialName={user.name} email={user.email} />
        </AccordionCard>

        <AccordionCard title="Password" subtitle="Manage your sign-in password and account security." defaultOpen>
          <PasswordForm />
        </AccordionCard>
      </section>

      <AccordionCard
        title="Delete Account"
        subtitle="Irreversible account removal with ownership transfer or full data deletion."
        preferenceKey="account-delete"
      >
        <DeleteAccountSection ownedOrganizations={ownedOrganizations} />
      </AccordionCard>
    </div>
  );
}
