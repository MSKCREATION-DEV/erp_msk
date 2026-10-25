import { prisma } from "@/lib/prisma";
import { STAGE_LABELS } from "@/lib/crm/labels";
import { normalizeOrgName } from "@/lib/crm/labels";
import {
  MAX_DUPLICATE_CANDIDATES,
  ORG_CANDIDATE_POOL,
  contactSeverityForType,
  orgSearchTokens,
  scoreOrgNames,
  type ContactDuplicateCandidate,
  type ContactMatchSeverity,
  type OrgDuplicateCandidate,
} from "@/lib/crm/duplicates";
import {
  normalizeChannelValue,
  phoneDigits,
  type ChannelInput,
} from "@/lib/crm/channels";
import type {
  CrmContactChannelType,
  CrmPipelineStage,
  Prisma,
} from "@prisma/client";

function personLabel(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string | null {
  const n = [firstName, lastName].filter(Boolean).join(" ").trim();
  return n || null;
}

const orgSelect = {
  id: true,
  name: true,
  city: true,
  sector: true,
  createdBy: { select: { firstName: true, lastName: true } },
  owner: { select: { firstName: true, lastName: true } },
  contacts: {
    where: { isPrimary: true },
    take: 1,
    select: { firstName: true, lastName: true },
  },
  opportunities: {
    orderBy: { updatedAt: "desc" as const },
    take: 1,
    select: { id: true, stage: true },
  },
  comClients: {
    take: 1,
    select: { id: true },
  },
} satisfies Prisma.CrmOrganizationSelect;

const clientSelect = {
  id: true,
  name: true,
  city: true,
  contactName: true,
  crmOrganizationId: true,
  createdBy: { select: { firstName: true, lastName: true } },
  owner: { select: { firstName: true, lastName: true } },
} satisfies Prisma.ComClientSelect;

function stageUiLabel(stage: CrmPipelineStage): string {
  return STAGE_LABELS[stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : stage];
}

function toOrgCandidate(
  org: {
    id: string;
    name: string;
    city: string | null;
    sector: string | null;
    createdBy: { firstName: string; lastName: string };
    owner: { firstName: string; lastName: string };
    contacts: { firstName: string; lastName: string }[];
    opportunities: { id: string; stage: CrmPipelineStage }[];
    comClients: { id: string }[];
  },
  kind: OrgDuplicateCandidate["kind"],
  score: number,
): OrgDuplicateCandidate {
  const deal = org.opportunities[0];
  const linkedClient = org.comClients[0];
  const entity = linkedClient ? "client" : "prospect";
  const href = linkedClient
    ? `/commercial/clients/${linkedClient.id}`
    : deal
      ? `/crm/prospects/${deal.id}`
      : `/crm/prospects`;
  const contact = org.contacts[0];
  return {
    kind,
    entity,
    score,
    href,
    id: linkedClient?.id ?? org.id,
    opportunityId: deal?.id ?? null,
    name: org.name,
    city: org.city,
    sector: org.sector,
    stageLabel: deal
      ? stageUiLabel(deal.stage)
      : linkedClient
        ? "Client commercial"
        : null,
    primaryContact: personLabel(contact?.firstName, contact?.lastName),
    createdBy: `${org.createdBy.firstName} ${org.createdBy.lastName}`,
    owner: `${org.owner.firstName} ${org.owner.lastName}`,
  };
}

/**
 * Recherche doublons org — exact via `normalizedName`, fuzzy via pool filtré
 * (index) puis Dice. Pas de scan complet de table.
 */
export async function searchOrgDuplicates(
  orgName: string,
): Promise<OrgDuplicateCandidate[]> {
  const needle = orgName.trim();
  if (!needle) return [];

  const norm = normalizeOrgName(needle);
  if (!norm) return [];

  const tokens = orgSearchTokens(needle);
  const compact = norm.replace(/\s+/g, "");
  // Toujours contains/startsWith + name brut (insensible à la casse).
  // Un mot unique (« smdf », « marin ») ne doit jamais se limiter à l’égalité exacte.
  const orFilters: Prisma.CrmOrganizationWhereInput[] = [
    { normalizedName: norm },
    { normalizedName: { startsWith: norm } },
    { normalizedName: { contains: norm } },
    { name: { contains: needle, mode: "insensitive" } },
  ];
  if (compact && compact !== norm) {
    orFilters.push({ normalizedName: { contains: compact } });
    orFilters.push({ normalizedName: { startsWith: compact } });
  }
  for (const t of tokens) {
    if (t === norm || t === compact) continue;
    orFilters.push({ normalizedName: { startsWith: t } });
    orFilters.push({ normalizedName: { contains: t } });
  }

  const clientOr: Prisma.ComClientWhereInput[] = [
    { normalizedName: norm },
    { normalizedName: { startsWith: norm } },
    { normalizedName: { contains: norm } },
    { name: { contains: needle, mode: "insensitive" } },
  ];
  if (compact && compact !== norm) {
    clientOr.push({ normalizedName: { contains: compact } });
    clientOr.push({ normalizedName: { startsWith: compact } });
  }
  for (const t of tokens) {
    if (t === norm || t === compact) continue;
    clientOr.push({ normalizedName: { startsWith: t } });
    clientOr.push({ normalizedName: { contains: t } });
  }

  const [orgs, clients] = await Promise.all([
    prisma.crmOrganization.findMany({
      where: { OR: orFilters },
      take: ORG_CANDIDATE_POOL,
      orderBy: { updatedAt: "desc" },
      select: orgSelect,
    }),
    prisma.comClient.findMany({
      where: { OR: clientOr },
      take: ORG_CANDIDATE_POOL,
      orderBy: { updatedAt: "desc" },
      select: clientSelect,
    }),
  ]);

  const scored: OrgDuplicateCandidate[] = [];
  const seenOrgIds = new Set<string>();

  for (const org of orgs) {
    const { kind, score } = scoreOrgNames(needle, org.name);
    if (!kind) continue;
    seenOrgIds.add(org.id);
    scored.push(toOrgCandidate(org, kind, score));
  }

  for (const client of clients) {
    if (client.crmOrganizationId && seenOrgIds.has(client.crmOrganizationId)) {
      continue;
    }
    const { kind, score } = scoreOrgNames(needle, client.name);
    if (!kind) continue;
    scored.push({
      kind,
      entity: "client",
      score,
      href: `/commercial/clients/${client.id}`,
      id: client.id,
      opportunityId: null,
      name: client.name,
      city: client.city,
      sector: null,
      stageLabel: "Client commercial",
      primaryContact: client.contactName,
      createdBy: `${client.createdBy.firstName} ${client.createdBy.lastName}`,
      owner: `${client.owner.firstName} ${client.owner.lastName}`,
    });
  }

  scored.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "exact" ? -1 : 1;
    return b.score - a.score;
  });

  return scored.slice(0, MAX_DUPLICATE_CANDIDATES);
}

