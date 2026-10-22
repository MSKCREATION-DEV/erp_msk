import Link from "next/link";
import { GUIDE_MODULES, GUIDE_ROLES, GUIDE_TASKS } from "@/lib/guides";

export function GuideFilters({
  basePath = "/guides",
  q,
  moduleId,
  roleId,
  taskId,
}: {
  basePath?: string;
  q?: string;
  moduleId?: string;
  roleId?: string;
  taskId?: string;
}) {
  const hasFilters = Boolean(moduleId || roleId || taskId || q);

  return (
    <form
      method="get"
      action={basePath}
      className="flex w-full flex-col gap-3 rounded-2xl border border-msk-ink/6 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {q ? <input type="hidden" name="q" value={q} /> : null}
      <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs font-medium text-msk-ink/50">
        Module
        <select
          name="module"
          defaultValue={moduleId ?? ""}
          className="h-10 rounded-lg border border-msk-ink/12 bg-white px-3 text-sm text-msk-ink outline-none focus:border-msk-blue"
        >
          <option value="">Tous</option>
          {GUIDE_MODULES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs font-medium text-msk-ink/50">
        Rôle
        <select
          name="role"
          defaultValue={roleId ?? ""}
          className="h-10 rounded-lg border border-msk-ink/12 bg-white px-3 text-sm text-msk-ink outline-none focus:border-msk-blue"
        >
          <option value="">Tous</option>
          {GUIDE_ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-40 flex-1 flex-col gap-1.5 text-xs font-medium text-msk-ink/50">
        Tâche
        <select
          name="task"
          defaultValue={taskId ?? ""}
          className="h-10 rounded-lg border border-msk-ink/12 bg-white px-3 text-sm text-msk-ink outline-none focus:border-msk-blue"
        >
          <option value="">Toutes</option>
          {GUIDE_TASKS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-msk-blue px-4 text-sm font-medium text-white hover:bg-msk-blue/90"
        >
          Filtrer
        </button>
        {hasFilters ? (
          <Link
            prefetch={false}
            href={basePath}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-msk-ink/15 bg-white px-4 text-sm font-medium text-msk-ink hover:bg-msk-chalk"
          >
            Effacer
          </Link>
        ) : null}
      </div>
    </form>
  );
}
