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
 * Règles :
 * - Review Collab* (smoke review-superadmin) → delete safe + contrats Cascade + GED COLLAB*_REVIEW
 * - Awa Traore + suffixe numérique (smoke-ui) → delete safe
 * - Test Guiro → CONSERVER
 * - Yaye Bah doublon / Awa réelle ambiguë → NE PAS SUPPRIMER (rapport humain)
 */
import { createPrisma } from "@/lib/create-prisma";

const prisma = createPrisma({ max: 1 });

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
    if (row.email?.toLowerCase() === "y.bah@mskcreation.net" && row.userId) {
      return { decision: "keep", reason: "Yaye Bah réelle (compte MSK ACTIVE)" };
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

async function main() {
  const apply = process.env.CONFIRM_DELETE === "YES";
  console.log(apply ? "MODE APPLY (CONFIRM_DELETE=YES)" : "MODE DRY-RUN");

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

  if (!apply) {
    console.log(
      "\nDry-run terminé. Pour appliquer : CONFIRM_DELETE=YES …",
    );
    await prisma.$disconnect();
    return;
  }

  const deletedIds: string[] = [];
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

  console.log("\n=== APPLIED ===");
  console.log(JSON.stringify({ deletedIds, gedDeleted, ambiguousLeft: amb }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
