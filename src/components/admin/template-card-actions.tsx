"use client";

import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  PenLine,
  Power,
  Signature,
  Upload,
} from "lucide-react";
import {
  publishDraftVersionAction,
  toggleTemplateActiveAction,
  toggleTemplateSignatureAction,
} from "@/actions/studio-templates";
import { ActionMenu } from "@/components/ui/action-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { usePendingAction } from "@/hooks/use-pending-action";
import { failAction, reportActionSuccess } from "@/lib/toast/report";

/**
 * Actions rapides gabarit Studio (`ENGINE_BLOCKS`) — pattern Commercial
 * (`ActionMenu` + `useConfirm`), pas de bouton de validation toujours ouvert.
 */
export function TemplateCardActions({
  templateId,
  active,
  signatureEnabled,
  hasDraft,
  editHref,
}: {
  templateId: string;
  active: boolean;
  signatureEnabled: boolean;
  hasDraft: boolean;
  editHref: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { pending, run } = usePendingAction();

  function callAction(
    action: (prev: null, fd: FormData) => Promise<{ ok: boolean; error?: string; message?: string }>,
    successFallback: string,
  ) {
    void run(async () => {
      const fd = new FormData();
      fd.set("templateId", templateId);
      const res = await action(null, fd);
      if (failAction(res, undefined, "Échec")) return;
      reportActionSuccess(res.message ?? successFallback);
      router.refresh();
    });
  }

  const items = [
    {
      id: "edit",
      label: "Éditer le contenu",
      icon: <PenLine className="size-3.5" aria-hidden />,
      onSelect: () => router.push(editHref),
    },
    ...(hasDraft
      ? [
          {
            id: "publish",
            label: "Publier le brouillon",
            icon: <Upload className="size-3.5" aria-hidden />,
            onSelect: () =>
              callAction(publishDraftVersionAction, "Version publiée"),
          },
        ]
      : []),
    {
      id: "signature",
      label: signatureEnabled ? "Désactiver la signature" : "Activer la signature",
      icon: <Signature className="size-3.5" aria-hidden />,
      onSelect: () =>
        void confirm({
          title: signatureEnabled
            ? "Désactiver la signature de ce gabarit ?"
            : "Activer la signature de ce gabarit ?",
          description: signatureEnabled
            ? "Les prochains documents générés n’afficheront plus d’image de signature."
            : "Les prochains documents générés pourront afficher la signature active du signataire.",
          confirmLabel: signatureEnabled ? "Désactiver" : "Activer",
          tone: signatureEnabled ? "danger" : "primary",
          icon: signatureEnabled ? "warning" : "info",
          successToast: false,
          action: () =>
            run(async () => {
              const fd = new FormData();
              fd.set("templateId", templateId);
              const res = await toggleTemplateSignatureAction(null, fd);
              if (failAction(res, undefined, "Échec")) return;
              reportActionSuccess(res.message ?? "Mis à jour");
              router.refresh();
            }),
        }),
    },
    {
      id: "toggle-active",
      label: active ? "Désactiver le gabarit" : "Activer le gabarit",
      icon: active ? (
        <Power className="size-3.5" aria-hidden />
      ) : (
        <CheckCircle2 className="size-3.5" aria-hidden />
      ),
      tone: active ? ("danger" as const) : ("default" as const),
      onSelect: () =>
        void confirm({
          title: active ? "Désactiver ce gabarit ?" : "Activer ce gabarit ?",
          description: active
            ? "Toute génération (devis, aperçu…) passant par ce gabarit sera refusée tant qu’il reste désactivé."
            : "Ce gabarit redevient disponible pour la génération de documents.",
          confirmLabel: active ? "Confirmer la désactivation" : "Activer",
          tone: active ? "danger" : "primary",
          icon: active ? "warning" : "info",
          successToast: false,
          action: () => callAction(toggleTemplateActiveAction, "Mis à jour"),
        }),
    },
  ];

  return (
    <div
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <ActionMenu items={items} label="Actions gabarit" />
      {pending ? <span className="sr-only">Traitement…</span> : null}
    </div>
  );
}
