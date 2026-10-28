export default function RhCollaborateurDetailLoading() {
  return (
    <div className="animate-pulse space-y-4 p-6">
      <div className="h-8 w-64 rounded-lg bg-msk-ink/10" />
      <div className="h-4 w-80 rounded bg-msk-ink/5" />
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded-md bg-msk-ink/5" />
        <div className="h-6 w-24 rounded-md bg-msk-ink/5" />
        <div className="h-6 w-28 rounded-md bg-msk-ink/5" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-48 rounded-2xl bg-msk-ink/5 @lg:col-span-1" />
        <div className="h-48 rounded-2xl bg-msk-ink/5 @lg:col-span-2" />
      </div>
    </div>
  );
}
