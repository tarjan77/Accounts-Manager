import { DashboardPage } from "@/components/dashboard-page";
import { ProtectedShell } from "@/components/protected-shell";

export default function DashboardRoute() {
  return (
    <ProtectedShell>
      <DashboardPage />
    </ProtectedShell>
  );
}
