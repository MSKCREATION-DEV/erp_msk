import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-atmosphere flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-10 flex justify-center">
          <Logo variant="intercale" href={null} priority />
        </div>
        {children}
      </div>
      <footer className="pb-8 text-center text-xs text-msk-ink/40">
        Accès réservé aux collaborateurs MSK CREATION
      </footer>
    </div>
  );
}
