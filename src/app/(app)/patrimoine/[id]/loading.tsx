export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-64 rounded-lg bg-msk-ink/10" />
      <div className="h-36 rounded-xl bg-msk-ink/5" />
      <div className="h-64 max-w-lg rounded-xl bg-msk-ink/5" />
    </div>
  );
}
