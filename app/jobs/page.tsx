import { JobsPage } from "@/components/jobs-page";
import { ProtectedShell } from "@/components/protected-shell";

export default function JobsRoute() {
  return (
    <ProtectedShell>
      <JobsPage />
    </ProtectedShell>
  );
}
