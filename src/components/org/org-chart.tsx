"use client";

import { useMemo } from "react";
import { Mail } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { MSK_TEAM, ORG_LEVEL_KEYS } from "@/lib/org/team";

export type OrgChartNode = {
  id: string;
  fullName: string;
  title: string;
  email: string | null;
  photoPath: string | null;
  parentId: string | null;
  sortOrder: number;
};

const LINE = "rgba(255,255,255,0.55)";
const LINE_W = 1.5;

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return {
    firstName: parts[0] ?? "?",
    lastName: parts.slice(1).join(" ") || parts[0] || "?",
  };
}

function formatDisplayName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1]!.toUpperCase();
  const first = parts.slice(0, -1).join(" ");
  return `${first} ${last}`;
}

function PersonNode({
  node,
  size = "md",
}: {
  node: OrgChartNode;
  size?: "sm" | "md" | "lg";
}) {
  const { firstName, lastName } = splitName(node.fullName);
  const avatarSize = size === "lg" ? "2xl" : size === "sm" ? "lg" : "xl";

  return (
    <article
      className={cn(
        "flex flex-col items-center text-center",
        size === "sm" ? "w-34" : "w-42 sm:w-46",
      )}
    >
      <UserAvatar
        firstName={firstName}
        lastName={lastName}
        src={node.photoPath}
        size={avatarSize}
        className="ring-3 ring-[#00ACEE]/75 ring-offset-2 ring-offset-[#0D1330]"
      />
      <h3 className="mt-3 text-[13px] font-semibold leading-snug text-white sm:text-sm">
        {formatDisplayName(node.fullName)}
      </h3>
      <p className="mt-1 max-w-44 text-[11px] leading-snug text-[#7EB8E8] sm:text-xs">
        {node.title}
      </p>
      {node.email ? (
        <a
          href={`mailto:${node.email}`}
          className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate text-[10px] text-white/35 transition hover:text-[#00ACEE]"
          title={node.email}
        >
          <Mail className="h-3 w-3 shrink-0" />
          <span className="truncate">{node.email}</span>
        </a>
      ) : null}
    </article>
  );
}

/**
 * Relie N nœuds frères par une barre horizontale, puis descend au centre.
 * viewBox 0–100 : centres à 50/n, 150/n, …
 */
function ForkDown({ count }: { count: number }) {
  const centers = Array.from({ length: count }, (_, i) => ((i + 0.5) / count) * 100);
  const left = centers[0]!;
  const right = centers[centers.length - 1]!;
  const mid = 50;

  return (
    <svg
      className="block h-10 w-full"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden
    >
      {centers.map((x) => (
        <line
          key={`up-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={18}
          stroke={LINE}
          strokeWidth={LINE_W}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <line
        x1={left}
        y1={18}
        x2={right}
        y2={18}
        stroke={LINE}
        strokeWidth={LINE_W}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={mid}
        y1={18}
        x2={mid}
        y2={40}
        stroke={LINE}
        strokeWidth={LINE_W}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** 1 parent centré → N enfants (barre + montants). */
function FanUp({ count }: { count: number }) {
  const centers = Array.from({ length: count }, (_, i) => ((i + 0.5) / count) * 100);
  const left = centers[0]!;
  const right = centers[centers.length - 1]!;
  const mid = 50;

  return (
    <svg
      className="block h-10 w-full"
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      aria-hidden
    >
      <line
        x1={mid}
        y1={0}
        x2={mid}
        y2={18}
        stroke={LINE}
        strokeWidth={LINE_W}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={left}
        y1={18}
        x2={right}
        y2={18}
        stroke={LINE}
        strokeWidth={LINE_W}
        vectorEffect="non-scaling-stroke"
      />
      {centers.map((x) => (
        <line
          key={`down-${x}`}
          x1={x}
          y1={18}
          x2={x}
          y2={40}
          stroke={LINE}
          strokeWidth={LINE_W}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

/**
 * Paire (Issiaka·Madina) liée, descente centrale, puis éventail vers N collaborateurs.
 */
function PairToFan({ fromCount, toCount }: { fromCount: number; toCount: number }) {
  const from = Array.from({ length: fromCount }, (_, i) => ((i + 0.5) / fromCount) * 100);
  const to = Array.from({ length: toCount }, (_, i) => ((i + 0.5) / toCount) * 100);
  const mid = 50;
  const fromLeft = from[0]!;
  const fromRight = from[from.length - 1]!;
  const toLeft = to[0]!;
  const toRight = to[to.length - 1]!;

  return (
    <svg
      className="block h-14 w-full"
      viewBox="0 0 100 56"
      preserveAspectRatio="none"
      aria-hidden
    >
      {from.map((x) => (
        <line
          key={`f-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={16}
          stroke={LINE}
          strokeWidth={LINE_W}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <line
        x1={fromLeft}
        y1={16}
        x2={fromRight}
        y2={16}
        stroke={LINE}
        strokeWidth={LINE_W}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={mid}
        y1={16}
        x2={mid}
        y2={32}
        stroke={LINE}
        strokeWidth={LINE_W}
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={toLeft}
        y1={32}
        x2={toRight}
        y2={32}
        stroke={LINE}
        strokeWidth={LINE_W}
        vectorEffect="non-scaling-stroke"
      />
      {to.map((x) => (
        <line
          key={`t-${x}`}
          x1={x}
          y1={32}
          x2={x}
          y2={56}
          stroke={LINE}
          strokeWidth={LINE_W}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function PeopleRow({
  people,
  size,
  className,
}: {
  people: OrgChartNode[];
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid w-full items-start justify-items-center",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${people.length}, minmax(0, 1fr))`,
      }}
    >
      {people.map((n) => (
        <PersonNode key={n.id} node={n} size={size} />
      ))}
    </div>
  );
}

export function OrgChart({ nodes }: { nodes: OrgChartNode[] }) {
  const byKey = useMemo(() => {
    const byName = new Map(
      nodes.map((n) => [n.fullName.toLowerCase(), n] as const),
    );
    const map = new Map<string, OrgChartNode>();
    for (const m of MSK_TEAM) {
      const node = byName.get(m.fullName.toLowerCase());
      if (node) map.set(m.key, node);
    }
    return map;
  }, [nodes]);

  const l0 = ORG_LEVEL_KEYS[0]!.map((k) => byKey.get(k)).filter(Boolean) as OrgChartNode[];
  const l1 = ORG_LEVEL_KEYS[1]!.map((k) => byKey.get(k)).filter(Boolean) as OrgChartNode[];
  const l2 = ORG_LEVEL_KEYS[2]!.map((k) => byKey.get(k)).filter(Boolean) as OrgChartNode[];
  const l3 = ORG_LEVEL_KEYS[3]!.map((k) => byKey.get(k)).filter(Boolean) as OrgChartNode[];
  const l4 = ORG_LEVEL_KEYS[4]!.map((k) => byKey.get(k)).filter(Boolean) as OrgChartNode[];

  if (l0.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-msk-ink/50">
        {nodes.length} collaborateurs — structure officielle MSK CREATION
      </p>

      <div className="overflow-x-auto rounded-2xl bg-[#0D1330] px-3 py-10 shadow-lg sm:px-10 sm:py-12">
        <div className="mx-auto flex w-full min-w-160 max-w-4xl flex-col items-stretch">
          {/* L0 — Mathieu · Isdalinia */}
          <PeopleRow people={l0} size="lg" className="px-[8%]" />

          {/* 2 têtes liées → descente → Andile · Ismaël liés */}
          {l0.length >= 2 && l1.length >= 2 ? (
            <div className="px-[8%]">
              <PairToFan fromCount={l0.length} toCount={l1.length} />
            </div>
          ) : null}

          {/* L1 — Andile · Ismaël */}
          {l1.length > 0 ? (
            <PeopleRow people={l1} size="md" className="px-[8%]" />
          ) : null}

          {/* Andile · Ismaël liés → descente → Guiro */}
          {l1.length >= 2 && l2.length > 0 ? (
            <div className="px-[8%]">
              <ForkDown count={l1.length} />
            </div>
          ) : null}

          {/* L2 — Guiro (centré) */}
          {l2.length > 0 ? (
            <div className="flex justify-center">
              <PersonNode node={l2[0]!} size="md" />
            </div>
          ) : null}

          {/* Descente Guiro → Issiaka · Madina */}
          {l2.length > 0 && l3.length > 0 ? (
            <div className="px-[8%]">
              <FanUp count={l3.length} />
            </div>
          ) : null}

          {/* L3 — Issiaka · Madina */}
          {l3.length > 0 ? (
            <PeopleRow people={l3} size="md" className="px-[8%]" />
          ) : null}

          {/* Issiaka·Madina liés → descente → 4 collaborateurs */}
          {l3.length >= 2 && l4.length > 0 ? (
            <div className="px-[2%]">
              <PairToFan fromCount={l3.length} toCount={l4.length} />
            </div>
          ) : null}

          {l4.length > 0 ? <PeopleRow people={l4} size="sm" /> : null}
        </div>
      </div>

      {/* Mobile : liste */}
      <ul className="divide-y divide-msk-ink/[0.06] overflow-hidden rounded-xl border border-msk-ink/[0.08] bg-white md:hidden">
        {[l0, l1, l2, l3, l4].flatMap((row, levelIdx) =>
          row.map((node) => {
            const { firstName, lastName } = splitName(node.fullName);
            return (
              <li
                key={node.id}
                className="flex items-center gap-3 py-2.5 pr-3"
                style={{ paddingLeft: 12 + levelIdx * 12 }}
              >
                <UserAvatar
                  firstName={firstName}
                  lastName={lastName}
                  src={node.photoPath}
                  size="sm"
                  className="ring-1 ring-msk-blue/25"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-msk-ink">
                    {formatDisplayName(node.fullName)}
                  </p>
                  <p className="truncate text-xs text-msk-ink/45">{node.title}</p>
                </div>
              </li>
            );
          }),
        )}
      </ul>
    </div>
  );
}
