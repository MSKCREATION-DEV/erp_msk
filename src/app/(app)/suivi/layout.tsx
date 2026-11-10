import { SuiviShell } from "@/components/suivi/suivi-shell";

export default function SuiviLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SuiviShell>{children}</SuiviShell>;
}
