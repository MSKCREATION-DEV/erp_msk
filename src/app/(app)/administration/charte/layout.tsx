import { CharteNav } from "@/components/admin/charte/charte-nav";

export default function CharteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <CharteNav />
      {children}
    </div>
  );
}
