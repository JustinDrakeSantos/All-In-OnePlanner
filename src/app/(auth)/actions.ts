"use server";

import { redirect } from "next/navigation";
import { failure, parseForm, success, type FormState } from "@/lib/forms";
import { forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from "@/lib/schemas";
import { getDummyHash, hashPassword, verifyPassword } from "@/server/auth/password";
import { endSession, startSession } from "@/server/auth/session";
import { deleteUserSessions } from "@/server/data/sessions";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  createUser,
  findUserByEmail,
  setPasswordHash,
} from "@/server/data/users";
import { appUrl, sendMail } from "@/server/mail";
import { rateLimit, rateLimitByClient } from "@/server/rate-limit";

const SECRET_FIELDS = ["password", "confirmPassword"];

/** Only same-site relative paths are allowed as post-login destinations. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  return next;
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const limit = await rateLimitByClient("signup", 10, 200, 60 * 60 * 1000);
  if (!limit.ok) return failure("Too many sign-up attempts. Please try again later.");

  const parsed = parseForm(signupSchema, formData, { secret: SECRET_FIELDS });
  if (!parsed.ok) return parsed.state;
  const { name, email, password, timezone } = parsed.data;

  const user = await createUser({ name, email, timezone, passwordHash: await hashPassword(password) });
  if (!user) {
    return failure("Please fix the highlighted fields.", {
      fieldErrors: { email: "An account with this email already exists. Try logging in." },
      values: { name, email },
    });
  }
  await startSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(loginSchema, formData, { secret: ["password"] });
  if (!parsed.ok) return parsed.state;
  const { email, password, next } = parsed.data;

  // Per account (guessing one password) and per client (spraying many accounts).
  const perAccount = rateLimit(`login:${email}`, 10, 15 * 60 * 1000);
  const perIp = await rateLimitByClient("login", 50, 500, 15 * 60 * 1000);
  if (!perAccount.ok || !perIp.ok) {
    return failure(`Too many attempts. Try again in ${Math.ceil(Math.max(perAccount.retryAfterSeconds, perIp.retryAfterSeconds) / 60)} minutes.`, {
      values: { email },
    });
  }

  const user = await findUserByEmail(email);
  // Compare against a dummy hash when the email is unknown so timing doesn't reveal accounts.
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !valid) return failure("Email or password is incorrect.", { values: { email, next: next ?? "" } });

  await startSession(user.id);
  redirect(safeNext(next));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(forgotPasswordSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { email } = parsed.data;

  const perEmail = rateLimit(`reset:${email}`, 3, 15 * 60 * 1000);
  const perClient = await rateLimitByClient("reset", 10, 100, 15 * 60 * 1000);
  if (!perEmail.ok || !perClient.ok) return failure("Too many requests. Please wait a few minutes and try again.");

  const user = await findUserByEmail(email);
  if (user) {
    const base = await appUrl();
    if (base) {
      const token = await createPasswordResetToken(user.id);
      await sendMail({
        to: user.email,
        subject: "Reset your All-In Planner password",
        text: [
          `Hi ${user.name},`,
          "",
          "Someone asked to reset the password for your All-In Planner account.",
          "If that was you, open this link within the next hour:",
          "",
          `${base}/reset-password?token=${encodeURIComponent(token)}`,
          "",
          "If you didn't ask for this, you can ignore this email; your password won't change.",
        ].join("\n"),
      });
    } else {
      console.error("[reset] APP_URL is not set, so a password-reset link could not be built.");
    }
  }

  const devHint =
    process.env.NODE_ENV !== "production" && !process.env.SMTP_URL
      ? " (Development: email isn't configured, so the link is printed in the server console.)"
      : "";
  // Same response whether or not the account exists.
  return success(`If an account exists for ${email}, we've sent a link to reset your password. It expires in one hour.${devHint}`);
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(resetPasswordSchema, formData, { secret: SECRET_FIELDS });
  if (!parsed.ok) return parsed.state;

  const userId = await consumePasswordResetToken(parsed.data.token);
  if (!userId) return failure("This reset link is invalid or has expired. Request a new one.");

  await setPasswordHash(userId, await hashPassword(parsed.data.password));
  await deleteUserSessions(userId);
  await startSession(userId);
  redirect("/dashboard");
}
