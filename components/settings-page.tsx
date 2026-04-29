"use client";

import { GmailConnectionCard } from "@/components/gmail-connection";
import { LogoUploader } from "@/components/logo-uploader";
import { PageHeader } from "@/components/page-header";

export function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" />

      <section className="grid max-w-3xl gap-4">
        <GmailConnectionCard />
        <LogoUploader />
      </section>
    </>
  );
}
