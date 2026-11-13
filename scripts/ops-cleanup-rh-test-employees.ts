/**
 * One-shot PROD — inventaire + purge ciblée fiches RH test (picker Suivi).
 *
 * Usage :
 *   # Inventaire + dry-run (aucune écriture)
 *   npx tsx --env-file=.env.local scripts/ops-cleanup-rh-test-employees.ts
 *
 *   # Appliquer uniquement les deletes « safe » (Review Collab*, Awa Traore+digits)
 *   CONFIRM_DELETE=YES npx tsx --env-file=.env.local scripts/ops-cleanup-rh-test-employees.ts
 *
 *   # Purge explicite doublon Yaye Bah orphelin (ordre humain 2026-11-13)
 *   CONFIRM_DELETE_YAYE_ORPHAN=YES npx tsx --env-file=.env.local scripts/ops-cleanup-rh-test-employees.ts
 *
 * Règles :
 * - Review Collab* (smoke review-superadmin) → delete safe + contrats Cascade + GED COLLAB*_REVIEW
 * - Awa Traore + suffixe numérique (smoke-ui) → delete safe
 * - Test Guiro → CONSERVER
 * - Yaye Bah réelle `y.bah@mskcreation.net` → JAMAIS toucher (Auth / fiche / GED BAH_YAYE)
 * - Doublon Yaye orphelin `pro.asguiro@gmail.com` sans userId → uniquement si CONFIRM_DELETE_YAYE_ORPHAN=YES
 * - GED : supprimer docs / DocumentLink liés à l’orphelin ; NE PAS supprimer le dossier `BAH_YAYE` (slug partagé)
 */
import { createPrisma } from "@/lib/create-prisma";

const prisma = createPrisma({ max: 1 });

/** Empreinte figée — ordre humain explicite (ne pas élargir). */
const YAYE_ORPHAN = {
  id: "cmv23h1k1006bvbc2il1lkaf2",
  email: "pro.asguiro@gmail.com",
} as const;

const YAYE_REAL_EMAIL = "y.bah@mskcreation.net";

type RelationCounts = {
  contracts: number;
  leaves: number;
  absences: number;
  timesheets: number;
  payslips: number;
  inps: number;
  profileChanges: number;
  leaveMovements: number;
  svAbsences: number;
  svLates: number;
  reports: number;
};

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  jobTitle: string | null;
  userId: string | null;
  createdAt: Date;
  decision: "keep" | "delete_safe" | "ambiguous";
  reason: string;
  relations: RelationCounts;
};

async function countRelations(employeeId: string): Promise<RelationCounts> {
  const [
    contracts,
    leaves,
    absences,
    timesheets,
    payslips,
    inps,
    profileChanges,
    leaveMovements,
    svAbsences,
    svLates,
    reports,
  ] = await Promise.all([
    prisma.rhContract.count({ where: { employeeId } }),
    prisma.rhLeaveRequest.count({ where: { employeeId } }),
    prisma.rhAbsence.count({ where: { employeeId } }),
    prisma.rhTimesheet.count({ where: { employeeId } }),
    prisma.rhPayslip.count({ where: { employeeId } }),
    prisma.rhInpsLine.count({ where: { employeeId } }),
    prisma.rhProfileChangeRequest.count({ where: { employeeId } }),
    prisma.rhLeaveMovement.count({ where: { employeeId } }),
    prisma.svAbsence.count({ where: { employeeId } }),
    prisma.svLate.count({ where: { employeeId } }),
    prisma.rhEmployee.count({ where: { managerEmployeeId: employeeId } }),
  ]);
  return {
    contracts,
    leaves,
    absences,
    timesheets,
    payslips,
    inps,
    profileChanges,
    leaveMovements,
    svAbsences,
    svLates,
    reports,
  };
}

