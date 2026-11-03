export default function EspaceProfilLoading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-40 rounded-lg bg-msk-ink/10" />
      <div className="h-4 w-64 max-w-full rounded bg-msk-ink/5" />
      <div className="h-28 rounded-2xl bg-msk-ink/5" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-64 rounded-2xl bg-msk-ink/5" />
        <div className="h-64 rounded-2xl bg-msk-ink/5" />
        <div className="h-48 rounded-2xl bg-msk-ink/5" />
        <div className="h-48 rounded-2xl bg-msk-ink/5" />
      </div>
    </div>
  );
}
