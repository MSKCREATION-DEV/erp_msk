/**
 * Données seed Suivi — UNIQUEMENT inventaire + DECISIONS-SEED.
 * Aucun client / montant inventé.
 */

export type SeedClient = {
  key: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  notes?: string;
  sourceRef: string;
};

export type SeedInvoiceLine = {
  label: string;
  description?: string;
  qty: number;
  unitPrice: number;
  vatRate?: number;
};

export type SeedPayment = {
  amount: number;
  paidAt: string; // ISO date
  method?: string;
  reference?: string;
  note?: string;
};

export type SeedInvoice = {
  clientKey: string;
  number: string;
  legacyNumber?: string;
  status: "BROUILLON" | "EMISE" | "PARTIELLE" | "PAYEE" | "ANNULEE";
  issuedAt: string;
  dueAt?: string;
  totalHt: number;
  totalVat: number;
  totalTtc: number;
  amountPaid: number;
  object?: string;
  notes?: string;
  sourceDocument: string;
  lines: SeedInvoiceLine[];
  payments: SeedPayment[];
};

export type SeedContract = {
  clientKey: string;
  title: string;
  partyName?: string;
  effectiveFrom?: string;
  durationNote?: string;
  monthlyAmount?: number | null;
  sourceDocument: string;
  notes?: string;
};

export const SV_SEED_CLIENTS: SeedClient[] = [
  {
    key: "ecosol",
    name: "ECOSOL",
    contactName: "M. DOUCOURE",
    email: "ecosol550@gmail.com",
    phone: "+1 (541) 539-5031",
    city: "Bamako",
    country: "Mali",
    notes: "Énergie solaire · Grand Marché de Bamako",
    sourceRef: "inventaire:ECOSOL",
  },
  {
    key: "koundji",
    name: "KOUNDJI SERVICES",
    contactName: "M. TRAORÉ",
    city: "Bamako",
    country: "Mali",
    notes: "Agence Immobilière",
    sourceRef: "inventaire:KOUNDJI",
  },
  {
    key: "bomoyi",
    name: "BOMOYI",
    contactName: "M. BOMOYI",
    country: "France",
    sourceRef: "inventaire:BOMOYI",
  },
  {
    key: "delmorian",
    name: "DELMORIAN",
    contactName: "M. DELMORIAN",
    country: "France",
    sourceRef: "inventaire:DELMORIAN",
  },
  {
    key: "isdalinia",
    name: "ISDALINIA",
    contactName: "Mme. ISDALINIA",
    country: "France",
    notes: "Excel : ISDALINIA SAS",
    sourceRef: "inventaire:ISDALINIA",
  },
  {
    key: "prosperity",
    name: "PROSPERITY MANAGEMENT",
    contactName: "Mr. TRAORE",
    city: "Bamako",
    country: "Mali",
    notes: "Agence de voyage",
    sourceRef: "inventaire:PROSPERITY",
  },
];