/** Contrôle déterministe exact — index `normalizedName`, pas de fuzzy. */
export async function hasExactOrgDuplicate(orgName: string): Promise<boolean> {
  const norm = normalizeOrgName(orgName);
  if (!norm) return false;
  const [org, client] = await Promise.all([
    prisma.crmOrganization.findFirst({
      where: { normalizedName: norm },
      select: { id: true },
    }),
    prisma.comClient.findFirst({
      where: { normalizedName: norm },
      select: { id: true },
    }),
  ]);
  return Boolean(org || client);
}

/** Toute correspondance org (exacte ou fuzzy) — même logique que le wizard. */
export async function hasBlockingOrgDuplicate(
  orgName: string,
): Promise<boolean> {
  const hits = await searchOrgDuplicates(orgName);
  return hits.length > 0;
}

function formatMatchVia(
  type: CrmContactChannelType,
  value: string,
): string {
  const labels: Record<CrmContactChannelType, string> = {
    PHONE: "Téléphone",
    EMAIL: "E-mail",
    WHATSAPP: "WhatsApp",
    INSTAGRAM: "Instagram",
    LINKEDIN: "LinkedIn",
    AUTRE: "Autre",
  };
  return `${labels[type]} · ${value}`;
}

function phoneNormalizedVariants(digits: string): string[] {
  const variants = new Set<string>([digits, `+${digits}`]);
  // Variantes courantes Afrique de l'Ouest : 0 local vs indicatif
  if (digits.startsWith("221") && digits.length > 9) {
    const local = digits.slice(3);
    variants.add(local);
    variants.add(`0${local}`);
    variants.add(`+221${local}`);
  }
  if (digits.startsWith("223") && digits.length > 9) {
    const local = digits.slice(3);
    variants.add(local);
    variants.add(`0${local}`);
    variants.add(`+223${local}`);
  }
  if (digits.length >= 8 && !digits.startsWith("221") && !digits.startsWith("223")) {
    variants.add(`221${digits.replace(/^0+/, "")}`);
    variants.add(`223${digits.replace(/^0+/, "")}`);
  }
  return [...variants];
}

