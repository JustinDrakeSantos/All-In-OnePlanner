import "server-only";
import { headers } from "next/headers";
import nodemailer from "nodemailer";

interface Mail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends through SMTP_URL when configured. In development without SMTP the
 * message is printed to the server console so the flow can still be tested.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const url = process.env.SMTP_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[mail] To: ${mail.to}\n[mail] Subject: ${mail.subject}\n${mail.text}\n`);
    } else {
      console.warn("[mail] SMTP_URL is not set; an email was not sent.");
    }
    return;
  }
  const transport = nodemailer.createTransport(url);
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? "All-In Planner <no-reply@localhost>",
    ...mail,
  });
}

/**
 * Base URL for links in emails. Production needs a configured URL (APP_URL, or
 * the one Render sets for the service) so a forged Host header can't redirect
 * password-reset links to another site.
 */
export async function appUrl(): Promise<string | null> {
  const configured = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return null;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  return `http://${host}`;
}