function classify(row: {
  firstName: string;
  lastName: string;
  email: string | null;
  userId: string | null;
  jobTitle: string | null;
}): { decision: Candidate["decision"]; reason: string } {
  const full = `${row.firstName} ${row.lastName}`.trim();

  if (
    row.firstName.toLowerCase() === "test" &&
    row.lastName.toLowerCase() === "guiro"
  ) {
    return { decision: "keep", reason: "Test Guiro — conservation demandée" };
  }

  if (
    /^review$/i.test(row.firstName) &&
    /^collab\d+$/i.test(row.lastName) &&
    !row.userId &&
    !row.email
  ) {
    return {
      decision: "delete_safe",
      reason: "Artefact smoke review-superadmin (Review CollabNNNN)",
    };
  }

  if (
    /^awa$/i.test(row.firstName) &&
    /^traore\d+$/i.test(row.lastName) &&
    !row.userId &&
    !row.email
  ) {
    return {
      decision: "delete_safe",
      reason: "Artefact smoke-ui (Awa Traore + stamp numérique)",
    };
  }

  if (/^yaye$/i.test(row.firstName) && /^bah$/i.test(row.lastName)) {
    if (row.email?.toLowerCase() === YAYE_REAL_EMAIL && row.userId) {
      return { decision: "keep", reason: "Yaye Bah réelle (compte MSK ACTIVE)" };
    }
    // Classé ici ; le delete réel exige CONFIRM_DELETE_YAYE_ORPHAN + empreinte id/email.
    if (
      !row.userId &&
      row.email?.toLowerCase() === YAYE_ORPHAN.email
    ) {
      return {
        decision: "ambiguous",
        reason:
          "Doublon Yaye Bah orphelin (pro.asguiro@gmail.com, sans userId) — CONFIRM_DELETE_YAYE_ORPHAN=YES",
      };
    }
    return {
      decision: "ambiguous",
      reason: `Doublon Yaye Bah (${full}, email=${row.email ?? "∅"}, userId=${row.userId ?? "∅"}) — trancher humain`,
    };
  }

  if (/^awa$/i.test(row.firstName) && /^traore$/i.test(row.lastName)) {
    return {
      decision: "ambiguous",
      reason: "Awa Traore sans suffixe — possible collab réelle",
    };
  }

  return {
    decision: "ambiguous",
    reason: "Candidat inventaire hors patterns delete_safe",
  };
}

async function inventory(): Promise<Candidate[]> {
  const rows = await prisma.rhEmployee.findMany({
    where: {
      OR: [
        { firstName: { equals: "Review", mode: "insensitive" } },
        { lastName: { startsWith: "Collab", mode: "insensitive" } },
        {
          firstName: { equals: "Awa", mode: "insensitive" },
          lastName: { startsWith: "Traore", mode: "insensitive" },
        },
        {
          firstName: { equals: "Yaye", mode: "insensitive" },
          lastName: { equals: "Bah", mode: "insensitive" },
        },
        {
          firstName: { equals: "Test", mode: "insensitive" },
          lastName: { equals: "Guiro", mode: "insensitive" },
        },
      ],
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
      userId: true,
      createdAt: true,
    },
  });

  const out: Candidate[] = [];
  for (const row of rows) {
    const { decision, reason } = classify(row);
    const relations = await countRelations(row.id);
    // Garde-fou : svAbsences/svLates Restrict → jamais delete auto si > 0
    let finalDecision = decision;
    let finalReason = reason;
    if (
      decision === "delete_safe" &&
      (relations.svAbsences > 0 || relations.svLates > 0)
    ) {
      finalDecision = "ambiguous";
      finalReason = `${reason} — BLOQUÉ (svAbsences/svLates Restrict)`;
    }
    out.push({ ...row, decision: finalDecision, reason: finalReason, relations });
  }
  return out;
}

async function listReviewGedRoots() {
  return prisma.documentFolder.findMany({
    where: {
      OR: [
        { code: { startsWith: "COLLAB", mode: "insensitive" } },
        { path: { contains: "_REVIEW" } },
      ],
      parent: { code: "05_COLLABORATEURS" },
    },
    select: {
      id: true,
      name: true,
      code: true,
      path: true,
      _count: { select: { documents: true, children: true } },
    },
  });
}

async function deleteGedSubtree(rootId: string) {
  // Docs dans l’arbre (path prefix via children recursive : deleteMany par folderId)
  const all = await prisma.documentFolder.findMany({
    where: {
      OR: [
        { id: rootId },
        { path: { startsWith: (await prisma.documentFolder.findUniqueOrThrow({ where: { id: rootId } })).path } },
      ],
    },
    select: { id: true, path: true },
  });
  const ids = all.map((f) => f.id);
  const docs = await prisma.document.deleteMany({
    where: { folderId: { in: ids } },
  });
  // Enfants d’abord (FK parent) — Cascade parent→children aussi, delete root suffit
  const deleted = await prisma.documentFolder.delete({ where: { id: rootId } });
  return { docs: docs.count, root: deleted.path };
}

