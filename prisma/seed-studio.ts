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
import { company } from "../src/lib/company";
import { textToBlocks } from "../src/lib/studio/dsl";
import {
  CHARGE_TEMPLATE_DSL_SPECS,
  LEGACY_TEMPLATE_DSL_SPECS,
} from "../src/lib/studio/template-dsl-bodies";
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
  {
    slug: "document.validite",
    label: "Date de validité (devis)",
    category: "DOCUMENT" as const,
    sampleValue: "13/12/2026",
  },
  {
    slug: "collaborateur.civilite",
    label: "Civilité",
    category: "COLLABORATEUR" as const,
    sampleValue: "Mme",
  },
  {
    slug: "contrat.date_debut",
    label: "Date de début",
    category: "DOCUMENT" as const,
    sampleValue: "01/09/2026",
  },
  {
    slug: "contrat.date_fin",
    label: "Date de fin",
    category: "DOCUMENT" as const,
    sampleValue: "30/09/2026",
  },
  {
    slug: "contrat.lieu",
    label: "Lieu (stage / mission)",
    category: "DOCUMENT" as const,
    sampleValue: "Bamako, Mali",
  },
  {
    slug: "devis.objet",
    label: "Objet du devis",
    category: "DOCUMENT" as const,
    sampleValue: "Gestion réseaux sociaux — 3 mois",
  },
  {
    slug: "devis.mission",
    label: "Note mission",
    category: "DOCUMENT" as const,
    sampleValue: "Community management et reporting mensuel.",
  },
  {
    slug: "entreprise.representant",
    label: "Représentant légal",
    category: "ENTREPRISE" as const,
    sampleValue: company.managerName,
  },
  {
    slug: "entreprise.qualite_representant",
    label: "Qualité du représentant",
    category: "ENTREPRISE" as const,
    sampleValue: company.managerTitle,
  },
  {
    slug: "solde.montant",
    label: "Montant solde (formaté)",
    category: "DOCUMENT" as const,
    sampleValue: "85 000 FCFA",
  },
  {
    slug: "solde.montant_lettres",
    label: "Montant solde en lettres",
    category: "DOCUMENT" as const,
    sampleValue: "(Quatre-vingt-cinq mille)",
  },
  {
    slug: "solde.reference",
    label: "Référence paiement solde",
    category: "DOCUMENT" as const,
    sampleValue: " par chèque N°2740277",
  },
  {
    slug: "solde.attestation_clause",
    label: "Clause attestation jointe (solde)",
    category: "DOCUMENT" as const,
    sampleValue: "mon attestation de stage ainsi que, ",
  },
  {
    slug: "collaborateur.adresse_suffixe",
    label: "Suffixe adresse collaborateur",
    category: "COLLABORATEUR" as const,
    sampleValue: ", demeurant à Yirimadio, Bamako",
  },
  {
    slug: "collaborateur.naissance_suffixe",
    label: "Suffixe date de naissance",
    category: "COLLABORATEUR" as const,
    sampleValue: ", né(e) le 03/03/2003",
  },
  {
    slug: "collaborateur.piece_identite_suffixe",
    label: "Suffixe pièce d'identité",
    category: "COLLABORATEUR" as const,
    sampleValue: ", titulaire de la pièce d'identité n° 199 19990504 000037",
  },
  {
    slug: "contrat.date_debut_phrase",
    label: "Phrase date d'effet (contrat travail)",
    category: "DOCUMENT" as const,
    sampleValue:
      "Le présent contrat prend effet le 01/09/2026 et est conclu pour une durée indéterminée.",
  },
  {
    slug: "contrat.date_debut_phrase_stage",
    label: "Phrase durée (contrat stage)",
    category: "DOCUMENT" as const,
    sampleValue: "Le stage prend effet le 01/09/2026 et s'achève le 30/09/2026.",
  },
  {
    slug: "contrat.periode_essai_mois",
    label: "Durée période d'essai (mois)",
    category: "DOCUMENT" as const,
    sampleValue: "3",
  },
  {
    slug: "contrat.remuneration_phrase",
    label: "Phrase rémunération",
    category: "DOCUMENT" as const,
    sampleValue:
      "En contrepartie, le salarié percevra une rémunération mensuelle nette de 250 000 FCFA, versée à terme échu par virement ou tout mode autorisé.",
  },
  {
    slug: "contrat.gratification_phrase",
    label: "Phrase gratification stage",
    category: "DOCUMENT" as const,
    sampleValue:
      "Gratification mensuelle nette de 85 000 FCFA, versée à terme échu.",
  },
  {
    slug: "contrat.dispositions_particulieres_block",
    label: "Bloc dispositions particulières (optionnel)",
    category: "DOCUMENT" as const,
    sampleValue: "",
  },
  {
    slug: "contrat.dispositions_generales_titre",
    label: "Titre dispositions générales (travail)",
    category: "DOCUMENT" as const,
    sampleValue: "# Article 15 : Dispositions générales",
  },
  {
    slug: "contrat.dispositions_generales_titre_stage",
    label: "Titre dispositions générales (stage)",
    category: "DOCUMENT" as const,
    sampleValue: "# Article 12 : Dispositions générales",
  },
  {
    slug: "client.telephone",
    label: "Téléphone client",
    category: "CLIENT" as const,
    sampleValue: "+223 70 00 00 00",
  },
  {
    slug: "client.email",
    label: "E-mail client",
    category: "CLIENT" as const,
    sampleValue: "awa@boutique-awa.ml",
  },
  {
    slug: "client.entreprise",
    label: "Entreprise client (facture)",
    category: "CLIENT" as const,
    sampleValue: "KOUNDJI SERVICES",
  },
  {
    slug: "client.entreprise_suffixe",
    label: "Suffixe entreprise client",
    category: "CLIENT" as const,
    sampleValue: " — Boutique Awa",
  },
  {
    slug: "client.contact_nom",
    label: "Contact / représentant client",
    category: "CLIENT" as const,
    sampleValue: "Awa Traoré",
  },
  {
    slug: "collaborateur.email",
    label: "E-mail collaborateur",
    category: "COLLABORATEUR" as const,
    sampleValue: "a.guiro@mskcreation.net",
  },
  {
    slug: "document.tva_taux",
    label: "Taux TVA affiché",
    category: "DOCUMENT" as const,
    sampleValue: "18 %",
  },
  {
    slug: "contrat.offre_libelle",
    label: "Libellé offre / service",
    category: "DOCUMENT" as const,
    sampleValue: "Réseaux sociaux — Offre PRO",
  },
  {
    slug: "contrat.montant_mensuel",
    label: "Montant mensuel contrat",
    category: "DOCUMENT" as const,
    sampleValue: "150 000 FCFA",
  },
  {
    slug: "contrat.delai_validation_h",
    label: "Délai validation contenus (h)",
    category: "DOCUMENT" as const,
    sampleValue: "48",
  },
  {
    slug: "contrat.delai_acces_h",
    label: "Délai accès admin (h)",
    category: "DOCUMENT" as const,
    sampleValue: "48",
  },
  {
    slug: "contrat.preavis_jours",
    label: "Préavis résiliation (jours)",
    category: "DOCUMENT" as const,
    sampleValue: "30",
  },
  {
    slug: "contrat.med_jours",
    label: "Mise en demeure (jours)",
    category: "DOCUMENT" as const,
    sampleValue: "15",
  },
  {
    slug: "contrat.restitution_acces_h",
    label: "Restitution accès (h)",
    category: "DOCUMENT" as const,
    sampleValue: "48",
  },
  {
    slug: "contrat.acompte_pct",
    label: "Acompte premier mois (%)",
    category: "DOCUMENT" as const,
    sampleValue: "50",
  },
  {
    slug: "contrat.penalite_retard_pct",
    label: "Pénalité retard (% / semaine)",
    category: "DOCUMENT" as const,
    sampleValue: "1",
  },
  {
    slug: "contrat.confidentialite_annees",
    label: "Durée confidentialité (années)",
    category: "DOCUMENT" as const,
    sampleValue: "5",
  },
  {
    slug: "contrat.plafond_mois",
    label: "Plafond responsabilité (mois)",
    category: "DOCUMENT" as const,
    sampleValue: "3",
  },
  {
    slug: "contrat.amiable_jours",
    label: "Délai amiable litige (jours)",
    category: "DOCUMENT" as const,
    sampleValue: "30",
  },
  {
    slug: "paie.periode_debut",
    label: "Début période de paie",
    category: "DOCUMENT" as const,
    sampleValue: "01/09/2026",
  },
  {
    slug: "paie.periode_fin",
    label: "Fin période de paie",
    category: "DOCUMENT" as const,
    sampleValue: "30/09/2026",
  },
  {
    slug: "paie.net",
    label: "Salaire net (formaté)",
    category: "DOCUMENT" as const,
    sampleValue: "165 000",
  },
  {
    slug: "paie.brut",
    label: "Salaire brut indicatif",
    category: "DOCUMENT" as const,
    sampleValue: "224 673",
  },
  {
    slug: "paie.type_contrat",
    label: "Type de contrat (paie)",
    category: "DOCUMENT" as const,
    sampleValue: "CDI",
  },
  {
    slug: "paie.conges_solde",
    label: "Solde congés (jours)",
    category: "DOCUMENT" as const,
    sampleValue: "4",
  },
  {
    slug: "paie.conges_pris",
    label: "Congés pris (jours)",
    category: "DOCUMENT" as const,
    sampleValue: "0",
  },
  {
    slug: "entreprise.devise",
    label: "Devise",
    category: "ENTREPRISE" as const,
    sampleValue: "FCFA",
  },
  {
    slug: "entreprise.heures_hebdo",
    label: "Heures hebdomadaires",
    category: "ENTREPRISE" as const,
    sampleValue: "40",
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

async function publishEngineBlocksVersion(
  prisma: PrismaClient,
  templateId: string,
  body: string,
  changelog: string,
) {
  const blocks = textToBlocks(body);
  const slugs = extractVariableSlugs(body);
  const variablesJson = slugs.map((slug) => ({
    slug,
    required: !slug.includes("suffixe") && !slug.includes("_block"),
  }));

  const existingV1 = await prisma.documentTemplateVersion.findUnique({
    where: { templateId_version: { templateId, version: 1 } },
  });

  const versionId = existingV1
    ? (
        await prisma.documentTemplateVersion.update({
          where: { id: existingV1.id },
          data: { status: "PUBLISHED", bodyJson: blocks, variablesJson, changelog },
        })
      ).id
    : (
        await prisma.documentTemplateVersion.create({
          data: {
            templateId,
            version: 1,
            status: "PUBLISHED",
            bodyJson: blocks,
            variablesJson,
            changelog,
          },
        })
      ).id;

  await prisma.documentTemplate.update({
    where: { id: templateId },
    data: {
      generatorKind: "ENGINE_BLOCKS",
      publishedVersionId: versionId,
      signatureEnabled: false,
    },
  });
}

async function migrateLegacyTemplatesToEngineBlocks(prisma: PrismaClient) {
  for (const spec of LEGACY_TEMPLATE_DSL_SPECS) {
    const row = await prisma.documentTemplate.findUnique({ where: { code: spec.code } });
    if (!row) continue;
    await publishEngineBlocksVersion(prisma, row.id, spec.body, spec.changelog);
  }
}

async function seedChargeTemplateShells(prisma: PrismaClient) {
  for (const spec of CHARGE_TEMPLATE_DSL_SPECS) {
    const template = await prisma.documentTemplate.upsert({
      where: { code: spec.code },
      create: {
        code: spec.code,
        type: "DOCUMENT_LIBRE",
        name:
          spec.code === "facture_charge_edm_msk"
            ? "Facture charge EDM (à valider)"
            : "Facture charge Loyer (à valider)",
        description:
          "Coque Studio — contenu issu du PDF `docs/` ; validation Direction avant usage.",
        generatorKind: "ENGINE_BLOCKS",
        signatureEnabled: false,
        active: true,
      },
      update: {
        signatureEnabled: false,
        active: true,
      },
    });
    await publishEngineBlocksVersion(prisma, template.id, spec.body, spec.changelog);
  }
}

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

  // 4) Migration legacy → ENGINE_BLOCKS (contenu DSL fidèle + composites).
  await migrateLegacyTemplatesToEngineBlocks(prisma);

  // 5) Coques charges fournisseurs (PDF docs/, statut à valider).
  await seedChargeTemplateShells(prisma);
}
