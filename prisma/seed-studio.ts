/**
 * Studio documentaire — seed Phase 1.
 *
 * 1) `signatureEnabled = false` sur tous les gabarits (legacy inclus) —
 *    règle produit absolue : signature désactivée par défaut ; activation
 *    uniquement via bascule admin explicite. Idempotent (re-seed safe).
 * 2) Catalogue central des variables `{{slug}}` (avec valeur d'exemple pour
 *    l'aperçu réel).
 * 3) Un gabarit `ENGINE_BLOCKS` démonstratif publié (« Attestation de
 *    présence ») — preuve du Studio bout en bout (création → publication →
 *    génération réelle), signature OFF.
 */
import type { PrismaClient } from "@/generated/prisma/client";
import { textToBlocks } from "../src/lib/studio/dsl";
import { extractVariableSlugs } from "../src/lib/studio/variables";

/**
 * Codes des gabarits legacy — seed force signature OFF (même s’ils avaient
 * été activés par une ancienne version du seed).
 */
const LEGACY_TEMPLATE_CODES = [
  "devis_standard",
  "facture_standard",
  "contrat_commercial_msk",
  "contrat_travail_msk",
  "contrat_stage_msk",
  "contrat_presta_msk",
  "attestation_stage_msk",
  "reglement_interieur_msk",
  "solde_tout_compte_msk",
  "fiche_paie_msk",
] as const;

const VARIABLE_CATALOG = [
  {
    slug: "collaborateur.prenom",
    label: "Prénom du collaborateur",
    category: "COLLABORATEUR" as const,
    sampleValue: "Awa",
  },
  {
    slug: "collaborateur.nom",
    label: "Nom du collaborateur",
    category: "COLLABORATEUR" as const,
    sampleValue: "Traoré",
  },
  {
    slug: "collaborateur.fonction",
    label: "Fonction / poste du collaborateur",
    category: "COLLABORATEUR" as const,
    sampleValue: "Chargée de clientèle",
  },
  {
    slug: "client.nom",
    label: "Nom / raison sociale du client",
    category: "CLIENT" as const,
    sampleValue: "Boutique Awa",
  },
  {
    slug: "client.adresse",
    label: "Adresse du client",
    category: "CLIENT" as const,
    sampleValue: "Hamdallaye ACI, Bamako",
  },
  {
    slug: "entreprise.nom",
    label: "Raison sociale MSK",
    category: "ENTREPRISE" as const,
    sampleValue: "MSK CREATION SARL",
  },
  {
    slug: "entreprise.adresse",
    label: "Adresse siège MSK",
    category: "ENTREPRISE" as const,
    sampleValue: "ACI 2000, Bamako, Mali",
  },
  {
    slug: "document.numero",
    label: "Numéro / référence du document",
    category: "DOCUMENT" as const,
    sampleValue: "DOC-2026-0001",
  },
  {
    slug: "document.date",
    label: "Date d'émission du document",
    category: "DOCUMENT" as const,
    sampleValue: "13/11/2026",
  },
] satisfies Array<{
  slug: string;
  label: string;
  category: "COLLABORATEUR" | "CLIENT" | "ENTREPRISE" | "DOCUMENT";
  sampleValue: string;
}>;

const ATTESTATION_PRESENCE_BODY = [
  "# Attestation de présence",
  "",
  "{{entreprise.nom}}, dont le siège est situé à {{entreprise.adresse}}, atteste par la présente que {{collaborateur.prenom}} {{collaborateur.nom}}, {{collaborateur.fonction}}, est présent(e) et actif(ve) au sein de l'agence à la date d'émission du présent document.",
  "",
  "> La présente attestation est délivrée à la demande de l'intéressé(e) pour servir et valoir ce que de droit.",
  "",
  "---",
  "",
  `Fait à Bamako, le {{document.date}} — Réf. {{document.numero}}`,
  "",
  "[[SIGNATURE: Signature du collaborateur | Pour l'entreprise]]",
].join("\n");

export async function seedPhaseStudioDocumentaire(prisma: PrismaClient) {
  // 1) Signature OFF — règle produit (idempotent, y compris legacy déjà true).
  await prisma.documentTemplate.updateMany({
    where: { code: { in: [...LEGACY_TEMPLATE_CODES] } },
    data: { signatureEnabled: false },
  });

  // 2) Catalogue central des variables.
  for (const v of VARIABLE_CATALOG) {
    await prisma.templateVariableDef.upsert({
      where: { slug: v.slug },
      create: {
        slug: v.slug,
        label: v.label,
        category: v.category,
        sampleValue: v.sampleValue,
      },
      update: {
        label: v.label,
        category: v.category,
        sampleValue: v.sampleValue,
      },
    });
  }

  // 3) Gabarit ENGINE_BLOCKS démonstratif, publié, signature OFF par défaut.
  const blocks = textToBlocks(ATTESTATION_PRESENCE_BODY);
  const slugs = extractVariableSlugs(ATTESTATION_PRESENCE_BODY);
  const variablesJson = slugs.map((slug) => ({ slug, required: true }));

  const template = await prisma.documentTemplate.upsert({
    where: { code: "attestation_presence_libre" },
    create: {
      code: "attestation_presence_libre",
      type: "DOCUMENT_LIBRE",
      name: "Attestation de présence",
      description:
        "Attestation générique (hors stage) — démonstrateur Studio documentaire : créée, publiée et générée entièrement depuis Administration ▸ Gabarits.",
      generatorKind: "ENGINE_BLOCKS",
      signatureEnabled: false,
      active: true,
    },
    update: {
      name: "Attestation de présence",
      description:
        "Attestation générique (hors stage) — démonstrateur Studio documentaire : créée, publiée et générée entièrement depuis Administration ▸ Gabarits.",
      signatureEnabled: false,
    },
  });

  const existingV1 = await prisma.documentTemplateVersion.findUnique({
    where: { templateId_version: { templateId: template.id, version: 1 } },
  });

  const v1 =
    existingV1 ??
    (await prisma.documentTemplateVersion.create({
      data: {
        templateId: template.id,
        version: 1,
        status: "PUBLISHED",
        bodyJson: blocks,
        variablesJson,
        changelog: "Version initiale — seed Studio documentaire.",
      },
    }));

  if (template.publishedVersionId !== v1.id) {
    await prisma.documentTemplate.update({
      where: { id: template.id },
      data: { publishedVersionId: v1.id },
    });
  }
  if (existingV1 && existingV1.status !== "PUBLISHED") {
    await prisma.documentTemplateVersion.update({
      where: { id: existingV1.id },
      data: { status: "PUBLISHED", bodyJson: blocks, variablesJson },
    });
  }
}
