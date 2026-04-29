import { ProtectedShell } from "@/components/protected-shell";
import { QuotesPage } from "@/components/quotes-page";

export default function QuotesRoute() {
  return (
    <ProtectedShell>
      <QuotesPage />
    </ProtectedShell>
  );
}
