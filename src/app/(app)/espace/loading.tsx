export default function EspaceLoading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-48 rounded-lg bg-msk-ink/10" />
      <div className="h-4 w-72 rounded bg-msk-ink/5" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-28 rounded-2xl bg-msk-ink/5" />
        <div className="h-28 rounded-2xl bg-msk-ink/5" />
        <div className="h-28 rounded-2xl bg-msk-ink/5" />
      </div>
      <div className="h-20 rounded-2xl bg-msk-ink/5" />
    </div>
  );
}
