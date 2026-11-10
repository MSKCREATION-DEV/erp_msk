import assert from "node:assert/strict";
import { resolveLocalSourceDocument } from "@/lib/suivi/ged";

/** NBSP inventaire KOUNDJI FAC-2710261 */
{
  const r = resolveLocalSourceDocument(
    "docs/FACTURE ABNMT M_KOUNDJI_SERVICES FAC-2710261.docx",
  );
  assert.ok(r, "doit résoudre le fichier NBSP");
  assert.match(r.originalName, /FAC-2710261/i);
}

{
  const r = resolveLocalSourceDocument(
    "docs/CONTRAT DE PRESTATION DE SERVICES.pdf",
  );
  assert.ok(r);
  assert.equal(r.originalName, "CONTRAT DE PRESTATION DE SERVICES.pdf");
}

{
  const r = resolveLocalSourceDocument("docs/__inexistant_suivi__.pdf");
  assert.equal(r, null);
}

console.log("✓ suivi ged-resolve");
