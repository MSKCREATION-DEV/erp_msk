import { guideSchema, type Guide, type GuideInput } from "../types";
import { commercialGuides } from "./commercial";
import { demarrageGuides } from "./demarrage";
import { espaceGuides } from "./espace";
import { faqGuides } from "./faq";
import { gedGuides } from "./ged";
import { iamGuides } from "./iam";

const raw: GuideInput[] = [
  ...demarrageGuides,
  ...iamGuides,
  ...gedGuides,
  ...commercialGuides,
  ...espaceGuides,
  ...faqGuides,
];

/** Tous les guides — parse Zod au chargement module (fail-fast). */
export const ALL_GUIDES: Guide[] = raw.map((g) => guideSchema.parse(g));
