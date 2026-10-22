import type { GuideWorkflow } from "@/lib/guides";
import { cn } from "@/lib/utils";

export function GuideWorkflowView({ workflow }: { workflow: GuideWorkflow }) {
  const byId = new Map(workflow.nodes.map((n) => [n.id, n]));
  const order: string[] = [];
  const start =
    workflow.nodes.find((n) => n.kind === "start") ?? workflow.nodes[0];
  if (start) {
    const seen = new Set<string>();
    const queue = [start.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      order.push(id);
      for (const e of workflow.edges.filter((x) => x.from === id)) {
        queue.push(e.to);
      }
    }
  }

  return (
    <div className="space-y-4">
      {workflow.title ? (
        <h3 className="text-sm font-semibold text-msk-ink">{workflow.title}</h3>
      ) : null}
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-max items-stretch gap-0">
          {order.map((id, i) => {
            const node = byId.get(id);
            if (!node) return null;
            const outs = workflow.edges.filter((e) => e.from === id);
            const branchLabels = outs
              .map((o) => o.label)
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={id} className="flex items-center">
                <div
                  className={cn(
                    "flex min-w-36 max-w-44 flex-col justify-center rounded-2xl border px-4 py-3 text-center",
                    node.kind === "decision"
                      ? "border-msk-coral/30 bg-gradient-to-br from-msk-coral/10 to-white"
                      : node.kind === "end"
                        ? "border-msk-blue/30 bg-gradient-to-br from-msk-blue/15 to-[#00ACEE]/10"
                        : node.kind === "start"
                          ? "border-msk-ink/10 bg-msk-ink text-white"
                          : "border-msk-ink/8 bg-white shadow-sm",
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-semibold uppercase tracking-wide",
                      node.kind === "start"
                        ? "text-white/50"
                        : "text-msk-ink/35",
                    )}
                  >
                    {node.kind === "start"
                      ? "Début"
                      : node.kind === "end"
                        ? "Fin"
                        : node.kind === "decision"
                          ? "Décision"
                          : `Étape ${i}`}
                  </span>
                  <span
                    className={cn(
                      "mt-1 text-sm font-semibold leading-snug",
                      node.kind === "start" ? "text-white" : "text-msk-ink",
                    )}
                  >
                    {node.label}
                  </span>
                </div>
                {i < order.length - 1 ? (
                  <div className="mx-1 flex w-10 flex-col items-center">
                    <span
                      className="h-px w-full bg-gradient-to-r from-msk-blue/40 to-msk-blue/20"
                      aria-hidden
                    />
                    {branchLabels ? (
                      <span className="mt-1 max-w-16 truncate text-center text-[9px] font-medium text-msk-coral">
                        {branchLabels}
                      </span>
                    ) : (
                      <span className="text-msk-blue/50" aria-hidden>
                        →
                      </span>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
