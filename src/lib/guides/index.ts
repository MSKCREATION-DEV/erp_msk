import { ALL_GUIDES } from "./content";
import { GUIDE_MODULES, getGuideModule } from "./modules";
import { GUIDE_ROLES, getGuideRole } from "./roles";
import { GUIDE_TASKS, getGuideTask } from "./tasks";
import type { Guide, GuideStatus } from "./types";

export {
  ALL_GUIDES,
  GUIDE_MODULES,
  GUIDE_ROLES,
  GUIDE_TASKS,
  getGuideModule,
  getGuideRole,
  getGuideTask,
};
export type {
  Guide,
  GuideModule,
  GuideRole,
  GuideTask,
  GuideStatus,
  GuideStep,
  GuideTroubleshoot,
  GuideWorkflow,
  GuideVisual,
} from "./types";
export { GUIDE_SHOTS } from "./shots";
export {
  filterGuides,
  featuredGuides,
  normalizeSearch,
  type GuideSearchFilters,
} from "./search";
export { canViewGuide, visibleGuides, publishedForUser } from "./access";

export function getGuide(id: string): Guide | undefined {
  return ALL_GUIDES.find((g) => g.id === id);
}

export function guidesByModule(moduleId: string): Guide[] {
  return ALL_GUIDES.filter((g) => g.moduleId === moduleId);
}

export function guidesByRole(roleId: string): Guide[] {
  return ALL_GUIDES.filter((g) => g.roleIds.includes(roleId));
}

export function guidesByTask(taskId: string): Guide[] {
  return ALL_GUIDES.filter((g) => g.taskIds.includes(taskId));
}

export function relatedGuides(guide: Guide): Guide[] {
  return guide.relatedGuideIds
    .map((id) => getGuide(id))
    .filter((g): g is Guide => Boolean(g));
}

export function guideStatusLabel(status: GuideStatus): string {
  switch (status) {
    case "draft":
      return "Brouillon";
    case "to_validate":
      return "À valider";
    case "validated":
      return "Validé";
    case "outdated":
      return "À mettre à jour";
    default:
      return status;
  }
}

export function guideStatusTone(
  status: GuideStatus,
): "muted" | "coral" | "success" | "ink" {
  switch (status) {
    case "draft":
      return "muted";
    case "to_validate":
      return "coral";
    case "validated":
      return "success";
    case "outdated":
      return "ink";
    default:
      return "muted";
  }
}

/** Intégrité catalogue — utilisé par les tests. */
export function assertGuideCatalogIntegrity(guides: Guide[] = ALL_GUIDES): {
  ok: true;
} {
  const ids = new Set<string>();
  const moduleIds = new Set(GUIDE_MODULES.map((m) => m.id));
  const roleIds = new Set(GUIDE_ROLES.map((r) => r.id));
  const taskIds = new Set(GUIDE_TASKS.map((t) => t.id));

  for (const g of guides) {
    if (ids.has(g.id)) {
      throw new Error(`Guide id dupliqué: ${g.id}`);
    }
    ids.add(g.id);
    if (!moduleIds.has(g.moduleId)) {
      throw new Error(`Guide ${g.id}: module inconnu ${g.moduleId}`);
    }
    for (const r of g.roleIds) {
      if (!roleIds.has(r)) {
        throw new Error(`Guide ${g.id}: rôle inconnu ${r}`);
      }
    }
    for (const t of g.taskIds) {
      if (!taskIds.has(t)) {
        throw new Error(`Guide ${g.id}: tâche inconnue ${t}`);
      }
    }
    for (const rel of g.relatedGuideIds) {
      if (!guides.some((x) => x.id === rel)) {
        throw new Error(`Guide ${g.id}: related manquant ${rel}`);
      }
    }
  }
  return { ok: true };
}