async function deleteEmployeeSafe(c: Candidate) {
  if (c.decision !== "delete_safe") {
    throw new Error(`Refuse delete non-safe: ${c.id}`);
  }
  // Contrats / RH enfants Cascades ; sv* déjà vérifiés à 0
  const deleted = await prisma.rhEmployee.delete({ where: { id: c.id } });
  return deleted.id;
}

type OrphanDeleteReport = {
  verified: {
    id: string;
    email: string | null;
    userId: string | null;
    name: string;
  };
  deleted: {
    svAbsences: number;
    svLates: number;
    managersCleared: number;
    documentLinks: number;
    documents: number;
    inps: number;
    payslips: number;
    contracts: number;
    leaves: number;
    absences: number;
    timesheets: number;
    profileChanges: number;
    leaveMovements: number;
    employee: number;
  };
  preserved: {
    realYayeId: string;
    realYayeEmail: string;
    realYayeUserId: string;
    bahYayeFolderKept: boolean;
  };
};

async function assertAndDeleteYayeOrphan(): Promise<OrphanDeleteReport> {
  const emp = await prisma.rhEmployee.findUnique({
    where: { id: YAYE_ORPHAN.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      userId: true,
      avatarDocumentId: true,
    },
  });

  if (!emp) {
    throw new Error(`Orphelin introuvable: ${YAYE_ORPHAN.id}`);
  }
  if (emp.userId) {
    throw new Error(
      `ABORT: employee ${emp.id} a un userId=${emp.userId} — pas un orphelin`,
    );
  }
  if (emp.email?.toLowerCase() !== YAYE_ORPHAN.email) {
    throw new Error(
      `ABORT: email attendu ${YAYE_ORPHAN.email}, trouvé ${emp.email ?? "∅"}`,
    );
  }
  if (
    !/^yaye$/i.test(emp.firstName) ||
    !/^bah$/i.test(emp.lastName)
  ) {
    throw new Error(
      `ABORT: nom inattendu ${emp.firstName} ${emp.lastName}`,
    );
  }

  const real = await prisma.rhEmployee.findFirst({
    where: {
      email: { equals: YAYE_REAL_EMAIL, mode: "insensitive" },
      userId: { not: null },
    },
    select: { id: true, email: true, userId: true },
  });
  if (!real?.userId) {
    throw new Error(
      `ABORT: Yaye réelle ${YAYE_REAL_EMAIL} introuvable — stop purge`,
    );
  }
  if (real.id === YAYE_ORPHAN.id) {
    throw new Error("ABORT: empreinte orphelin = Yaye réelle");
  }

  const bahYaye = await prisma.documentFolder.findFirst({
    where: { path: "/2026/05_COLLABORATEURS/BAH_YAYE" },
    select: { id: true, path: true },
  });

  const contracts = await prisma.rhContract.findMany({
    where: { employeeId: YAYE_ORPHAN.id },
    select: { id: true, gedDocumentId: true },
  });
  const payslips = await prisma.rhPayslip.findMany({
    where: { employeeId: YAYE_ORPHAN.id },
    select: { id: true, gedDocumentId: true },
  });
  const inpsRows = await prisma.rhInpsLine.findMany({
    where: { employeeId: YAYE_ORPHAN.id },
    select: { id: true },
  });
  const entityIds = [
    YAYE_ORPHAN.id,
    ...contracts.map((c) => c.id),
    ...payslips.map((p) => p.id),
    ...inpsRows.map((i) => i.id),
  ];
  const links = await prisma.documentLink.findMany({
    where: { entityId: { in: entityIds } },
    select: { id: true, documentId: true },
  });

  const docIds = new Set<string>();
  for (const l of links) docIds.add(l.documentId);
  for (const c of contracts) {
    if (c.gedDocumentId) docIds.add(c.gedDocumentId);
  }
  for (const p of payslips) {
    if (p.gedDocumentId) docIds.add(p.gedDocumentId);
  }
  if (emp.avatarDocumentId) docIds.add(emp.avatarDocumentId);

  console.log("\n=== PURGE YAYE ORPHELIN — préflight ===");
  console.log(
    JSON.stringify(
      {
        orphan: {
          id: emp.id,
          email: emp.email,
          userId: emp.userId,
          name: `${emp.firstName} ${emp.lastName}`,
        },
        realKept: real,
        relationPreview: {
          contracts: contracts.length,
          payslips: payslips.length,
          inps: inpsRows.length,
          documentLinks: links.length,
          documents: docIds.size,
        },
        bahYayeFolder: bahYaye?.path ?? null,
        note: "Dossier BAH_YAYE conservé (slug partagé avec Yaye réelle)",
      },
      null,
      2,
    ),
  );

  const deleted = {
    svAbsences: 0,
    svLates: 0,
    managersCleared: 0,
    documentLinks: 0,
    documents: 0,
    inps: 0,
    payslips: 0,
    contracts: 0,
    leaves: 0,
    absences: 0,
    timesheets: 0,
    profileChanges: 0,
    leaveMovements: 0,
    employee: 0,
  };

  await prisma.$transaction(async (tx) => {
    // Restrict Suivi — supprimer avant employee
    deleted.svAbsences = (
      await tx.svAbsence.deleteMany({ where: { employeeId: YAYE_ORPHAN.id } })
    ).count;
    deleted.svLates = (
      await tx.svLate.deleteMany({ where: { employeeId: YAYE_ORPHAN.id } })
    ).count;

    deleted.managersCleared = (
      await tx.rhEmployee.updateMany({
        where: { managerEmployeeId: YAYE_ORPHAN.id },
        data: { managerEmployeeId: null },
      })
    ).count;

    // Docs GED liés à l’orphelin uniquement (pas le dossier BAH_YAYE)
    if (links.length > 0) {
      deleted.documentLinks = (
        await tx.documentLink.deleteMany({
          where: { id: { in: links.map((l) => l.id) } },
        })
      ).count;
    }
    if (docIds.size > 0) {
      // Nettoyer refs FK optionnelles avant delete docs
      await tx.rhContract.updateMany({
        where: {
          employeeId: YAYE_ORPHAN.id,
          gedDocumentId: { in: [...docIds] },
        },
        data: { gedDocumentId: null },
      });
      await tx.rhPayslip.updateMany({
        where: {
          employeeId: YAYE_ORPHAN.id,
          gedDocumentId: { in: [...docIds] },
        },
        data: { gedDocumentId: null },
      });
      await tx.rhEmployee.update({
        where: { id: YAYE_ORPHAN.id },
        data: { avatarDocumentId: null },
      });
      // Liens restants éventuels sur ces docs
      await tx.documentLink.deleteMany({
        where: { documentId: { in: [...docIds] } },
      });
      deleted.documents = (
        await tx.document.deleteMany({ where: { id: { in: [...docIds] } } })
      ).count;
    }

    // Counts explicites avant cascade employee (audit)
    deleted.inps = (
      await tx.rhInpsLine.deleteMany({ where: { employeeId: YAYE_ORPHAN.id } })
    ).count;
    deleted.payslips = (
      await tx.rhPayslip.deleteMany({ where: { employeeId: YAYE_ORPHAN.id } })
    ).count;
    deleted.contracts = (
      await tx.rhContract.deleteMany({ where: { employeeId: YAYE_ORPHAN.id } })
    ).count;
    deleted.leaves = (
      await tx.rhLeaveRequest.deleteMany({
        where: { employeeId: YAYE_ORPHAN.id },
      })
    ).count;
    deleted.absences = (
      await tx.rhAbsence.deleteMany({ where: { employeeId: YAYE_ORPHAN.id } })
    ).count;
    deleted.timesheets = (
      await tx.rhTimesheet.deleteMany({ where: { employeeId: YAYE_ORPHAN.id } })
    ).count;
    deleted.profileChanges = (
      await tx.rhProfileChangeRequest.deleteMany({
        where: { employeeId: YAYE_ORPHAN.id },
      })
    ).count;
    deleted.leaveMovements = (
      await tx.rhLeaveMovement.deleteMany({
        where: { employeeId: YAYE_ORPHAN.id },
      })
    ).count;

    await tx.rhEmployee.delete({ where: { id: YAYE_ORPHAN.id } });
    deleted.employee = 1;
  });

  // Preuve post-delete
  const orphanGone = await prisma.rhEmployee.findUnique({
    where: { id: YAYE_ORPHAN.id },
    select: { id: true },
  });
  if (orphanGone) {
    throw new Error("ABORT post-check: orphelin encore présent");
  }

  const realAfter = await prisma.rhEmployee.findUniqueOrThrow({
    where: { id: real.id },
    select: { id: true, email: true, userId: true, firstName: true, lastName: true },
  });
  const bahAfter = bahYaye
    ? await prisma.documentFolder.findUnique({
        where: { id: bahYaye.id },
        select: { id: true, path: true },
      })
    : null;

  const yayeLeft = await prisma.rhEmployee.findMany({
    where: {
      firstName: { equals: "Yaye", mode: "insensitive" },
      lastName: { equals: "Bah", mode: "insensitive" },
    },
    select: { id: true, email: true, userId: true },
  });

  console.log("\n=== PURGE YAYE ORPHELIN — résultat ===");
  console.log(
    JSON.stringify(
      {
        deleted,
        realAfter,
        bahYayeFolderKept: Boolean(bahAfter),
        yayeBahPickerLeft: yayeLeft,
      },
      null,
      2,
    ),
  );

  if (yayeLeft.length !== 1 || yayeLeft[0].id !== real.id) {
    throw new Error(
      `Picker Yaye Bah inattendu après purge: ${JSON.stringify(yayeLeft)}`,
    );
  }

  return {
    verified: {
      id: emp.id,
      email: emp.email,
      userId: emp.userId,
      name: `${emp.firstName} ${emp.lastName}`,
    },
    deleted,
    preserved: {
      realYayeId: realAfter.id,
      realYayeEmail: realAfter.email ?? "",
      realYayeUserId: realAfter.userId!,
      bahYayeFolderKept: Boolean(bahAfter),
    },
  };
}

