import { InvoicesPage } from "@/components/invoices-page";
import { ProtectedShell } from "@/components/protected-shell";

export default function InvoicesRoute() {
  return (
    <ProtectedShell>
      <InvoicesPage />
    </ProtectedShell>
  );
}
