import { CommercialShell } from "@/components/commercial/commercial-shell";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <CommercialShell>{children}</CommercialShell>;
}
