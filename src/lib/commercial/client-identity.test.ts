/**
 * Garde-fou conceptuel : un « client » COM n’est pas équivalent au seul stage GAGNE.
 * Marinas (prod) : ComClient orphelin (create) + opp CRM encore DEVIS_ENVOYE.
 */
import assert from "node:assert/strict";

function isCommercialClientLinked(opts: {
  stage: string;
  hasComClient: boolean;
}): boolean {
  return opts.hasComClient;
}

function isPipelineClosedAsClient(stage: string): boolean {
  return stage === "GAGNE";
}

assert.equal(
  isCommercialClientLinked({ stage: "DEVIS_ENVOYE", hasComClient: true }),
  true,
);
assert.equal(
  isPipelineClosedAsClient("DEVIS_ENVOYE"),
  false,
  "Un devis envoyé n’est pas un client CRM fermé",
);
assert.equal(
  isCommercialClientLinked({ stage: "GAGNE", hasComClient: false }),
  false,
  "GAGNE sans ComClient ≠ client commercial",
);

console.log("client-identity.test.ts: ok");