export const SV_SEED_INVOICES: SeedInvoice[] = [
  {
    clientKey: "bomoyi",
    number: "FAC-01",
    status: "PAYEE",
    issuedAt: "2026-01-09",
    dueAt: "2026-02-06",
    totalHt: 524488,
    totalVat: 0,
    totalTtc: 524488,
    amountPaid: 524488,
    object: "Conception de site vitrine",
    sourceDocument: "docs/FACTURE_BOMOYI_N° 01.pdf",
    notes: "FACTURE INTÉGRALEMENT ACQUITTÉE (virement)",
    lines: [
      {
        label: "Conception de site vitrine (Design responsive)",
        qty: 1,
        unitPrice: 524488,
        vatRate: 0,
      },
    ],
    payments: [
      {
        amount: 524488,
        paidAt: "2026-01-09",
        method: "Virement",
        note: "Acquittée PDF",
      },
    ],
  },
  {
    clientKey: "delmorian",
    number: "FAC-02",
    status: "PAYEE",
    issuedAt: "2026-01-10",
    dueAt: "2026-02-07",
    totalHt: 524488,
    totalVat: 0,
    totalTtc: 524488,
    amountPaid: 524488,
    object: "Branding & Identité visuelle",
    sourceDocument: "docs/FACTURE_DELMORIAN_N° 02.pdf",
    notes: "FACTURE INTÉGRALEMENT ACQUITTÉE (virement)",
    lines: [
      {
        label: "Branding & Identité visuelle",
        qty: 1,
        unitPrice: 524488,
        vatRate: 0,
      },
    ],
    payments: [
      {
        amount: 524488,
        paidAt: "2026-01-10",
        method: "Virement",
        note: "Acquittée PDF",
      },
    ],
  },
  {
    clientKey: "isdalinia",
    number: "FAC-03",
    status: "PAYEE",
    issuedAt: "2026-01-17",
    dueAt: "2026-02-10",
    totalHt: 2097952,
    totalVat: 0,
    totalTtc: 2097952,
    amountPaid: 2097952,
    object: "Conception de site vitrine",
    sourceDocument: "docs/FACTURE_ISDALINIA_N° 03.pdf",
    notes:
      "NEEDS_REVIEW:ISDALINIA_DECIMAL_FCFA — acompte PDF 629385,6 → 629386 (somme-conservant). Soldée au 2026-11-10 selon confirmation Direction (reste historique 1 468 566) — date exacte du solde non documentée dans les fichiers.",
    lines: [
      {
        label: "Conception de site vitrine",
        qty: 1,
        unitPrice: 2097952,
        vatRate: 0,
      },
    ],
    payments: [
      {
        amount: 629386,
        paidAt: "2026-01-17",
        method: "Virement",
        note: "Acompte 30 % (arrondi somme-conservant)",
      },
      {
        amount: 1468566,
        paidAt: "2026-11-10",
        method: "Confirmation Direction",
        note: "Soldé au 2026-11-10 selon confirmation Direction — date exacte encaissement non documentée",
      },
    ],
  },
  {
    clientKey: "koundji",
    number: "FAC-114",
    legacyNumber: "FAC-04",
    status: "PAYEE",
    issuedAt: "2026-04-16",
    dueAt: "2026-05-15",
    totalHt: 400000,
    totalVat: 72000,
    totalTtc: 472000,
    amountPaid: 472000,
    object: "Forfait démarrage",
    sourceDocument: "docs/FACTURE_KOUNDJI_SERVICES N° 04.pdf",
    notes: "NEEDS_REVIEW:KOUNDJI_114_DATE_EXCEL — Excel date 14/04 vs PDF 16/04",
    lines: [
      {
        label: "Site vitrine professionnel",
        qty: 1,
        unitPrice: 110000,
        vatRate: 18,
      },
      {
        label: "Charte graphique & identité digitale",
        qty: 1,
        unitPrice: 90000,
        vatRate: 18,
      },
      {
        label: "Logiciel de gestion immobilière",
        qty: 1,
        unitPrice: 200000,
        vatRate: 18,
      },
    ],
    payments: [
      {
        amount: 472000,
        paidAt: "2026-04-16",
        method: "Chèque",
        reference: "1179836",
        note: "BIM — PDF reste 0",
      },
    ],
  },
  {
    clientKey: "koundji",
    number: "FAC-2710261",
    legacyNumber: "FAC-117",
    status: "PAYEE",
    issuedAt: "2026-08-05",
    dueAt: "2026-09-04",
    totalHt: 100000,
    totalVat: 18000,
    totalTtc: 118000,
    amountPaid: 118000,
    object: "Abonnement RS Septembre",
    sourceDocument:
      "docs/FACTURE ABNMT M_KOUNDJI_SERVICES FAC-2710261.docx",
    notes:
      "NEEDS_REVIEW:KOUNDJI_117_HT_VS_TTC;NEEDS_REVIEW:KOUNDJI_SEPTEMBER_OVERLAP — Excel FAC-117 encaissé HT 100000 chèque 9587411. Complément 18 000 (TVA/reste) soldé au 2026-11-10 selon confirmation Direction — date exacte non documentée.",
    lines: [
      {
        label:
          "Gestion réseaux sociaux, maintenance site web et suivi logiciel — Septembre",
        qty: 1,
        unitPrice: 100000,
        vatRate: 18,
      },
    ],
    payments: [
      {
        amount: 100000,
        paidAt: "2026-08-05",
        method: "Chèque",
        reference: "9587411",
        note: "Excel FAC-117 — HT only documenté",
      },
      {
        amount: 18000,
        paidAt: "2026-11-10",
        method: "Confirmation Direction",
        note: "Soldé au 2026-11-10 selon confirmation Direction — complément reste (ex-TVA) ; date exacte encaissement non documentée",
      },
    ],
  },
  {
    clientKey: "koundji",
    number: "FAC-167",
    status: "PAYEE",
    issuedAt: "2026-10-07",
    dueAt: "2026-11-06",
    totalHt: 200000,
    totalVat: 36000,
    totalTtc: 236000,
    amountPaid: 236000,
    object: "Abonnement RS sept + oct",
    sourceDocument: "docs/FACTURE ABNMT M_KOUNDJI_SERVICES.docx",
    notes:
      "NEEDS_REVIEW:KOUNDJI_SEPTEMBER_OVERLAP — ligne 01/09 + 01/10. Soldée au 2026-11-10 selon confirmation Direction (aucun encaissement fichier antérieur) — date exacte non documentée.",
    lines: [
      {
        label:
          "Gestion RS + Maintenance + Suivi logiciel — 01/09/2026",
        qty: 1,
        unitPrice: 100000,
        vatRate: 18,
      },
      {
        label:
          "Gestion RS + Maintenance + Suivi logiciel — 01/10/2026",
        qty: 1,
        unitPrice: 100000,
        vatRate: 18,
      },
    ],
    payments: [
      {
        amount: 236000,
        paidAt: "2026-11-10",
        method: "Confirmation Direction",
        note: "Soldé au 2026-11-10 selon confirmation Direction — date exacte encaissement non documentée",
      },
    ],
  },
  {
    clientKey: "ecosol",
    number: "FAC-116",
    legacyNumber: "FAC-06",
    status: "PAYEE",
    issuedAt: "2026-06-25",
    dueAt: "2026-07-24",
    totalHt: 660000,
    totalVat: 118800,
    totalTtc: 778800,
    amountPaid: 778800,
    object: "Gestion RS PREMIUM + déplacement",
    sourceDocument: "docs/FACTURE_ECOSOL .pdf",
    notes: "NEEDS_REVIEW:ECOSOL_116_EXCEL_HT_NOT_TTC — Excel 660000 = HT",
    lines: [
      {
        label: "Gestion RS PREMIUM 01/07/2026",
        qty: 1,
        unitPrice: 600000,
        vatRate: 18,
      },
      {
        label: "Déplacement",
        qty: 1,
        unitPrice: 60000,
        vatRate: 18,
      },
    ],
    payments: [
      {
        amount: 778800,
        paidAt: "2026-06-25",
        method: "Espèce",
        note: "PDF reste 0",
      },
    ],
  },
  {
    clientKey: "ecosol",
    number: "FAC-155",
    status: "PAYEE",
    issuedAt: "2026-10-02",
    dueAt: "2026-11-01",
    totalHt: 260000,
    totalVat: 46800,
    totalTtc: 306800,
    amountPaid: 306800,
    object: "Gestion RS PREMIUM + déplacement",
    sourceDocument: "docs/FACTURE_ECOSOLS NVF N°155.docx",
    notes:
      "NEEDS_REVIEW:ECOSOL_155_EXCEL_MINUS_800. Encaissement cash 200000 le 02/10/2026 ; reste 106800 reporté sur 22910263 (ligne arriéré) — écriture « Report facture » = transfert de dette, pas un 2e encaissement.",
    lines: [
      {
        label: "Gestion RS PREMIUM",
        qty: 1,
        unitPrice: 200000,
        vatRate: 18,
      },
      {
        label: "Déplacement",
        qty: 1,
        unitPrice: 60000,
        vatRate: 18,
      },
    ],
    payments: [
      {
        amount: 200000,
        paidAt: "2026-10-02",
        method: "Espèce",
        note: "Paiement réel confirmé Direction — partiel FAC-155",
      },
      {
        amount: 106800,
        paidAt: "2026-10-29",
        method: "Report facture",
        reference: "22910263",
        note: "Arriéré reporté sur 22910263 (pas d'encaissement cash) — évite double-comptage solde client",
      },
    ],
  },
  {
    clientKey: "ecosol",
    number: "22910263",
    status: "PARTIELLE",
    issuedAt: "2026-10-29",
    dueAt: "2026-11-30",
    totalHt: 260000,
    totalVat: 46800,
    totalTtc: 413600,
    amountPaid: 260000,
    object: "RS PREMIUM octobre + arriéré sept. 106800",
    sourceDocument: "docs/FACTURE  ECOSOL 29-10-2026.docx",
    notes:
      "Net à payer historique 413600 = prestations oct TTC 306800 (HT 260000 + TVA 46800) + arriéré sept 106800 (report FAC-155 après versement 200000). Paiement réel 260000 le 04/11/2026 → reste 153600. Pas d'autre paiement inventé.",
    lines: [
      {
        label: "Gestion des Réseaux Sociaux — Offre PREMIUM",
        qty: 1,
        unitPrice: 200000,
        vatRate: 18,
      },
      {
        label: "Déplacement sur site — Mission suivi / contenu",
        qty: 1,
        unitPrice: 60000,
        vatRate: 18,
      },
      {
        label: "Arriéré septembre (report FAC-155)",
        description: "306800 − versement 200000",
        qty: 1,
        unitPrice: 106800,
        vatRate: 0,
      },
    ],
    payments: [
      {
        amount: 260000,
        paidAt: "2026-11-04",
        method: "Espèce",
        note: "Paiement réel confirmé Direction — facture 29-10 / 22910263",
      },
    ],
  },
  {
    clientKey: "prosperity",
    number: "FAC-122",
    legacyNumber: "FAC-05-2",
    status: "PAYEE",
    issuedAt: "2026-09-28",
    totalHt: 360000,
    totalVat: 64800,
    totalTtc: 424000,
    amountPaid: 424000,
    object: "Branding & identité visuelle",
    sourceDocument: "docs/FACTURE PROSPERITY MANAGEMENT.pdf",
    notes:
      "NEEDS_REVIEW:PROSPERITY_122_TTC_VS_HT_PLUS_VAT_800 — TTC fichier 424000 (HT+TVA=424800) ; FAC-143 non seedé. NEEDS_REVIEW:PROSPERITY_387K_VS_122 — humain a cité 387000 pour FAC-122 ; 387000 = TTC FAC-22710262 (récap), pas 424000. Reste Excel 124000 absorbé dans récap 22710262 (report) pour solde client 0.",
    lines: [
      {
        label: "Branding & identité visuelle",
        qty: 3,
        unitPrice: 120000,
        vatRate: 18,
      },
    ],
    payments: [
      {
        amount: 300000,
        paidAt: "2026-09-28",
        method: "Chèque",
        note: "Excel FAC-122 encaissé 300000",
      },
      {
        amount: 124000,
        paidAt: "2026-10-23",
        method: "Report facture",
        reference: "FAC-22710262",
        note: "Reste Excel absorbé dans récap FAC-22710262 (387000) — pas un 2e encaissement cash de 124000",
      },
    ],
  },
  {
    clientKey: "prosperity",
    number: "FAC-22710262",
    status: "PAYEE",
    issuedAt: "2026-10-23",
    totalHt: 387000,
    totalVat: 0,
    totalTtc: 387000,
    amountPaid: 387000,
    object: "Solde récap 121+122 (Excel / récap 27-10)",
    sourceDocument: "docs/FACTURE  PROSPERITY MANAGEMENT 27-10-2026.docx",
    notes:
      "Décision G — 387000 match TTC de cette facture (pas FAC-122=424000). Excel + confirmation : Payée chèque 000038 le 2026-10-30 (humain a pu écrire 30/11 — retenu 30/10 docs). FAC-121 sans fichier dédié non seedé.",
    lines: [
      {
        label: "Solde à payer (récap branding / charte / RS / site)",
        qty: 1,
        unitPrice: 387000,
        vatRate: 0,
      },
    ],
    payments: [
      {
        amount: 387000,
        paidAt: "2026-10-30",
        method: "Chèque",
        reference: "000038",
        note: "Excel FAC-22710262 + confirmation Direction (387000)",
      },
    ],
  },
];

