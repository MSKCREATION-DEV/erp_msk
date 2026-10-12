import { CommercialShell } from "@/components/commercial/commercial-shell";

export default function CommercialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CommercialShell>{children}</CommercialShell>;
}
