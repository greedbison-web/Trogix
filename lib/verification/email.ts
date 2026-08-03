import "server-only";
import { OTP } from "./config";

const SUBJECT = "Restaurant Verification Code";

function minutes(): string {
  const m = Math.round(OTP.ttlSeconds / 60);
  return `${m} minute${m === 1 ? "" : "s"}`;
}

export function verificationText(code: string): string {
  return [
    "Restaurant Verification Code",
    "",
    "Your verification code is:",
    "",
    code,
    "",
    `This code expires in ${minutes()}.`,
    "",
    "If you didn't request this, ignore this email.",
    "",
    "— Trogix",
  ].join("\n");
}

/**
 * Table-based layout with inline styles: every mail client from Outlook to
 * Gmail renders it the same way, and none of them honour a stylesheet.
 */
export function verificationHtml(code: string): string {
  const spaced = code.split("").join("&#8202;");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Trogix verification code is ${code}. It expires in ${minutes()}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f1ea;padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#fbf9f5;border:1px solid #e2ddd1;border-radius:16px;">
        <tr>
          <td style="padding:32px 32px 0;">
            <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1;color:#111111;">Trogix</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 0;">
            <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;font-weight:400;color:#111111;">Restaurant Verification Code</h1>
            <p style="margin:14px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#5c5852;">Your verification code is:</p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" style="background:#f4f1ea;border:1px solid #e2ddd1;border-radius:12px;padding:22px 12px;">
                  <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;letter-spacing:8px;font-weight:600;color:#111111;">${spaced}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 0;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#5c5852;">This code expires in ${minutes()}.</p>
            <p style="margin:10px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#8b867d;">If you didn't request this, ignore this email.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 32px;">
            <div style="height:1px;background:#e2ddd1;line-height:1px;font-size:0;">&nbsp;</div>
            <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.6;color:#8b867d;">Trogix never asks for this code by phone, WhatsApp or chat.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function resendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Sends the code through Resend, the only email provider this app uses.
 *
 * Throws on failure so the caller can refuse to advance the resend counter for
 * a code the owner never received.
 */
export async function sendVerificationEmail(
  to: string,
  code: string,
): Promise<string | null> {
  if (!resendConfigured()) {
    throw new Error("Email delivery is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to,
      subject: SUBJECT,
      html: verificationHtml(code),
      text: verificationText(code),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}`);
  }

  const json = (await response.json()) as { id?: string };
  return json.id ?? null;
}