async function main() {
  const applySafe = process.env.CONFIRM_DELETE === "YES";
  const applyYayeOrphan = process.env.CONFIRM_DELETE_YAYE_ORPHAN === "YES";
  console.log(
    applySafe || applyYayeOrphan
      ? `MODE APPLY (safe=${applySafe}, yayeOrphan=${applyYayeOrphan})`
      : "MODE DRY-RUN",
  );

  const candidates = await inventory();
  const gedRoots = await listReviewGedRoots();

  console.log("\n=== INVENTAIRE CANDIDATS ===");
  for (const c of candidates) {
    console.log(
      JSON.stringify({
        decision: c.decision,
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        userId: c.userId,
        jobTitle: c.jobTitle,
        reason: c.reason,
        relations: c.relations,
      }),
    );
  }

  console.log("\n=== GED Review (racines sous 05_COLLABORATEURS) ===");
  console.log(JSON.stringify(gedRoots, null, 2));

  const keep = candidates.filter((c) => c.decision === "keep");
  const del = candidates.filter((c) => c.decision === "delete_safe");
  const amb = candidates.filter((c) => c.decision === "ambiguous");

  console.log("\n=== SYNTHÈSE ===");
  console.log(`Conservés : ${keep.length}`);
  console.log(`Delete safe : ${del.length}`);
  console.log(`Ambiguïtés : ${amb.length}`);

  if (!applySafe && !applyYayeOrphan) {
    console.log(
      "\nDry-run terminé. Pour appliquer smoke : CONFIRM_DELETE=YES …",
    );
    console.log(
      "Pour purge Yaye orphelin : CONFIRM_DELETE_YAYE_ORPHAN=YES …",
    );
    await prisma.$disconnect();
    return;
  }

  const deletedIds: string[] = [];
  if (applySafe) {
    for (const c of del) {
      const id = await deleteEmployeeSafe(c);
      deletedIds.push(id);
      console.log(`✓ RH deleted ${c.firstName} ${c.lastName} (${id})`);
    }

    const gedDeleted: string[] = [];
    for (const root of gedRoots) {
      // Uniquement slugs Review clairement test
      if (!/COLLAB\d+_REVIEW/i.test(root.code)) {
        console.log(`⏭ GED skip (code non Review): ${root.code}`);
        continue;
      }
      const r = await deleteGedSubtree(root.id);
      gedDeleted.push(r.root);
      console.log(`✓ GED subtree deleted ${r.root} (docs=${r.docs})`);
    }
    console.log("\n=== APPLIED SAFE ===");
    console.log(
      JSON.stringify({ deletedIds, gedDeleted, ambiguousLeft: amb }, null, 2),
    );
  }

  if (applyYayeOrphan) {
    const report = await assertAndDeleteYayeOrphan();
    console.log("\n=== APPLIED YAYE ORPHAN ===");
    console.log(JSON.stringify(report, null, 2));
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
