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
    status: "PARTIELLE",
    issuedAt: "2026-01-17",
    dueAt: "2026-02-10",
    totalHt: 2097952,
    totalVat: 0,
    totalTtc: 2097952,
    amountPaid: 629386,
    object: "Conception de site vitrine",
    sourceDocument: "docs/FACTURE_ISDALINIA_N° 03.pdf",
    notes:
      "NEEDS_REVIEW:ISDALINIA_DECIMAL_FCFA — acompte PDF 629385,6 → 629386 (somme-conservant) ; reste 1468566",
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
    status: "PARTIELLE",
    issuedAt: "2026-08-05",
    dueAt: "2026-09-04",
    totalHt: 100000,
    totalVat: 18000,
    totalTtc: 118000,
    amountPaid: 100000,
    object: "Abonnement RS Septembre",
    sourceDocument:
      "docs/FACTURE ABNMT M_KOUNDJI_SERVICES FAC-2710261.docx",
    notes:
      "NEEDS_REVIEW:KOUNDJI_117_HT_VS_TTC;NEEDS_REVIEW:KOUNDJI_SEPTEMBER_OVERLAP — Excel FAC-117 encaissé HT 100000 chèque 9587411 ; TVA non documentée payée",
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
    ],
  },
  {
    clientKey: "koundji",
    number: "FAC-167",
    status: "EMISE",
    issuedAt: "2026-10-07",
    dueAt: "2026-11-06",
    totalHt: 200000,
    totalVat: 36000,
    totalTtc: 236000,
    amountPaid: 0,
    object: "Abonnement RS sept + oct",
    sourceDocument: "docs/FACTURE ABNMT M_KOUNDJI_SERVICES.docx",
    notes:
      "NEEDS_REVIEW:KOUNDJI_SEPTEMBER_OVERLAP — ligne 01/09 + 01/10 ; aucun paiement documenté",
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
    payments: [],
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
    status: "PARTIELLE",
    issuedAt: "2026-10-02",
    dueAt: "2026-11-01",
    totalHt: 260000,
    totalVat: 46800,
    totalTtc: 306800,
    amountPaid: 200000,
    object: "Gestion RS PREMIUM + déplacement",
    sourceDocument: "docs/FACTURE_ECOSOLS NVF N°155.docx",
    notes: "NEEDS_REVIEW:ECOSOL_155_EXCEL_MINUS_800",
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
        note: "Excel + report facture 29-10",
      },
    ],
  },
  {
    clientKey: "ecosol",
    number: "22910263",
    status: "EMISE",
    issuedAt: "2026-10-29",
    dueAt: "2026-11-30",
    totalHt: 260000,
    totalVat: 46800,
    totalTtc: 413600,
    amountPaid: 0,
    object: "RS PREMIUM octobre + arriéré sept. 106800",
    sourceDocument: "docs/FACTURE  ECOSOL 29-10-2026.docx",
    notes:
      "Net à payer 413600 = mois TTC 306800 + arriéré 106800 (report FAC-155)",
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
    payments: [],
  },
  {
    clientKey: "prosperity",
    number: "FAC-122",
    legacyNumber: "FAC-05-2",
    status: "PARTIELLE",
    issuedAt: "2026-09-28",
    totalHt: 360000,
    totalVat: 64800,
    totalTtc: 424000,
    amountPaid: 300000,
    object: "Branding & identité visuelle",
    sourceDocument: "docs/FACTURE PROSPERITY MANAGEMENT.pdf",
    notes:
      "NEEDS_REVIEW:PROSPERITY_122_TTC_VS_HT_PLUS_VAT_800 — TTC fichier 424000 (HT+TVA=424800) ; FAC-143 non seedé",
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
      "NEEDS_REVIEW:PROSPERITY_SOLDE_RECAP — Excel Payée chèque 000038 le 2026-10-30 ; FAC-121 sans fichier dédié non seedé",
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
        note: "Excel FAC-22710262",
      },
    ],
  },
];

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
