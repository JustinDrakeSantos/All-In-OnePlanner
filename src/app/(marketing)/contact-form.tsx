"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError, fieldValue, formKey } from "@/components/ui/form-bits";
import { initialFormState } from "@/lib/forms";
import { contactAction } from "./actions";

export function ContactForm() {
  const [state, action] = useActionState(contactAction, initialFormState);
  return (
    <form key={formKey(state)} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="contact-name" label="Name" error={fieldError(state, "name")}>
          {(a) => <Input {...a} name="name" autoComplete="name" defaultValue={fieldValue(state, "name")} />}
        </Field>
        <Field id="contact-email" label="Email" error={fieldError(state, "email")}>
          {(a) => <Input {...a} name="email" type="email" autoComplete="email" defaultValue={fieldValue(state, "email")} />}
        </Field>
      </div>
      <Field id="contact-subject" label="Subject" error={fieldError(state, "subject")}>
        {(a) => <Input {...a} name="subject" defaultValue={fieldValue(state, "subject")} />}
      </Field>
      <Field id="contact-message" label="Message" error={fieldError(state, "message")}>
        {(a) => <Textarea {...a} name="message" rows={5} defaultValue={fieldValue(state, "message")} />}
      </Field>
      {/* Honeypot for bots; hidden from people and assistive technology. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <SubmitButton variant="secondary" pendingLabel="Sending…">Send message</SubmitButton>
    </form>
  );
}
