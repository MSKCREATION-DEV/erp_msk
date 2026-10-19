import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCsvText, parseXlsxBuffer } from "@/lib/crm/import/parse-tabular";
import { mapExcelStatus } from "@/lib/crm/labels";

const csv = `MSK CREATION
#;Entreprise;Nom Contact;Poste;Téléphone;Email;Source;1er Contact;STATUT;Dernière Action;Prochaine Action;Date Relance;Offre;Budget;Notes;;;;Responsable;;Créé par
1;Acme SARL;Awa Diarra;CEO;+223 70 00 00 00;a@test.com;WhatsApp;2026-04-01;CONTACTÉ;Msg WA;Relance;11/04/2026;Site;800;Note;;;;Madina;;Fatoumata
2;Beta SA;Moussa;Gérant;//;//;TikTok;2026-04-02;À CONTACTER;;;12/04/2026;;;;;Mathieu;;Mathieu
`;

{
  const { rows, skipped, colMap } = parseCsvText(csv);
  assert.equal(colMap.orgName != null, true);
  assert.equal(colMap.owner != null, true);
  assert.equal(colMap.createdBy != null, true);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]!.orgName, "Acme SARL");
  assert.equal(rows[0]!.ownerHint, "Madina");
  assert.equal(rows[0]!.createdByHint, "Fatoumata");
  assert.equal(rows[0]!.stage, "CONTACTE");
  assert.equal(rows[1]!.ownerHint, "Mathieu");
  assert.ok(skipped >= 0);
  console.log("✓ parseCsvText owners/créés par");
}

{
  assert.equal(mapExcelStatus("CLIENT ✅"), "GAGNE");
  assert.equal(mapExcelStatus("PERDU ❌"), "PERDU");
  assert.equal(mapExcelStatus("EN COURS"), "QUALIFICATION");
  console.log("✓ mapExcelStatus");
}

{
  const path = resolve(process.cwd(), "docs/CRM_Prospection_MSK.xlsx");
  try {
    const buf = readFileSync(path);
    const { rows, sheetName, colMap } = parseXlsxBuffer(buf);
    assert.ok(rows.length >= 300, `expected >=300 got ${rows.length}`);
    assert.ok(colMap.orgName != null);
    assert.ok(colMap.owner != null);
    const madina = rows.filter((r) => r.ownerHint === "Madina").length;
    const mathieu = rows.filter((r) => r.ownerHint === "Mathieu").length;
    assert.ok(madina > 300, `Madina owners ${madina}`);
    assert.ok(mathieu >= 10, `Mathieu owners ${mathieu}`);
    console.log(
      `✓ parseXlsxBuffer ${sheetName} rows=${rows.length} Madina=${madina} Mathieu=${mathieu}`,
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("ℹ Excel absent — skip parseXlsxBuffer live");
    } else {
      throw e;
    }
  }
}

console.log("import parse-tabular tests OK");
