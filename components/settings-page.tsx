"use client";

import { LogoUploader } from "@/components/logo-uploader";
import { PageHeader } from "@/components/page-header";

export function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" />

      <section className="max-w-3xl">
        <LogoUploader />
      </section>
    </>
  );
}
