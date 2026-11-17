"use server";

import { failure, parseForm, success, type FormState } from "@/lib/forms";
import { contactSchema } from "@/lib/schemas";
import { saveContactMessage } from "@/server/data/users";
import { rateLimitByClient } from "@/server/rate-limit";

export async function contactAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(contactSchema, formData);
  if (!parsed.ok) return parsed.state;
  const { website, ...message } = parsed.data;

  // Bots fill the hidden field; pretend it worked and drop the message.
  if (website) return success("Thanks! Your message has been sent.");

  const limit = await rateLimitByClient("contact", 5, 100, 60 * 60 * 1000);
  if (!limit.ok) return failure("You've sent several messages recently. Please try again later.", { values: message });

  await saveContactMessage(message);
  return success("Thanks! Your message has been sent. We'll get back to you by email.");
}
