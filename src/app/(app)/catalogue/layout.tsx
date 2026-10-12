import { CommercialShell } from "@/components/commercial/commercial-shell";

export default function CatalogueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommercialShell>{children}</CommercialShell>;
}