/** Soldes client attendus après seed (décision G — 2026-11-10). */
export const SV_SEED_EXPECTED_CLIENT_REMAINING: Record<string, number> = {
  bomoyi: 0,
  delmorian: 0,
  isdalinia: 0,
  koundji: 0,
  ecosol: 153600, // 22910263 : 413600 − 260000 ; FAC-155 soldée via report
  prosperity: 0,
};

export const SV_SEED_CONTRACTS: SeedContract[] = [
  {
    clientKey: "ecosol",
    title: "Contrat de prestation de services — Gestion des Réseaux Sociaux",
    partyName: "ECOSOL · Aboubacar DOUCOURE",
    effectiveFrom: "2026-07-01",
    durationNote: "3 mois, renouvelable mensuel, préavis 30 jours",
    monthlyAmount: 200000,
    sourceDocument: "docs/CONTRAT DE PRESTATION DE SERVICES.pdf",
    notes:
      "NEEDS_REVIEW:ECOSOL_CONTRACT_OFFER_CHECKBOX — montant mensuel OCR 200000 ; case offre ambiguë",
  },
  {
    clientKey: "koundji",
    title:
      "Contrat d’engagement — Cahier des charges Site Vitrine & Charte graphique",
    partyName: "KOUNDJI SERVICES · M. TRAORÉ",
    effectiveFrom: "2026-04-01",
    durationNote: "Avril 2026 · durée estimée ~3 semaines",
    monthlyAmount: null,
    sourceDocument: "docs/CONTRAT D'ENGAGEMENT.pdf",
    notes: "Montants contractuels OCR partiels — se fier à FAC-114",
  },
];

