import type { Metadata } from "next";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { ThemePicker } from "@/components/theme";
import { buttonClasses } from "@/components/ui/button";
import { PageBody, PageHeader, PageSkeleton } from "@/components/ui/misc";
import { requireUser } from "@/server/auth/current-user";
import {
  ChangePasswordForm,
  DeleteAccountForm,
  LegacyImport,
  NotificationSettings,
  ProfileForm,
} from "./settings-forms";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Suspense fallback={<PageSkeleton layout="single" />}>
        <Settings />
      </Suspense>
    </>
  );
}

/** A settings group: heading and explanation on the left, controls on the right (stacked on phones). */
function SettingsSection({
  title,
  description,
  children,
  danger = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <section className="grid gap-4 py-8 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10">
      <div>
        <h2 className={danger ? "font-semibold text-danger" : "font-semibold"}>{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

async function Settings() {
  const user = await requireUser();
  const zones = Intl.supportedValuesOf("timeZone");
  const timeZones = zones.includes(user.timezone) ? zones : [user.timezone, ...zones];

  return (
    <PageBody className="max-w-5xl divide-y divide-line pt-2">
      <SettingsSection title="Appearance" description="Saved on this device.">
        <ThemePicker />
      </SettingsSection>

      <SettingsSection title="Profile & preferences" description="Your time zone decides when “today” starts.">
        <ProfileForm profile={user} timeZones={timeZones} />
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Event and check-in reminders appear in the app while it's open. Allow notifications to get them from your system too."
      >
        <NotificationSettings />
      </SettingsSection>

      <SettingsSection title="Password" description="Changing it signs you out on your other devices.">
        <ChangePasswordForm />
      </SettingsSection>

      <SettingsSection title="Your data" description="Everything you've entered: tasks, events, journal, mood, and fitness, as a JSON file.">
        <a href="/api/export" download className={buttonClasses({ variant: "outline" })}>
          <Download className="size-4" aria-hidden /> Download my data
        </a>
      </SettingsSection>

      <SettingsSection
        title="Import from the original planner"
        description="Bring over calendar events saved by the earlier version of All-In Planner. Events already on your calendar are skipped."
      >
        <LegacyImport />
      </SettingsSection>

      <SettingsSection
        title="Delete account"
        description="Permanently deletes your account and everything in it. This can't be undone, so download your data first if you want a copy."
        danger
      >
        <DeleteAccountForm />
      </SettingsSection>
    </PageBody>
  );
}
