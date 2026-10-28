export default function RhAbsencesLoading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-40 rounded-lg bg-msk-ink/10" />
      <div className="h-4 w-72 max-w-full rounded bg-msk-ink/5" />
      <div className="flex gap-2">
        <div className="h-8 w-24 rounded-lg bg-msk-ink/5" />
        <div className="h-8 w-24 rounded-lg bg-msk-ink/5" />
        <div className="h-8 w-24 rounded-lg bg-msk-ink/5" />
      </div>
      <div className="space-y-3">
        <div className="h-28 rounded-2xl bg-msk-ink/5" />
        <div className="h-28 rounded-2xl bg-msk-ink/5" />
      </div>
    </div>
  );
}
