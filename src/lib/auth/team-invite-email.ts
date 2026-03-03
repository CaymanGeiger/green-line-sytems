import { env } from "@/lib/env";

type SendTeamInviteEmailArgs = {
  to: string;
  teamName: string;
  invitedByName: string;
  acceptUrl: string;
};

type SendOrganizationInviteEmailArgs = {
  to: string;
  organizationName: string;
  invitedByName: string;
  acceptUrl: string;
};

type SendTeamMembershipAddedEmailArgs = {
  to: string;
  teamName: string;
  addedByName: string;
  appUrl: string;
};

type SendOrganizationMembershipAddedEmailArgs = {
  to: string;
  organizationName: string;
  addedByName: string;
  appUrl: string;
};

type SendEmployeeAccessVerificationEmailArgs = {
  to: string;
  invitedByName: string;
  verifyUrl: string;
  organizationNames: string[];
};

function getEmailConfig() {
  const resendApiKey = env.RESEND_API_KEY;
  const fromEmail = env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
  }

  return {
    resendApiKey,
    fromEmail,
  };
}

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

const MAX_SEND_ATTEMPTS = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendEmail(payload: { to: string; subject: string; html: string; text: string }) {
  const { resendApiKey, fromEmail } = getEmailConfig();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      const parsedBody = (await response.json().catch(() => ({}))) as ResendResponse;

      if (!response.ok) {
        const providerMessage = parsedBody?.message || parsedBody?.name || "Unknown provider error";
        const error = new Error(`Resend failed (${response.status}): ${providerMessage}`);
        if (response.status >= 500 && attempt < MAX_SEND_ATTEMPTS) {
          await sleep(150 * attempt);
          continue;
        }
        throw error;
      }

      if (!parsedBody?.id) {
        if (attempt < MAX_SEND_ATTEMPTS) {
          await sleep(150 * attempt);
          continue;
        }
        throw new Error("Resend accepted request without a delivery id.");
      }

      return parsedBody.id;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown email send error");
      if (attempt < MAX_SEND_ATTEMPTS) {
        await sleep(150 * attempt);
        continue;
      }
    }
  }

  throw lastError ?? new Error("Unable to send email via Resend.");
}

export async function sendTeamInviteEmail({
  to,
  teamName,
  invitedByName,
  acceptUrl,
}: SendTeamInviteEmailArgs) {
  await sendEmail({
    to,
    subject: `You're invited to ${teamName} on GreenLine Systems`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
  <p>${invitedByName} invited you to join the <strong>${teamName}</strong> team.</p>
  <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#2563eb;color:white;text-decoration:none;font-weight:600">Create account and accept invite</a></p>
  <p style="font-size:12px;color:#475569">This invitation expires in 72 hours. If the button does not work, open this link:<br/>${acceptUrl}</p>
</div>`,
    text: `${invitedByName} invited you to join ${teamName}.\n\nCreate account and accept invite: ${acceptUrl}\n\nThis invitation expires in 72 hours.`,
  });
}

export async function sendOrganizationInviteEmail({
  to,
  organizationName,
  invitedByName,
  acceptUrl,
}: SendOrganizationInviteEmailArgs) {
  await sendEmail({
    to,
    subject: `You're invited to ${organizationName} on GreenLine Systems`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
  <p>${invitedByName} invited you to join the <strong>${organizationName}</strong> organization.</p>
  <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#2563eb;color:white;text-decoration:none;font-weight:600">Create account and accept invite</a></p>
  <p style="font-size:12px;color:#475569">This invitation expires in 72 hours. If the button does not work, open this link:<br/>${acceptUrl}</p>
</div>`,
    text: `${invitedByName} invited you to join ${organizationName}.\n\nCreate account and accept invite: ${acceptUrl}\n\nThis invitation expires in 72 hours.`,
  });
}

export async function sendTeamMembershipAddedEmail({
  to,
  teamName,
  addedByName,
  appUrl,
}: SendTeamMembershipAddedEmailArgs) {
  await sendEmail({
    to,
    subject: `You've been added to ${teamName} on GreenLine Systems`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
  <p>${addedByName} added you to the <strong>${teamName}</strong> team.</p>
  <p><a href="${appUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#2563eb;color:white;text-decoration:none;font-weight:600">Open GreenLine Systems</a></p>
</div>`,
    text: `${addedByName} added you to ${teamName}.\n\nOpen GreenLine Systems: ${appUrl}`,
  });
}

export async function sendOrganizationMembershipAddedEmail({
  to,
  organizationName,
  addedByName,
  appUrl,
}: SendOrganizationMembershipAddedEmailArgs) {
  await sendEmail({
    to,
    subject: `You've been added to ${organizationName} on GreenLine Systems`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
  <p>${addedByName} added you to the <strong>${organizationName}</strong> organization.</p>
  <p><a href="${appUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#2563eb;color:white;text-decoration:none;font-weight:600">Open GreenLine Systems</a></p>
</div>`,
    text: `${addedByName} added you to ${organizationName}.\n\nOpen GreenLine Systems: ${appUrl}`,
  });
}

export async function sendEmployeeAccessVerificationEmail({
  to,
  invitedByName,
  verifyUrl,
  organizationNames,
}: SendEmployeeAccessVerificationEmailArgs) {
  const orgSummary =
    organizationNames.length === 1
      ? organizationNames[0]
      : `${organizationNames[0]} + ${organizationNames.length - 1} more`;

  return sendEmail({
    to,
    subject: `Verify access to GreenLine Systems`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
  <p>${invitedByName} prepared your workspace access for <strong>${orgSummary}</strong>.</p>
  <p><a href="${verifyUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#2563eb;color:white;text-decoration:none;font-weight:600">Verify and join workspace</a></p>
  <p style="font-size:12px;color:#475569">This verification link expires in 72 hours. If the button does not work, open this link:<br/>${verifyUrl}</p>
</div>`,
    text: `${invitedByName} prepared your workspace access for ${orgSummary}.\n\nVerify and join workspace: ${verifyUrl}\n\nThis verification link expires in 72 hours.`,
  });
}
