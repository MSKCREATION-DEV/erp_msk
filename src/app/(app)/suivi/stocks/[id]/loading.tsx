export default function Loading() {
  return (
    <div className="space-y-4 p-1" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-72 animate-pulse rounded-lg bg-msk-ink/6" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 animate-pulse rounded-xl bg-msk-ink/5" />
        <div className="h-24 animate-pulse rounded-xl bg-msk-ink/5 sm:col-span-2" />
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-msk-ink/5" />
    </div>
  );
}
