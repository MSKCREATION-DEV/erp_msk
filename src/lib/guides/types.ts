import { z } from "zod";

/** Statut éditorial — jamais « validated » sans vérification des étapes clés. */
export const guideStatusSchema = z.enum([
  "draft",
  "to_validate",
  "validated",
  "outdated",
]);
export type GuideStatus = z.infer<typeof guideStatusSchema>;

/** Zone visuelle dans un schéma d’écran annoté. */
export const guideCalloutZoneSchema = z.enum([
  "sidebar",
  "header",
  "main",
  "cta",
  "table",
  "form",
  "toolbar",
]);

export const guideVisualSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["screenshot", "schematic"]),
  /** Chemin public, ex. `/guides/shots/commercial-hub.png`. */
  src: z.string().optional(),
  alt: z.string().min(1),
  caption: z.string().optional(),
  /** Titre affiché dans le chrome du schéma. */
  chromeTitle: z.string().optional(),
  /** Entrée sidebar mise en avant. */
  highlightNav: z.string().optional(),
  callouts: z
    .array(
      z.object({
        n: z.number().int().positive(),
        label: z.string().min(1),
        zone: guideCalloutZoneSchema,
      }),
    )
    .default([]),
});
export type GuideVisual = z.infer<typeof guideVisualSchema>;

export const guideStepSchema = z.object({
  title: z.string().min(1),
  instruction: z.string().min(1),
  /** Chemin UI confirmé, ex. « Commercial → Prospects → Nouveau ». */
  navPath: z.string().optional(),
  /** Route réelle si connue. */
  href: z.string().optional(),
  /** Champ / bouton concerné (libellé exact UI si confirmé). */
  uiTarget: z.string().optional(),
  caution: z.string().optional(),
  expected: z.string().optional(),
  /** Référence `visuals[].id` pour l’illustration de l’étape. */
  visualId: z.string().optional(),
});
export type GuideStep = z.infer<typeof guideStepSchema>;

export const guideTroubleshootSchema = z.object({
  problem: z.string().min(1),
  cause: z.string().min(1),
  check: z.string().optional(),
  solution: z.string().min(1),
  escalate: z.string().optional(),
});
export type GuideTroubleshoot = z.infer<typeof guideTroubleshootSchema>;

export const guideWorkflowNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["start", "action", "decision", "end"]).default("action"),
});

export const guideWorkflowEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().optional(),
});

export const guideWorkflowSchema = z.object({
  title: z.string().optional(),
  nodes: z.array(guideWorkflowNodeSchema).min(2),
  edges: z.array(guideWorkflowEdgeSchema).min(1),
});
export type GuideWorkflow = z.infer<typeof guideWorkflowSchema>;

export const guideSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "id kebab-case"),
  title: z.string().min(1),
  summary: z.string().min(1),
  moduleId: z.string().min(1),
  /** Catégories libres (ex. prise-en-main, procedure, faq). */
  categories: z.array(z.string()).default([]),
  taskIds: z.array(z.string()).default([]),
  /** Codes packs / groupes (`commercial`, `direction`, …) — libellés via rbac/labels. */
  roleIds: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  relatedGuideIds: z.array(z.string()).default([]),
  status: guideStatusSchema,
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  difficulty: z.enum(["debutant", "intermediaire", "avance"]).optional(),
  /**
   * Permission minimale pour **voir** le guide dans le centre.
   * Absent = visible dès `home.view` (centre guides).
   * Ne remplace pas le contrôle métier sur l’action.
   */
  viewPermission: z.string().optional(),
  objective: z.string().min(1),
  steps: z.array(guideStepSchema).default([]),
  /** Illustrations (captures réelles et/ou schémas annotés). */
  visuals: z.array(guideVisualSchema).default([]),
  /** Visual hero en tête de lecture. */
  heroVisualId: z.string().optional(),
  expectedResult: z.string().optional(),
  workflow: guideWorkflowSchema.optional(),
  troubleshooting: z.array(guideTroubleshootSchema).default([]),
  bestPractices: z.array(z.string()).default([]),
  /** Source éditoriale (manuel MD, phase…). */
  sources: z.array(z.string()).default([]),
});
/** Guide après parse (defaults appliqués). */
export type Guide = z.infer<typeof guideSchema>;
/** Contenu source avant parse — champs à défaut omis OK. */
export type GuideInput = z.input<typeof guideSchema>;

export const guideModuleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  objective: z.string().min(1),
  href: z.string().optional(),
  /** Permission typique d’accès module (nav). */
  accessPermission: z.string().optional(),
  roleIds: z.array(z.string()).default([]),
  relatedModuleIds: z.array(z.string()).default([]),
  /** true = pas encore de procédures détaillées validées. */
  stub: z.boolean().default(false),
  manualPath: z.string().optional(),
});
export type GuideModule = z.infer<typeof guideModuleSchema>;

export const guideRoleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["pack", "group", "special"]),
  mission: z.string().min(1),
  moduleIds: z.array(z.string()).default([]),
  limits: z.array(z.string()).default([]),
});
export type GuideRole = z.infer<typeof guideRoleSchema>;

export const guideTaskSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  verb: z.string().min(1),
  description: z.string().min(1),
});
export type GuideTask = z.infer<typeof guideTaskSchema>;