/** 34 sorties — inventaire §4.1 (somme 473000). */
export const SV_SEED_MOVEMENTS: {
  reference: string;
  movedAt: string;
  category: string;
  description: string;
  clientProject?: string;
  amount: number;
  paidBy: string;
  paymentMethod?: string;
}[] = [
  {
    reference: "MSK-yy10dd-0001",
    movedAt: "2026-10-02",
    category: "Transport / carburant",
    description: "Ecosol recouvrement",
    clientProject: "Ecosol",
    amount: 2000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0002",
    movedAt: "2026-10-06",
    category: "Prospection / RDV",
    description: "Teravie (prospect Yaye Bah)",
    clientProject: "Teravie",
    amount: 8000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0003",
    movedAt: "2026-10-07",
    category: "Transport",
    description: "Banque Coris",
    amount: 2000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0004",
    movedAt: "2026-10-07",
    category: "Prospection / RDV",
    description: "Niuma Beliza",
    clientProject: "Niuma Beliza",
    amount: 3500,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0005",
    movedAt: "2026-10-08",
    category: "Transport",
    description: "Ecosol tournage",
    clientProject: "Ecosol",
    amount: 4000,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy10dd-0006",
    movedAt: "2026-10-10",
    category: "Transport",
    description: "Banque Coris versement",
    amount: 4000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0007",
    movedAt: "2026-10-10",
    category: "Banque / transfert",
    description: "Versement Coris",
    amount: 70000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0008",
    movedAt: "2026-10-12",
    category: "Repas / eau",
    description: "Pain",
    amount: 500,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0009",
    movedAt: "2026-10-12",
    category: "Transport",
    description: "Koundji",
    clientProject: "Koundji Services",
    amount: 3000,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy10dd-0010",
    movedAt: "2026-10-14",
    category: "Transport",
    description: "China Mall",
    amount: 2000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0011",
    movedAt: "2026-10-14",
    category: "Fournitures",
    description: "Achats China Mall",
    amount: 16500,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0012",
    movedAt: "2026-10-15",
    category: "Transport",
    description: "Ecosol tournage",
    clientProject: "Ecosol",
    amount: 1000,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy10dd-0013",
    movedAt: "2026-10-16",
    category: "Transport",
    description: "PPM",
    clientProject: "PPM",
    amount: 2000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0014",
    movedAt: "2026-10-16",
    category: "Transport",
    description: "Imprimerie cartes",
    amount: 1000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0015",
    movedAt: "2026-10-16",
    category: "Téléphone / Internet",
    description: "Internet Espoir",
    amount: 7000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0016",
    movedAt: "2026-10-20",
    category: "Transport",
    description: "INPS",
    amount: 1500,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0017",
    movedAt: "2026-10-21",
    category: "Transport",
    description: "INPS",
    amount: 1500,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0018",
    movedAt: "2026-10-22",
    category: "Transport",
    description: "Ecosol tournage",
    clientProject: "Ecosol",
    amount: 3000,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy10dd-0019",
    movedAt: "2026-10-23",
    category: "Transport",
    description: "PPM",
    clientProject: "PPM",
    amount: 4500,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy10dd-0020",
    movedAt: "2026-10-27",
    category: "Transport",
    description: "Koundji",
    clientProject: "Koundji Services",
    amount: 2000,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy10dd-0021",
    movedAt: "2026-10-28",
    category: "Transport",
    description: "Koundji terrain",
    clientProject: "Koundji Services",
    amount: 7000,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy10dd-0022",
    movedAt: "2026-10-28",
    category: "Transport",
    description: "Koundji recouvrement",
    clientProject: "Koundji Services",
    amount: 4000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0023",
    movedAt: "2026-10-29",
    category: "Transport",
    description: "Ecosol tournage",
    clientProject: "Ecosol",
    amount: 1000,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy10dd-0024",
    movedAt: "2026-10-29",
    category: "Salaires",
    description: "Paie Fatimatou",
    amount: 165000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0025",
    movedAt: "2026-10-29",
    category: "Salaires",
    description: "Paie Djouldé Keita",
    amount: 70000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0026",
    movedAt: "2026-10-29",
    category: "Salaires",
    description: "Paie Yaye Bah",
    amount: 70000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy10dd-0027",
    movedAt: "2026-10-30",
    category: "Transport",
    description: "Prosperity Travel",
    clientProject: "Prosperity Management",
    amount: 2000,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy11dd-0028",
    movedAt: "2026-11-02",
    category: "Transport",
    description: "Prosperity BTP",
    clientProject: "Prosperity Management",
    amount: 2000,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy11dd-0029",
    movedAt: "2026-11-03",
    category: "Transport",
    description: "INPS",
    amount: 1000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy11dd-0030",
    movedAt: "2026-11-03",
    category: "Transport",
    description: "Banque Coris",
    amount: 1000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy11dd-0031",
    movedAt: "2026-11-04",
    category: "Transport",
    description: "Banque Coris",
    amount: 1000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy11dd-0032",
    movedAt: "2026-11-04",
    category: "Banque / transfert",
    description: "Money Gram Espoir",
    amount: 2000,
    paidBy: "Guiro",
  },
  {
    reference: "MSK-yy11dd-0033",
    movedAt: "2026-11-05",
    category: "Transport",
    description: "Ecosol tournage",
    clientProject: "Ecosol",
    amount: 3000,
    paidBy: "Fatimatou",
  },
  {
    reference: "MSK-yy11dd-0034",
    movedAt: "2026-11-06",
    category: "Transport",
    description: "Prosperity tournage",
    clientProject: "Prosperity Management",
    amount: 5000,
    paidBy: "Fatimatou",
  },
];

