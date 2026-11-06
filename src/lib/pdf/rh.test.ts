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

  const stage = await generateContractStagePdf({
    kind: "STAGE",
    title: "Stagiaire Commerciale",
    startDate: "14/09/2026",
    endDate: "14/03/2027",
    salaryXof: 70_000,
    employee: { firstName: "Yaye", lastName: "Bah", jobTitle: "Stagiaire" },
  });
  assert.ok(stage.length > 1000);

  const presta = await generateContractPrestaPdf({
    kind: "PRESTA",
    title: "Prestation digitale",
    startDate: "01/10/2026",
    endDate: "31/12/2026",
    salaryXof: 250_000,
    employee: { firstName: "Fatou", lastName: "Diallo", jobTitle: "Consultante content" },
  });
  assert.ok(presta.length > 1000);
  const prestaText = extractText(presta);
  if (prestaText) {
    for (const article of [
      "Article 1 : Objet",
      "Article 2 : Duree et resiliation",
      "Article 3 : Remuneration et modalites de paiement",
      "Article 4 : Independance",
      "Article 5 : Propriete intellectuelle",
      "Article 6 : Confidentialite",
      "Article 7 : Protection des donnees personnelles",
      "Article 8 : Responsabilite et force majeure",
      "Article 9 : Droit applicable et reglement des litiges",
      "Article 11 : Signatures",
    ]) {
      assert.ok(
        prestaText.includes(article),
        `contrat presta RH — article manquant : "${article}"`,
      );
    }
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

  console.log("✓ rh.test.ts — 8 PDF OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