type SearchKey = {
  type: CrmContactChannelType;
  norm: string;
  display: string;
  severity: ContactMatchSeverity;
};

function buildSearchKeys(channels: ChannelInput[]): SearchKey[] {
  const keys: SearchKey[] = [];
  for (const c of channels) {
    const norm = normalizeChannelValue(c.type, c.value);
    if (!norm) continue;
    if (c.type === "PHONE" || c.type === "WHATSAPP") {
      const d = phoneDigits(norm);
      if (d.length >= 6) {
        keys.push({
          type: c.type,
          norm: d,
          display: c.value.trim(),
          severity: contactSeverityForType(c.type),
        });
      }
    } else if (c.type === "EMAIL") {
      if (norm.length >= 3) {
        keys.push({
          type: c.type,
          norm,
          display: c.value.trim(),
          severity: contactSeverityForType(c.type),
        });
      }
    } else if (norm.length >= 3) {
      keys.push({
        type: c.type,
        norm,
        display: c.value.trim(),
        severity: contactSeverityForType(c.type),
      });
    }
  }
  return keys;
}

export async function searchContactDuplicates(
  channels: ChannelInput[],
): Promise<ContactDuplicateCandidate[]> {
  const keys = buildSearchKeys(channels);
  if (keys.length === 0) return [];

  const emailNorms = keys.filter((k) => k.type === "EMAIL").map((k) => k.norm);
  const phoneNorms = keys
    .filter((k) => k.type === "PHONE" || k.type === "WHATSAPP")
    .map((k) => k.norm);
  const otherNorms = keys
    .filter(
      (k) =>
        k.type !== "EMAIL" && k.type !== "PHONE" && k.type !== "WHATSAPP",
    )
    .map((k) => k.norm);

  const phoneVariants = phoneNorms.flatMap(phoneNormalizedVariants);

  const channelOr: Prisma.CrmContactChannelWhereInput[] = [];
  if (emailNorms.length) {
    channelOr.push({ type: "EMAIL", normalizedValue: { in: emailNorms } });
  }
  if (phoneVariants.length) {
    channelOr.push({
      type: { in: ["PHONE", "WHATSAPP"] },
      normalizedValue: { in: phoneVariants },
    });
  }
  if (otherNorms.length) {
    channelOr.push({ normalizedValue: { in: otherNorms } });
  }

  const channelHits =
    channelOr.length > 0
      ? await prisma.crmContactChannel.findMany({
          where: { OR: channelOr },
          take: 30,
          include: {
            contact: {
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    city: true,
                    createdBy: {
                      select: { firstName: true, lastName: true },
                    },
                    owner: { select: { firstName: true, lastName: true } },
                    opportunities: {
                      orderBy: { updatedAt: "desc" },
                      take: 1,
                      select: { id: true },
                    },
                    comClients: { take: 1, select: { id: true } },
                  },
                },
              },
            },
          },
        })
      : [];

  const legacyContacts =
    emailNorms.length || phoneNorms.length
      ? await prisma.crmContact.findMany({
          where: {
            OR: [
              ...(emailNorms.length
                ? [{ email: { in: emailNorms, mode: "insensitive" as const } }]
                : []),
              ...(phoneNorms.length
                ? phoneNorms.map((d) => ({
                    phone: { contains: d.slice(-8) },
                  }))
                : []),
            ],
          },
          take: 20,
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                city: true,
                createdBy: { select: { firstName: true, lastName: true } },
                owner: { select: { firstName: true, lastName: true } },
                opportunities: {
                  orderBy: { updatedAt: "desc" },
                  take: 1,
                  select: { id: true },
                },
                comClients: { take: 1, select: { id: true } },
              },
            },
          },
        })
      : [];

  const clients =
    emailNorms.length || phoneNorms.length
      ? await prisma.comClient.findMany({
          where: {
            OR: [
              ...(emailNorms.length
                ? [{ email: { in: emailNorms, mode: "insensitive" as const } }]
                : []),
              ...(phoneNorms.length
                ? phoneNorms.map((d) => ({
                    phone: { contains: d.slice(-8) },
                  }))
                : []),
            ],
          },
          take: 10,
          select: {
            id: true,
            name: true,
            city: true,
            contactName: true,
            email: true,
            phone: true,
            createdBy: { select: { firstName: true, lastName: true } },
            owner: { select: { firstName: true, lastName: true } },
          },
        })
      : [];

  const out: ContactDuplicateCandidate[] = [];
  const seen = new Set<string>();

  for (const hit of channelHits) {
    const org = hit.contact.organization;
    const key = `org:${org.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const linked = org.comClients[0];
    const deal = org.opportunities[0];
    out.push({
      kind: "exact",
      severity: contactSeverityForType(hit.type),
      entity: linked ? "client" : "prospect",
      href: linked
        ? `/commercial/clients/${linked.id}`
        : deal
          ? `/crm/prospects/${deal.id}`
          : "/crm/prospects",
      id: linked?.id ?? org.id,
      opportunityId: deal?.id ?? null,
      orgName: org.name,
      contactName:
        personLabel(hit.contact.firstName, hit.contact.lastName) ?? "—",
      matchedVia: formatMatchVia(hit.type, hit.value),
      city: org.city,
      createdBy: `${org.createdBy.firstName} ${org.createdBy.lastName}`,
      owner: `${org.owner.firstName} ${org.owner.lastName}`,
    });
  }

  for (const c of legacyContacts) {
    const org = c.organization;
    const key = `org:${org.id}`;
    if (seen.has(key)) continue;
    const emailHit = emailNorms.some(
      (e) => (c.email ?? "").toLowerCase() === e,
    );
    const matched = emailHit
      ? formatMatchVia("EMAIL", c.email ?? "")
      : formatMatchVia("PHONE", c.phone ?? "");
    if (!matched.includes("·") || matched.endsWith("· ")) continue;
    seen.add(key);
    const linked = org.comClients[0];
    const deal = org.opportunities[0];
    out.push({
      kind: "exact",
      severity: "identity",
      entity: linked ? "client" : "prospect",
      href: linked
        ? `/commercial/clients/${linked.id}`
        : deal
          ? `/crm/prospects/${deal.id}`
          : "/crm/prospects",
      id: linked?.id ?? org.id,
      opportunityId: deal?.id ?? null,
      orgName: org.name,
      contactName: personLabel(c.firstName, c.lastName) ?? "—",
      matchedVia: matched,
      city: org.city,
      createdBy: `${org.createdBy.firstName} ${org.createdBy.lastName}`,
      owner: `${org.owner.firstName} ${org.owner.lastName}`,
    });
  }

  for (const client of clients) {
    const key = `client:${client.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const emailHit = emailNorms.some(
      (e) => (client.email ?? "").toLowerCase() === e,
    );
    const via = emailHit
      ? formatMatchVia("EMAIL", client.email ?? "")
      : formatMatchVia("PHONE", client.phone ?? "");
    out.push({
      kind: "exact",
      severity: "identity",
      entity: "client",
      href: `/commercial/clients/${client.id}`,
      id: client.id,
      opportunityId: null,
      orgName: client.name,
      contactName: client.contactName ?? "—",
      matchedVia: via,
      city: client.city,
      createdBy: `${client.createdBy.firstName} ${client.createdBy.lastName}`,
      owner: `${client.owner.firstName} ${client.owner.lastName}`,
    });
  }

  return out.slice(0, MAX_DUPLICATE_CANDIDATES);
}

/** True s’il existe un match identité (tél / e-mail / WhatsApp). */
export async function hasIdentityContactDuplicate(
  channels: ChannelInput[],
): Promise<boolean> {
  const hits = await searchContactDuplicates(channels);
  return hits.some((h) => h.severity === "identity");
}
