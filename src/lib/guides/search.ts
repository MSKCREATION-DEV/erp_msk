import type { Guide } from "./types";

/** Normalise pour recherche FR (casse + accents). */
export function normalizeSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function haystack(guide: Guide): string {
  const parts = [
    guide.id,
    guide.title,
    guide.summary,
    guide.objective,
    guide.moduleId,
    ...guide.categories,
    ...guide.taskIds,
    ...guide.roleIds,
    ...guide.keywords,
    ...guide.prerequisites,
    ...guide.steps.map((s) =>
      [s.title, s.instruction, s.navPath, s.uiTarget, s.caution, s.expected]
        .filter(Boolean)
        .join(" "),
    ),
    ...guide.troubleshooting.map((t) =>
      [t.problem, t.cause, t.check, t.solution, t.escalate]
        .filter(Boolean)
        .join(" "),
    ),
    ...(guide.bestPractices ?? []),
    guide.expectedResult ?? "",
  ];
  return normalizeSearch(parts.join("\n"));
}

export type GuideSearchFilters = {
  q?: string;
  moduleId?: string;
  roleId?: string;
  taskId?: string;
  category?: string;
  status?: Guide["status"];
};

export function filterGuides(
  guides: Guide[],
  filters: GuideSearchFilters,
): Guide[] {
  const q = filters.q ? normalizeSearch(filters.q) : "";
  const tokens = q ? q.split(/\s+/).filter(Boolean) : [];

  return guides.filter((g) => {
    if (filters.moduleId && g.moduleId !== filters.moduleId) return false;
    if (filters.roleId && !g.roleIds.includes(filters.roleId)) return false;
    if (filters.taskId && !g.taskIds.includes(filters.taskId)) return false;
    if (filters.category && !g.categories.includes(filters.category))
      return false;
    if (filters.status && g.status !== filters.status) return false;
    if (tokens.length === 0) return true;
    const text = haystack(g);
    return tokens.every((t) => text.includes(t));
  });
}

/** Guides « importants » pour l’accueil — validés, prise-en-main ou FAQ. */
export function featuredGuides(guides: Guide[], limit = 6): Guide[] {
  const preferred = guides.filter(
    (g) =>
      g.status === "validated" &&
      (g.categories.includes("prise-en-main") ||
        g.categories.includes("faq") ||
        g.categories.includes("procedure")),
  );
  return preferred.slice(0, limit);
}
