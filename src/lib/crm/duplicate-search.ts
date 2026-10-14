import { prisma } from "@/lib/prisma";
import { STAGE_LABELS } from "@/lib/crm/labels";
import {
  MAX_DUPLICATE_CANDIDATES,
  scoreOrgNames,
  type ContactDuplicateCandidate,
  type OrgDuplicateCandidate,
} from "@/lib/crm/duplicates";
import {
  normalizeChannelValue,
  phoneDigits,
  type ChannelInput,
} from "@/lib/crm/channels";
import type { CrmContactChannelType } from "@prisma/client";

function personLabel(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
): string | null {
  const n = [firstName, lastName].filter(Boolean).join(" ").trim();
  return n || null;
}

export async function searchOrgDuplicates(
  orgName: string,
): Promise<OrgDuplicateCandidate[]> {
  const needle = orgName.trim();
  if (needle.length < 2) return [];

  const [orgs, clients] = await Promise.all([
    prisma.crmOrganization.findMany({
      take: 400,
      orderBy: { updatedAt: "desc" },
      select: {
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
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { id: true, stage: true },
        },
        comClients: {
          take: 1,
          select: { id: true },
        },
      },
    }),
    prisma.comClient.findMany({
      take: 400,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        city: true,
        contactName: true,
        crmOrganizationId: true,
        createdBy: { select: { firstName: true, lastName: true } },
        owner: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const scored: OrgDuplicateCandidate[] = [];
  const seenOrgIds = new Set<string>();

  for (const org of orgs) {
    const { kind, score } = scoreOrgNames(needle, org.name);
    if (!kind) continue;
    seenOrgIds.add(org.id);
    const deal = org.opportunities[0];
    const linkedClient = org.comClients[0];
    const entity = linkedClient ? "client" : "prospect";
    const href = linkedClient
      ? `/commercial/clients/${linkedClient.id}`
      : deal
        ? `/crm/prospects/${deal.id}`
        : `/crm/prospects`;
    const contact = org.contacts[0];
    scored.push({
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
        ? STAGE_LABELS[
            deal.stage === "NEGOCIATION" ? "DEVIS_ENVOYE" : deal.stage
          ]
        : linkedClient
          ? "Client commercial"
          : null,
      primaryContact: personLabel(contact?.firstName, contact?.lastName),
      createdBy: `${org.createdBy.firstName} ${org.createdBy.lastName}`,
      owner: `${org.owner.firstName} ${org.owner.lastName}`,
    });
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

export async function hasExactOrgDuplicate(orgName: string): Promise<boolean> {
  const hits = await searchOrgDuplicates(orgName);
  return hits.some((h) => h.kind === "exact");
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

export async function searchContactDuplicates(
  channels: ChannelInput[],
): Promise<ContactDuplicateCandidate[]> {
  const keys: { type: CrmContactChannelType; norm: string; display: string }[] =
    [];
  for (const c of channels) {
    const norm = normalizeChannelValue(c.type, c.value);
    if (!norm) continue;
    if (c.type === "PHONE" || c.type === "WHATSAPP") {
      const d = phoneDigits(norm);
      if (d.length >= 6) {
        keys.push({ type: c.type, norm: d, display: c.value.trim() });
      }
    } else {
      keys.push({ type: c.type, norm, display: c.value.trim() });
    }
  }
  if (keys.length === 0) return [];

  const emailNorms = keys
    .filter((k) => k.type === "EMAIL")
    .map((k) => k.norm);
  const phoneNorms = keys
    .filter((k) => k.type === "PHONE" || k.type === "WHATSAPP")
    .map((k) => k.norm);
  const otherNorms = keys
    .filter(
      (k) =>
        k.type !== "EMAIL" && k.type !== "PHONE" && k.type !== "WHATSAPP",
    )
    .map((k) => k.norm);

  const channelHits = await prisma.crmContactChannel.findMany({
    where: {
      OR: [
        ...(emailNorms.length
          ? [{ type: "EMAIL" as const, normalizedValue: { in: emailNorms } }]
          : []),
        ...(phoneNorms.length
          ? [
              {
                type: { in: ["PHONE" as const, "WHATSAPP" as const] },
                normalizedValue: { in: phoneNorms },
              },
              // digits-only stored may vary with +
              {
                type: { in: ["PHONE" as const, "WHATSAPP" as const] },
                normalizedValue: {
                  in: phoneNorms.flatMap((d) => [`+${d}`, d]),
                },
              },
            ]
          : []),
        ...(otherNorms.length
          ? [{ normalizedValue: { in: otherNorms } }]
          : []),
      ],
    },
    take: 30,
    include: {
      contact: {
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
      },
    },
  });

  // Legacy mirror fields
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
    const matched =
      emailNorms.some(
        (e) => (c.email ?? "").toLowerCase() === e,
      )
        ? formatMatchVia("EMAIL", c.email ?? "")
        : formatMatchVia("PHONE", c.phone ?? "");
    if (!matched.includes("·") || matched.endsWith("· ")) continue;
    seen.add(key);
    const linked = org.comClients[0];
    const deal = org.opportunities[0];
    out.push({
      kind: "exact",
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
    const via = emailNorms.some(
      (e) => (client.email ?? "").toLowerCase() === e,
    )
      ? formatMatchVia("EMAIL", client.email ?? "")
      : formatMatchVia("PHONE", client.phone ?? "");
    out.push({
      kind: "exact",
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
