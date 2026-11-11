export default function Loading() {
  return (
    <div className="space-y-4 p-1" aria-busy="true" aria-label="Chargement">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-msk-ink/6" />
      <div className="h-4 w-72 animate-pulse rounded bg-msk-ink/5" />
      <div className="h-64 animate-pulse rounded-xl bg-msk-ink/5" />
    </div>
  );
}
