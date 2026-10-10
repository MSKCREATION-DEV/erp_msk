export default function EspaceHeuresLoading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-40 rounded-lg bg-msk-ink/10" />
      <div className="h-4 w-72 rounded bg-msk-ink/5" />
      <div className="h-80 max-w-3xl rounded-2xl bg-msk-ink/5" />
      <div className="space-y-3">
        <div className="h-16 rounded-2xl bg-msk-ink/5" />
        <div className="h-16 rounded-2xl bg-msk-ink/5" />
      </div>
    </div>
  );
}
