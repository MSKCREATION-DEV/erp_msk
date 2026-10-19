import {
  CrmActivityType,
  CrmLossReason,
  type PrismaClient,
} from "@prisma/client";
import { normalizeChannelValue } from "@/lib/crm/channels";
import type { MappedImportRow } from "@/lib/crm/import/map-row";
import {
  buildUserIdResolver,
  resolveCreatedById,
  resolveOwnerId,
  type UserIdResolver,
} from "@/lib/crm/import/resolve-users";

export type ApplyImportOpts = {
  prisma: PrismaClient;
  rows: MappedImportRow[];
  /** Acteur / filet si responsable inconnu */
  fallbackUserId: string;
  max?: number;
  dryRun?: boolean;
  usersMapPath?: string;
  /** Parallélisme (défaut 8). Le Set `known` est réservé synchrone anti-doublon. */
  concurrency?: number;
};

export type ApplyImportResult = {
  imported: number;
  duplicates: number;
  skipped: number;
  warnings: string[];
  unresolvedPeople: string[];
};

function channelCreates(phone: string | null, email: string | null) {
  const channels: {
    type: "PHONE" | "EMAIL";
    value: string;
    normalizedValue: string;
    isPrimary: boolean;
  }[] = [];
  if (phone) {
    channels.push({
      type: "PHONE",
      value: phone,
      normalizedValue: normalizeChannelValue("PHONE", phone),
      isPrimary: true,
    });
  }
  if (email) {
    channels.push({
      type: "EMAIL",
      value: email,
      normalizedValue: normalizeChannelValue("EMAIL", email),
      isPrimary: !phone,
    });
  }
  return channels;
}

/** 1–2 round-trips : org+contact+channels+deal, puis activity/task optionnels. */
async function createOneRowNested(
  prisma: PrismaClient,
  row: MappedImportRow,
  ownerId: string,
  createdById: string,
) {
  const channels = channelCreates(row.phone, row.email);
  const occurredAt = row.firstContactAt ?? new Date();

  const org = await prisma.crmOrganization.create({
    data: {
      name: row.orgName,
      normalizedName: row.normalizedName,
      source: row.source,
      notes: row.notes,
      ownerId,
      createdById,
      contacts: {
        create: {
          firstName: row.contactFirst,
          lastName: row.contactLast,
          jobTitle: row.jobTitle,
          phone: row.phone,
          email: row.email,
          isPrimary: true,
          ...(channels.length ? { channels: { create: channels } } : {}),
        },
      },
      opportunities: {
        create: {
          title: row.orgName,
          stage: row.stage,
          source: row.source,
          offerLabel: row.offerLabel,
          budgetXof: row.budgetXof,
          probability: row.probability,
          nextAction: row.nextAction,
          followUpAt: row.followUpAt,
          lastActivityAt: row.lastAction ? occurredAt : row.firstContactAt,
          interestedAt: row.stage === "INTERESSE" ? new Date() : null,
          wonAt: row.stage === "GAGNE" ? new Date() : null,
          lostAt: row.stage === "PERDU" ? new Date() : null,
          lossReason: row.stage === "PERDU" ? CrmLossReason.AUTRE : null,
          ownerId,
          createdById,
          createdAt: row.firstContactAt ?? undefined,
        },
      },
    },
    select: {
      id: true,
      opportunities: { select: { id: true }, take: 1 },
    },
  });

  const dealId = org.opportunities[0]?.id;
  if (!dealId) return;

  const extras: Promise<unknown>[] = [];
  if (row.lastAction) {
    extras.push(
      prisma.crmActivity.create({
        data: {
          organizationId: org.id,
          opportunityId: dealId,
          type: CrmActivityType.NOTE,
          summary: row.lastAction.slice(0, 200),
          body: row.lastAction.length > 200 ? row.lastAction : null,
          actorId: createdById,
          occurredAt,
        },
      }),
    );
  }
  if (row.followUpAt && row.stage !== "GAGNE" && row.stage !== "PERDU") {
    extras.push(
      prisma.crmTask.create({
        data: {
          organizationId: org.id,
          opportunityId: dealId,
          title: row.nextAction || `Relance ${row.orgName}`,
          dueAt: row.followUpAt,
          assigneeId: ownerId,
          createdById,
        },
      }),
    );
  }
  if (extras.length) await Promise.all(extras);
}

export async function applyCrmImport(
  opts: ApplyImportOpts,
): Promise<ApplyImportResult> {
  const max = opts.max ?? 500;
  const concurrency = Math.max(1, opts.concurrency ?? 8);
  const warnings: string[] = [];
  const resolver: UserIdResolver = await buildUserIdResolver(
    opts.prisma,
    opts.fallbackUserId,
    opts.usersMapPath,
  );

  const existing = await opts.prisma.crmOrganization.findMany({
    select: { normalizedName: true },
  });
  const known = new Set(existing.map((o) => o.normalizedName));

  let imported = 0;
  let duplicates = 0;
  let skipped = 0;

  type Job = () => Promise<void>;
  const jobs: Job[] = [];

  for (const row of opts.rows) {
    if (imported + jobs.length >= max) {
      skipped += 1;
      continue;
    }
    if (known.has(row.normalizedName)) {
      duplicates += 1;
      continue;
    }
    // Réserve synchrone → pas de double création même en parallèle
    known.add(row.normalizedName);

    const ownerId = resolveOwnerId(resolver, row.ownerHint);
    const createdById = resolveCreatedById(
      resolver,
      row.createdByHint,
      ownerId,
    );

    if (opts.dryRun) {
      imported += 1;
      continue;
    }

    const snap = row;
    jobs.push(async () => {
      await createOneRowNested(opts.prisma, snap, ownerId, createdById);
    });
  }

  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    await Promise.all(batch.map((j) => j()));
    console.log(
      `  … import ${Math.min(i + concurrency, jobs.length)}/${jobs.length}`,
    );
  }

  imported += jobs.length;

  if (resolver.unresolved.size > 0) {
    warnings.push(
      `Personnes non résolues (filet fallback) : ${[...resolver.unresolved].join(", ")}`,
    );
  }

  return {
    imported,
    duplicates,
    skipped,
    warnings,
    unresolvedPeople: [...resolver.unresolved],
  };
}
