type SendResetEmailArgs = {
  to: string;
  code: string;
};

export async function sendResetCodeEmail({ to, code }: SendResetEmailArgs) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !fromEmail) {
    console.error(`[password-reset] missing RESEND_API_KEY or RESEND_FROM_EMAIL; email=${to}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: "Your GreenLine Systems password reset code",
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a">
  <p>Use this code to reset your password:</p>
  <p style="font-size:28px;font-weight:700;letter-spacing:8px;margin:16px 0">${code}</p>
  <p>This code expires in 15 minutes.</p>
</div>`,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Resend failed (${response.status}): ${body}`);
  }
}
