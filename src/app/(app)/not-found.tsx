import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h2 className="font-impact text-4xl text-msk-ink">Introuvable</h2>
      <p className="mt-3 text-sm text-msk-ink/60">Cette page n’existe pas.</p>
      <Link prefetch={false}
        href="/accueil"
        className="mt-6 inline-block cursor-pointer text-sm font-medium text-msk-blue hover:underline"
      >
        Retour accueil
      </Link>
    </div>
  );
}
