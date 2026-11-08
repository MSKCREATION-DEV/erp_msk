import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  generateAttestationStagePdf,
  generateContractPrestaPdf,
  generateContractStagePdf,
  generateContractTravailPdf,
  generateFichePaiePdf,
  generateReglementInterieurPdf,
  generateSoldeToutComptePdf,
} from "./rh";
import { generateCommercialPdf } from "./commercial";

/** Texte PDF via pdftotext (poppler) si disponible — sinon `null` (CI sans poppler). */
function extractText(bytes: Uint8Array): string | null {
  try {
    const dir = mkdtempSync(path.join(tmpdir(), "msk-rh-"));
    const file = path.join(dir, "doc.pdf");
    writeFileSync(file, bytes);
    const text = execFileSync("pdftotext", ["-layout", file, "-"], {
      encoding: "utf8",
    });
    rmSync(dir, { recursive: true, force: true });
    return text;
  } catch {
    return null;
  }
}

async function main() {
  // Régression WinAnsi : objet avec CR (bug DEV-2026-0010)
  const devis = await generateCommercialPdf({
    type: "DEVIS",
    number: "DEV-2026-0010",
    clientName: "Marinas",
    object:
      "Gestion professionnelle des réseaux sociaux.\r\nMSK CREATION prend en charge.\rBamako.",
    lines: [
      { label: "CNT-RS-PREMIUM", qty: 1, unitPrice: 200_000 },
      { label: "Test", qty: 1, unitPrice: 20_000 },
    ],
  });
  assert.ok(devis.length > 1000, "devis PDF trop petit");

  const travail = await generateContractTravailPdf({
    kind: "TRAVAIL",
    title: "Developpeur Web & Mobile",
    startDate: "17/08/2026",
    salaryXof: 165_000,
    employee: {
      firstName: "Amadou Samba",
      lastName: "Guiro",
      jobTitle: "Developpeur Web & Mobile",
      address: "Kalaban Coura ACI",
    },
  });
  assert.ok(travail.length > 1000);
  const travailText = extractText(travail);
  if (travailText) {
    for (const article of [
      "Article 7 : Congés payés",
      "Article 8 : Sécurité sociale, retraite et prévoyance",
      "Article 9 : Confidentialité",
      "Article 10 : Matériel et outils de travail",
      "Article 11 : Propriété intellectuelle",
      "Article 12 : Discipline et sanctions",
      "Article 13 : Achats de logiciels, licences et ressources",
      "Article 14 : Résiliation du contrat",
      "Article 15 : Dispositions générales",
    ]) {
      assert.ok(
        travailText.includes(article),
        `contrat travail — article manquant : "${article}"`,
      );
    }
    // Pas de trou de numérotation (ex. "Article 16" sans "Article 15" avant)
    assert.ok(
      !travailText.includes("Article 16"),
      "contrat travail — numérotation d'article incohérente (trou détecté)",
    );
  } else {
    console.warn("⚠ pdftotext indisponible — assertions de contenu travail ignorées");
  }

  const stage = await generateContractStagePdf({
    kind: "STAGE",
    title: "Stagiaire Commerciale",
    startDate: "14/09/2026",
    endDate: "14/03/2027",
    salaryXof: 70_000,
    employee: { firstName: "Yaye", lastName: "Bah", jobTitle: "Stagiaire" },
  });
  assert.ok(stage.length > 1000);
  const stageText = extractText(stage);
  if (stageText) {
    for (const article of [
      "Article 7 : Matériel et outils de travail",
      "Article 8 : Propriété intellectuelle",
      "Article 9 : Discipline et sanctions",
      "Article 10 : Achats de logiciels, licences et ressources",
      "Article 11 : Résiliation du contrat",
      "Article 12 : Dispositions générales",
    ]) {
      assert.ok(
        stageText.includes(article),
        `contrat stage — article manquant : "${article}"`,
      );
    }
  } else {
    console.warn("⚠ pdftotext indisponible — assertions de contenu stage ignorées");
  }

  const presta = await generateContractPrestaPdf({
    kind: "PRESTA",
    title: "Prestation digitale",
    startDate: "01/10/2026",
    endDate: "31/12/2026",
    salaryXof: 250_000,
    employee: {
      firstName: "Fatou",
      lastName: "Diallo",
      jobTitle: "Consultante content",
      email: "fatou.diallo@example.com",
      phone: "+223 70 00 00 00",
      address: "Hamdallaye ACI 2000, Bamako",
    },
  });
  assert.ok(presta.length > 1000);
  const prestaText = extractText(presta);
  if (prestaText) {
    for (const article of [
      "INFORMATIONS CLES",
      "ENTRE LES SOUSSIGNÉS",
      "LE CLIENT",
      "LE PRESTATAIRE",
      "Article 1 : Objet",
      "Article 2 : Durée et résiliation",
      "Article 3 : Rémunération et modalités de paiement",
      "Article 4 : Indépendance",
      "Article 5 : Obligations du Prestataire",
      "Article 6 : Obligations du Client",
      "Article 7 : Propriété intellectuelle",
      "Article 8 : Confidentialité",
      "Article 9 : Protection des données personnelles",
      "Article 10 : Responsabilité et force majeure",
      "Article 11 : Droit applicable et règlement des litiges",
      "Article 13 : Signatures",
      "Lu et approuvé",
    ]) {
      assert.ok(
        prestaText.includes(article),
        `contrat presta RH — section manquante : "${article}"`,
      );
    }
    // Confidentialité doit être réciproque (v3) — pas "Le Prestataire s'engage"
    assert.ok(
      prestaText.includes("Chaque Partie s'engage") &&
        prestaText.includes("garder strictement confidentielles"),
      "contrat presta RH — confidentialité doit être réciproque (Chaque Partie)",
    );
  } else {
    console.warn("⚠ pdftotext indisponible — assertions de contenu presta RH ignorées");
  }

  const att = await generateAttestationStagePdf({
    employee: { firstName: "Assetou", lastName: "Mangara" },
    startDate: "01/07/2026",
    endDate: "30/09/2026",
    jobTitle: "Stagiaire Commerciale",
  });
  assert.ok(att.length > 800);

  const solde = await generateSoldeToutComptePdf({
    employee: { firstName: "Assetou", lastName: "Mangara", address: "Yirimadio" },
    amountXof: 85_000,
    paymentRef: "Cheque N 2740277",
  });
  assert.ok(solde.length > 800);

  const reg = await generateReglementInterieurPdf({
    employee: { firstName: "Fatoumata", lastName: "Keita" },
  });
  assert.ok(reg.length > 1000);

  const paie = await generateFichePaiePdf({
    employee: {
      firstName: "Amadou Samba",
      lastName: "Guiro",
      email: "a.guiro@mskcreation.net",
      jobTitle: "Developpeur",
    },
    periodStart: "01/09/2026",
    periodEnd: "30/09/2026",
    baseSalaryXof: 165_000,
    leaveBalanceDays: 4,
  });
  assert.ok(paie.length > 1000);
  const paieText = extractText(paie);
  if (paieText) {
    // Régression fidélité vs docs/Fiche de Paie de Guiro...pdf (net 165 000 → brut 224 673, cotisations 59 673)
    for (const amount of ["224 673", "59 673", "165 000", "1 296", "952"]) {
      assert.ok(
        paieText.includes(amount),
        `fiche de paie — montant attendu manquant (gross-up 26,56 %) : "${amount}"`,
      );
    }
  } else {
    console.warn("⚠ pdftotext indisponible — assertions de contenu fiche de paie ignorées");
  }

  console.log("✓ rh.test.ts — 8 PDF OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
