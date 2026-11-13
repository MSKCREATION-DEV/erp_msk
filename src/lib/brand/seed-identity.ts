import { prisma } from "@/lib/prisma";
import { colors } from "@/lib/brand";

/** Seed idempotent — palette référence + logos public/brand + typos système + config. */
export async function seedBrandIdentity() {
  const logoDefs = [
    {
      code: "logo-white",
      label: "Logo blanc",
      kind: "BLANC" as const,
      publicPath: "/brand/logo-white.svg",
      mime: "image/svg+xml",
      isDefaultDocuments: false,
      sortOrder: 10,
    },
    {
      code: "mark-white",
      label: "Signe blanc",
      kind: "SYMBOLE" as const,
      publicPath: "/brand/mark-white.svg",
      mime: "image/svg+xml",
      isDefaultDocuments: false,
      sortOrder: 20,
    },
    {
      code: "lockup-bloc",
      label: "Lockup bloc",
      kind: "COMPACT" as const,
      publicPath: "/brand/lockup-bloc.png",
      mime: "image/png",
      isDefaultDocuments: false,
      sortOrder: 30,
    },
    {
      code: "lockup",
      label: "Lockup documents",
      kind: "DOCUMENTS" as const,
      publicPath: "/brand/lockup.png",
      mime: "image/png",
      isDefaultDocuments: true,
      sortOrder: 1,
    },
  ];

  for (const def of logoDefs) {
    await prisma.brandLogo.upsert({
      where: { code: def.code },
      create: {
        ...def,
        status: "ACTIVE",
      },
      update: {
        label: def.label,
        kind: def.kind,
        publicPath: def.publicPath,
        mime: def.mime,
        status: "ACTIVE",
        sortOrder: def.sortOrder,
      },
    });
  }

  // Un seul défaut documents (partial unique)
  const defaultLogo = await prisma.brandLogo.findUnique({
    where: { code: "lockup" },
  });
  if (defaultLogo) {
    await prisma.$transaction([
      prisma.brandLogo.updateMany({
        where: { isDefaultDocuments: true, NOT: { id: defaultLogo.id } },
        data: { isDefaultDocuments: false },
      }),
      prisma.brandLogo.update({
        where: { id: defaultLogo.id },
        data: { isDefaultDocuments: true, status: "ACTIVE" },
      }),
      prisma.brandConfiguration.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          defaultDocumentsLogoId: defaultLogo.id,
          settingsJson: {},
        },
        update: { defaultDocumentsLogoId: defaultLogo.id },
      }),
    ]);
  }

  const colorDefs = [
    {
      tokenKey: "msk-blue",
      label: "Bleu MSK",
      hex: colors.blue,
      category: "MARQUE" as const,
      usageNotes: "Primary / CTA / liens",
      isReference: true,
      sortOrder: 1,
    },
    {
      tokenKey: "msk-ink",
      label: "Encre",
      hex: colors.ink,
      category: "MARQUE" as const,
      usageNotes: "Texte / fonds sombres",
      isReference: true,
      sortOrder: 2,
    },
    {
      tokenKey: "msk-coral",
      label: "Corail",
      hex: colors.coral,
      category: "MARQUE" as const,
      usageNotes: "Accent ≤ 10 % — actions danger",
      isReference: true,
      sortOrder: 3,
    },
    {
      tokenKey: "msk-chalk",
      label: "Craie",
      hex: colors.chalk,
      category: "INTERFACE" as const,
      usageNotes: "Fond pages",
      isReference: true,
      sortOrder: 4,
    },
    {
      tokenKey: "msk-paper",
      label: "Papier",
      hex: colors.paper,
      category: "INTERFACE" as const,
      usageNotes: "Surfaces secondaires",
      isReference: true,
      sortOrder: 5,
    },
    {
      tokenKey: "msk-muted",
      label: "Muted",
      hex: colors.muted,
      category: "INTERFACE" as const,
      usageNotes: "Texte secondaire",
      isReference: true,
      sortOrder: 6,
    },
    {
      tokenKey: "msk-gradient-from",
      label: "Dégradé — départ",
      hex: colors.gradientFrom,
      category: "DOCUMENTAIRE" as const,
      usageNotes: "Grands formats, fonds clairs uniquement",
      isReference: true,
      sortOrder: 10,
    },
    {
      tokenKey: "msk-gradient-to",
      label: "Dégradé — arrivée",
      hex: colors.gradientTo,
      category: "DOCUMENTAIRE" as const,
      usageNotes: "Grands formats, fonds clairs uniquement",
      isReference: true,
      sortOrder: 11,
    },
  ];

  for (const c of colorDefs) {
    await prisma.brandColor.upsert({
      where: { tokenKey: c.tokenKey },
      create: { ...c, status: "ACTIVE" },
      update: {
        label: c.label,
        hex: c.hex,
        category: c.category,
        usageNotes: c.usageNotes,
        isReference: c.isReference,
        sortOrder: c.sortOrder,
        status: "ACTIVE",
      },
    });
  }

  const typos = [
    {
      code: "jost-ui",
      familyName: "Jost",
      role: "UI" as const,
      isDefaultErp: true,
      isDefaultPdf: false,
      cssStack: "var(--font-jost), ui-sans-serif, system-ui, sans-serif",
      notes: "Typo UI ERP (locale)",
      sortOrder: 1,
    },
    {
      code: "bricolage-impact",
      familyName: "Bricolage Grotesque",
      role: "IMPACT" as const,
      isDefaultErp: false,
      isDefaultPdf: false,
      cssStack: "var(--font-bricolage), ui-sans-serif, system-ui, sans-serif",
      notes: "Une ligne d’impact / bloc — jamais < 40 px",
      sortOrder: 2,
    },
    {
      code: "instrument-accent",
      familyName: "Instrument Serif",
      role: "ACCENT" as const,
      isDefaultErp: false,
      isDefaultPdf: false,
      cssStack: "var(--font-instrument), Georgia, serif",
      notes: "Un seul mot d’accent par titre",
      sortOrder: 3,
    },
    {
      code: "helvetica-pdf",
      familyName: "Helvetica",
      role: "PDF" as const,
      isDefaultErp: false,
      isDefaultPdf: true,
      cssStack: "Helvetica, Arial, sans-serif",
      notes: "Standard pdf-lib (pas de fontkit custom pour l’instant)",
      sortOrder: 4,
    },
  ];

  for (const t of typos) {
    await prisma.brandTypography.upsert({
      where: { code: t.code },
      create: { ...t, status: "ACTIVE" },
      update: {
        familyName: t.familyName,
        role: t.role,
        isDefaultErp: t.isDefaultErp,
        isDefaultPdf: t.isDefaultPdf,
        cssStack: t.cssStack,
        notes: t.notes,
        sortOrder: t.sortOrder,
        status: "ACTIVE",
      },
    });
  }
}
