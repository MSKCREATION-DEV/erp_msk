import assert from "node:assert/strict";
import { filterPageBreadcrumbs } from "./page-breadcrumbs";

{
  const out = filterPageBreadcrumbs(
    [
      { label: "Commercial", href: "/commercial" },
      { label: "Objectifs" },
    ],
    { title: "Objectifs", backHref: "/crm" },
  );
  assert.deepEqual(out, [], "Objectifs : hub + titre retirés → fil vide");
}

{
  // Retour = liste Prospects → pas besoin du crumb Prospects non plus
  const out = filterPageBreadcrumbs(
    [
      { label: "Commercial", href: "/commercial" },
      { label: "Prospects", href: "/crm/prospects" },
      { label: "Indigo" },
    ],
    { title: "Indigo", backHref: "/crm/prospects" },
  );
  assert.deepEqual(out, []);
}

{
  // Retour = liste Objectifs, fil utile = parent Objectifs seulement si ≠ back…
  // back = /crm/objectifs → crumb Objectifs retiré ; Madina ≠ title complet → garde Madina
  const out = filterPageBreadcrumbs(
    [
      { label: "Commercial", href: "/commercial" },
      { label: "Objectifs", href: "/crm/objectifs" },
      { label: "Madina" },
    ],
    {
      title: "Madina Tall",
      backHref: "/crm/objectifs",
    },
  );
  assert.deepEqual(out, [{ label: "Madina" }]);
}

{
  const out = filterPageBreadcrumbs(
    [{ label: "Commercial", href: "/commercial" }],
    { title: "Rapport", backHref: "/commercial" },
  );
  assert.deepEqual(out, []);
}

{
  // Chemin profond sans back : garder les niveaux métier (sans hub)
  const out = filterPageBreadcrumbs(
    [
      { label: "Commercial", href: "/commercial" },
      { label: "Devis", href: "/commercial/devis" },
      { label: "D-2026-001" },
    ],
    { title: "Devis D-2026-001" },
  );
  assert.deepEqual(out, [
    { label: "Devis", href: "/commercial/devis" },
    { label: "D-2026-001" },
  ]);
}

console.log("page-breadcrumbs.test.ts: ok");
