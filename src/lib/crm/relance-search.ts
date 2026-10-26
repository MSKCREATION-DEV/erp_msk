import type { Prisma } from "@prisma/client";

/**
 * Recherche texte file Relances (`?q=`) — alignée Prospects / Clients.
 * Champs couverts (schéma réel) : entreprise, contact (nom, e-mail, tél),
 * titre tâche / nextAction / titre opportunité, commercial assigné ;
 * vue « faites » : résumé, auteur, owner, entreprise.
 */

export function normalizeRelanceSearchQuery(
  raw: string | undefined | null,
): string {
  return (raw ?? "").trim().replace(/\s+/g, " ");
}

/** Chiffres seuls — recherche partielle téléphone (seuil anti-bruit). */
export function phoneDigitsForSearch(q: string, minDigits = 3): string | null {
  const digits = q.replace(/\D/g, "");
  return digits.length >= minDigits ? digits : null;
}

function contactMatchOr(
  q: string,
  digits: string | null,
): Prisma.CrmContactWhereInput[] {
  const or: Prisma.CrmContactWhereInput[] = [
    { firstName: { contains: q, mode: "insensitive" } },
    { lastName: { contains: q, mode: "insensitive" } },
    { email: { contains: q, mode: "insensitive" } },
    { phone: { contains: q, mode: "insensitive" } },
    {
      channels: {
        some: {
          OR: [
            { value: { contains: q, mode: "insensitive" } },
            { normalizedValue: { contains: q.toLowerCase() } },
            ...(digits
              ? [{ normalizedValue: { contains: digits } }]
              : []),
          ],
        },
      },
    },
  ];
  if (digits) {
    or.push({ phone: { contains: digits } });
  }
  return or;
}

function personNameOr(
  q: string,
): Prisma.UserWhereInput["OR"] {
  return [
    { firstName: { contains: q, mode: "insensitive" } },
    { lastName: { contains: q, mode: "insensitive" } },
  ];
}

/**
 * Clause Prisma pour tâches ouvertes (file à faire).
 * Retourne `null` si la requête est vide.
 */
export function buildRelanceTaskSearchWhere(
  qRaw: string | undefined | null,
): Prisma.CrmTaskWhereInput | null {
  const q = normalizeRelanceSearchQuery(qRaw);
  if (!q) return null;

  const digits = phoneDigitsForSearch(q);
  const contactOr = contactMatchOr(q, digits);

  return {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      {
        opportunity: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { nextAction: { contains: q, mode: "insensitive" } },
            {
              organization: {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { contacts: { some: { OR: contactOr } } },
                ],
              },
            },
          ],
        },
      },
      {
        organization: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { contacts: { some: { OR: contactOr } } },
          ],
        },
      },
      { assignee: { OR: personNameOr(q) } },
    ],
  };
}

/**
 * Clause Prisma pour activités journalisées (vue Relances faites).
 */
export function buildRelanceActivitySearchWhere(
  qRaw: string | undefined | null,
): Prisma.CrmActivityWhereInput | null {
  const q = normalizeRelanceSearchQuery(qRaw);
  if (!q) return null;

  const digits = phoneDigitsForSearch(q);
  const contactOr = contactMatchOr(q, digits);

  return {
    OR: [
      { summary: { contains: q, mode: "insensitive" } },
      { body: { contains: q, mode: "insensitive" } },
      {
        opportunity: {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            {
              organization: {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { contacts: { some: { OR: contactOr } } },
                ],
              },
            },
            { owner: { OR: personNameOr(q) } },
          ],
        },
      },
      { actor: { OR: personNameOr(q) } },
    ],
  };
}
