export default function EcritureDetailLoading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-56 rounded-lg bg-msk-ink/10" />
      <div className="h-6 w-40 rounded bg-msk-ink/5" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-40 rounded-xl bg-msk-ink/5 @lg:col-span-1" />
        <div className="h-40 rounded-xl bg-msk-ink/5 @lg:col-span-2" />
      </div>
    </div>
  );
}