/** 32 articles — inventaire §5.2. */
export const SV_SEED_STOCK: {
  code: string;
  family: string;
  label: string;
  unit: string;
  quantity: number;
  location?: string;
}[] = [
  { code: "PAP-001", family: "Papeterie", label: "Papier A4 80g", unit: "Ramette", quantity: 1, location: "Armoire 1" },
  { code: "PAP-002", family: "Papeterie", label: "Bloc-notes", unit: "Unité", quantity: 0 },
  { code: "PAP-003", family: "Papeterie", label: "Cahier 100 pages", unit: "Unité", quantity: 0 },
  { code: "PAP-004", family: "Papeterie", label: "Post-it", unit: "Bloc", quantity: 0 },
  { code: "PAP-006", family: "Papeterie", label: "Chemise cartonnée Deli", unit: "Unité", quantity: 8, location: "Armoire 1" },
  { code: "PAP-007", family: "Papeterie", label: "Pochette plastique", unit: "Paquet", quantity: 2, location: "Armoire 1" },
  { code: "ECR-001", family: "Écriture", label: "Stylo bleu", unit: "Unité", quantity: 3, location: "Armoire 1" },
  { code: "ECR-002", family: "Écriture", label: "Stylo noir", unit: "Unité", quantity: 4, location: "Armoire 1" },
  { code: "ECR-003", family: "Écriture", label: "Stylo rouge", unit: "Unité", quantity: 2, location: "Armoire 1" },
  { code: "ECR-004", family: "Écriture", label: "Crayon à papier", unit: "Unité", quantity: 0 },
  { code: "ECR-006", family: "Écriture", label: "Marqueur permanent", unit: "Unité", quantity: 0 },
  { code: "BUR-001", family: "Bureau", label: "Agrafeuse", unit: "Unité", quantity: 1, location: "Armoire 2" },
  { code: "BUR-002", family: "Bureau", label: "Agrafes", unit: "Boîte", quantity: 1, location: "Armoire 1" },
  { code: "BUR-003", family: "Bureau", label: "Perforateur", unit: "Unité", quantity: 0 },
  { code: "BUR-004", family: "Bureau", label: "Ciseaux", unit: "Unité", quantity: 0 },
  { code: "BUR-005", family: "Bureau", label: "Cutter", unit: "Unité", quantity: 0 },
  { code: "BUR-007", family: "Bureau", label: "Scotch", unit: "Rouleau", quantity: 1, location: "Armoire 1" },
  { code: "BUR-008", family: "Bureau", label: "Élastiques", unit: "Paquet", quantity: 0, location: "Armoire 2" },
  { code: "ALI-001", family: "Alimentaire", label: "Sucre", unit: "Paquet", quantity: 0 },
  { code: "ALI-002", family: "Alimentaire", label: "Thé", unit: "Boîte", quantity: 0 },
  { code: "ALI-003", family: "Alimentaire", label: "Café", unit: "Paquet", quantity: 0 },
  { code: "HYI-002", family: "Hygiène", label: "Essuie-tout", unit: "Rouleau", quantity: 0 },
  { code: "HYI-003", family: "Hygiène", label: "Mouchoirs", unit: "Boîte", quantity: 0 },
  { code: "HYI-004", family: "Hygiène", label: "Savon lave vitre", unit: "Bidon", quantity: 1, location: "Armoire 2" },
  { code: "HYI-005", family: "Hygiène", label: "Savon liquide lave", unit: "Bidon", quantity: 1, location: "Armoire 2" },
  { code: "HYI-006", family: "Hygiène", label: "Désodorisant", unit: "Unité", quantity: 0 },
  { code: "HYI-007", family: "Hygiène", label: "Gel", unit: "Flacon", quantity: 0 },
  { code: "HYI-008", family: "Hygiène", label: "Sac poubelle", unit: "Rouleau", quantity: 2, location: "Armoire 2" },
  { code: "NET-001", family: "Entretien", label: "Eau de javel", unit: "Bidon", quantity: 3, location: "Armoire 2" },
  { code: "INF-001", family: "Informatique", label: "Toner", unit: "Unité", quantity: 0 },
  { code: "INF-002", family: "Informatique", label: "Cartouche", unit: "Unité", quantity: 0 },
  { code: "INF-003", family: "Informatique", label: "Piles AA", unit: "Paquet", quantity: 0 },
  { code: "DIV-002", family: "Divers", label: "Étiquettes", unit: "Paquet", quantity: 0 },
];
