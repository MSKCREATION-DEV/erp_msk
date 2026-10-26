export default function ComptabiliteLoading() {
  return (
    <div className="min-w-0 animate-pulse space-y-4 p-6">
      <div className="h-8 w-48 rounded-lg bg-msk-ink/10" />
      <div className="h-4 w-72 rounded bg-msk-ink/5" />
      <div className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16.5rem),1fr))]">
        <div className="h-24 rounded-xl bg-msk-ink/5" />
        <div className="h-24 rounded-xl bg-msk-ink/5" />
        <div className="h-24 rounded-xl bg-msk-ink/5" />
        <div className="h-24 rounded-xl bg-msk-ink/5" />
      </div>
      <div className="grid min-w-0 gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,16.5rem),1fr))]">
        <div className="h-28 rounded-xl bg-msk-ink/5" />
        <div className="h-28 rounded-xl bg-msk-ink/5" />
        <div className="h-28 rounded-xl bg-msk-ink/5" />
        <div className="h-28 rounded-xl bg-msk-ink/5" />
      </div>
    </div>
  );
}
