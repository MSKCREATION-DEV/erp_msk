export default function EtatsLoading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-48 rounded-lg bg-msk-ink/10" />
      <div className="h-11 w-48 rounded-lg bg-msk-ink/5" />
      <div className="h-64 rounded-xl bg-msk-ink/5" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 rounded-xl bg-msk-ink/5" />
        <div className="h-80 rounded-xl bg-msk-ink/5" />
      </div>
    </div>
  );
}
