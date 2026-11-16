import type { ReactNode } from "react";
import { TemplateExemplairePreview } from "@/components/admin/template-exemplaire-preview";

/**
 * Colonne droite fiche gabarit — sticky sous le bandeau mesuré
 * (`--gabarits-sticky-top`), même leçons que le listing Studio.
 */
export function TemplateDetailSidebar({
  templateId,
  templateName,
  exemplaireAvailable,
  engineBlocks = false,
  children,
}: {
  templateId: string;
  templateName: string;
  exemplaireAvailable: boolean;
  engineBlocks?: boolean;
  children?: ReactNode;
}) {
  return (
    <aside
      id="gabarit-detail-sidebar"
      className="flex flex-col gap-4 lg:sticky lg:top-[var(--gabarits-sticky-top,13.75rem)] lg:z-10 lg:self-start"
    >
      <TemplateExemplairePreview
        templateId={templateId}
        templateName={templateName}
        available={exemplaireAvailable}
        engineBlocks={engineBlocks}
      />
      {children}
    </aside>
  );
}
