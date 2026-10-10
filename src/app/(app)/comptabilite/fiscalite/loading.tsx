export default function FiscaliteLoading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-48 rounded-lg bg-msk-ink/10" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-xl bg-msk-ink/5" />
        <div className="h-24 rounded-xl bg-msk-ink/5" />
        <div className="h-24 rounded-xl bg-msk-ink/5" />
      </div>
      <div className="h-32 rounded-xl bg-msk-ink/5" />
      <div className="h-32 rounded-xl bg-msk-ink/5" />
    </div>
  );
}
