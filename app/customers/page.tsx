import { CustomersPage } from "@/components/customers-page";
import { ProtectedShell } from "@/components/protected-shell";

export default function CustomersRoute() {
  return (
    <ProtectedShell>
      <CustomersPage />
    </ProtectedShell>
  );
}
