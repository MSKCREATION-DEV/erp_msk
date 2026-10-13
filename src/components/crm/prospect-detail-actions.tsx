"use client";

import { useState } from "react";
import type { CrmPipelineStage } from "@prisma/client";
import { ClipboardList, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StageForm } from "@/components/crm/stage-form";
import { ActivityForm } from "@/components/crm/activity-form";

/**
 * Actions fiche prospect — statut & journal via modales (page lisible, sans sidebar formulaires).
 */
export function ProspectDetailActions({
  opportunityId,
  stage,
  activityCount,
  hasFollowUp,
  canEditStage,
  canLogActivity,
  requireFollowUp,
}: {
  opportunityId: string;
  stage: CrmPipelineStage;
  activityCount: number;
  hasFollowUp: boolean;
  canEditStage: boolean;
  canLogActivity: boolean;
  requireFollowUp: boolean;
}) {
  const [stageOpen, setStageOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  if (!canEditStage && !canLogActivity) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canEditStage ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setStageOpen(true)}
          >
            <GitBranch className="h-4 w-4" aria-hidden />
            Changer le statut
          </Button>
        ) : null}
        {canLogActivity ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setActivityOpen(true)}
          >
            <ClipboardList className="h-4 w-4" aria-hidden />
            Enregistrer une action
          </Button>
        ) : null}
      </div>

      {canEditStage ? (
        <Modal
          open={stageOpen}
          onOpenChange={setStageOpen}
          title="Changer le statut"
          description="Mise à jour du parcours commercial (règles GUIDE)."
          size="md"
        >
          <div className="p-5">
            <StageForm
              opportunityId={opportunityId}
              stage={stage}
              activityCount={activityCount}
              hasFollowUp={hasFollowUp}
              onSuccess={() => setStageOpen(false)}
            />
          </div>
        </Modal>
      ) : null}

      {canLogActivity ? (
        <Modal
          open={activityOpen}
          onOpenChange={setActivityOpen}
          title="Enregistrer une action"
          description="Journalisez l’échange et planifiez la prochaine relance."
          size="md"
        >
          <div className="p-5">
            <ActivityForm
              opportunityId={opportunityId}
              requireFollowUp={requireFollowUp}
              onSuccess={() => setActivityOpen(false)}
            />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
