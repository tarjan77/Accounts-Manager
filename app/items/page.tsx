import { ItemsPage } from "@/components/items-page";
import { ProtectedShell } from "@/components/protected-shell";

export default function ItemsRoute() {
  return (
    <ProtectedShell>
      <ItemsPage />
    </ProtectedShell>
  );
}
