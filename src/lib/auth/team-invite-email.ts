type SendTeamInviteEmailArgs = {
  to: string;
  teamName: string;
  invitedByName: string;
  acceptUrl: string;
};

type SendTeamMembershipAddedEmailArgs = {
  to: string;
  teamName: string;
  addedByName: string;
  appUrl: string;
};

function getEmailConfig() {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    throw new Error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
  }

  return {
    resendApiKey,
    fromEmail,
  };
}

async function sendEmail(payload: { to: string; subject: string; html: string; text: string }) {
  const { resendApiKey, fromEmail } = getEmailConfig();
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

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend failed (${response.status}): ${body}`);
  }
}

export async function sendTeamInviteEmail({
  to,
  teamName,
  invitedByName,
  acceptUrl,
}: SendTeamInviteEmailArgs) {
  await sendEmail({
    to,
    subject: `You're invited to ${teamName} on DevOps Incident Command Center`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
  <p>${invitedByName} invited you to join the <strong>${teamName}</strong> team.</p>
  <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#2563eb;color:white;text-decoration:none;font-weight:600">Create account and accept invite</a></p>
  <p style="font-size:12px;color:#475569">This invitation expires in 72 hours. If the button does not work, open this link:<br/>${acceptUrl}</p>
</div>`,
    text: `${invitedByName} invited you to join ${teamName}.\n\nCreate account and accept invite: ${acceptUrl}\n\nThis invitation expires in 72 hours.`,
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
    subject: `You've been added to ${teamName} on DevOps Incident Command Center`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
  <p>${addedByName} added you to the <strong>${teamName}</strong> team.</p>
  <p><a href="${appUrl}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#2563eb;color:white;text-decoration:none;font-weight:600">Open Incident Command Center</a></p>
</div>`,
    text: `${addedByName} added you to ${teamName}.\n\nOpen Incident Command Center: ${appUrl}`,
  });
}
