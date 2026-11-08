import assert from "node:assert/strict";
import {
  inferServiceKindFromLines,
  resolveContractPrestation,
} from "./contract-prestation";

assert.equal(
  inferServiceKindFromLines([
    {
      label: "CNT-RS-PRO · Réseaux sociaux — Pro",
      catalogOffer: {
        sku: "CNT-RS-PRO",
        name: "Réseaux sociaux — Pro",
        pillar: "CONTENU_COMMUNICATION",
      },
    },
  ]),
  "RESEAUX_SOCIAUX",
);

assert.equal(
  resolveContractPrestation({
    family: null,
    serviceKind: null,
    scopeJson: null,
    lines: [
      {
        label: "Forfait RS",
        catalogOffer: {
          sku: "CNT-RS-STD",
          name: "Réseaux sociaux — Standard",
          pillar: "CONTENU_COMMUNICATION",
        },
      },
    ],
  })?.serviceKind,
  "RESEAUX_SOCIAUX",
);

assert.equal(
  resolveContractPrestation({
    family: null,
    serviceKind: null,
    scopeJson: null,
    lines: [
      {
        label: "Site vitrine",
        catalogOffer: {
          sku: "WEB-SITE",
          name: "Site Internet",
          pillar: "PRESENCE_DIGITALE",
        },
      },
      {
        label: "Charte",
        catalogOffer: {
          sku: "IMG-CHARTE",
          name: "Charte graphique",
          pillar: "IMAGE_MARQUE",
        },
      },
    ],
  })?.serviceKind,
  "BUNDLE",
);

assert.equal(
  resolveContractPrestation({
    family: "ENGAGEMENT_CDC",
    serviceKind: null,
    scopeJson: null,
    lines: [],
  })?.family,
  "ENGAGEMENT_CDC",
);

console.log("contract-prestation.test.ts OK");
