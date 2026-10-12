import Link from "next/link";
import {
  COMMERCIAL_MODULES,
  type CommercialModule,
} from "@/lib/commercial/modules";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HubCardProps = {
  module: CommercialModule;
  count?: number | null;
  className?: string;
};

/** Carte hub style shadcn Card + bandeau image (dégradé MSK + titre). */
export function CommercialHubCard({ module, count, className }: HubCardProps) {
  return (
    <Link
      prefetch={false}
      href={module.href}
      className={cn("group block h-full outline-none", className)}
    >
      <Card className="h-full overflow-hidden pt-0 transition group-hover:border-msk-blue/35 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-msk-blue/40">
        <div
          className={cn(
            "relative aspect-[16/7] w-full bg-gradient-to-br",
            module.band,
          )}
        >
          <div className="absolute inset-0 bg-msk-ink/25" />
          <div className="absolute inset-0 flex items-end p-4">
            <p className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-[1.75rem]">
              {module.title}
            </p>
          </div>
          {count != null ? (
            <span className="absolute right-3 top-3 rounded-md bg-white/95 px-2 py-0.5 text-xs font-semibold tabular-nums text-msk-ink">
              {count}
            </span>
          ) : null}
        </div>
        <CardHeader className="gap-1">
          <CardTitle className="sr-only">{module.title}</CardTitle>
          <CardDescription className="text-[13px] leading-snug text-msk-ink/55">
            {module.description}
          </CardDescription>
        </CardHeader>
        <CardFooter className="border-0 pt-0 text-sm font-medium text-msk-blue group-hover:underline">
          Ouvrir →
        </CardFooter>
      </Card>
    </Link>
  );
}

export function CommercialHubGrid({
  modules = COMMERCIAL_MODULES,
  counts,
}: {
  modules?: CommercialModule[];
  counts?: Partial<Record<string, number>>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {modules.map((m) => (
        <CommercialHubCard
          key={m.id}
          module={m}
          count={counts?.[m.id] ?? null}
        />
      ))}
    </div>
  );
}
