import { SettingsPage } from "@/components/settings-page";
import { ProtectedShell } from "@/components/protected-shell";

export default function SettingsRoute() {
  return (
    <ProtectedShell>
      <SettingsPage />
    </ProtectedShell>
  );
}
