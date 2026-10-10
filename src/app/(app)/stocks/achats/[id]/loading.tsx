export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-64 rounded-lg bg-msk-ink/10" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-40 rounded-xl bg-msk-ink/5" />
        <div className="h-40 rounded-xl bg-msk-ink/5" />
      </div>
      <div className="h-56 rounded-xl bg-msk-ink/5" />
    </div>
  );
}
