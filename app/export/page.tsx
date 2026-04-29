import { ExportPage } from "@/components/export-page";
import { ProtectedShell } from "@/components/protected-shell";

export default function ExportRoute() {
  return (
    <ProtectedShell>
      <ExportPage />
    </ProtectedShell>
  );
}
