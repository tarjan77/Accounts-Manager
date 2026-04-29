import { PaymentsPage } from "@/components/payments-page";
import { ProtectedShell } from "@/components/protected-shell";

export default function PaymentsRoute() {
  return (
    <ProtectedShell>
      <PaymentsPage />
    </ProtectedShell>
  );
}
