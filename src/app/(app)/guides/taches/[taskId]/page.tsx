import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideList } from "@/components/guides/guide-list";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/session";
import {
  ALL_GUIDES,
  getGuideTask,
  publishedForUser,
} from "@/lib/guides";

type Props = { params: Promise<{ taskId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { taskId } = await params;
  const task = getGuideTask(taskId);
  return { title: task ? `Guides — ${task.label}` : "Tâche" };
}

export default async function GuideTaskPage({ params }: Props) {
  const user = await requireUser({ permission: "home.view" });
  const { taskId } = await params;
  const task = getGuideTask(taskId);
  if (!task) notFound();

  const guides = publishedForUser(user, ALL_GUIDES).filter((g) =>
    g.taskIds.includes(task.id),
  );

  return (
    <PageShell>
      <PageHeader
        title={task.label}
        description={task.description}
        backHref="/guides/taches"
        backLabel="Toutes les tâches"
        breadcrumbs={[
          { label: "Guides", href: "/guides" },
          { label: "Tâches", href: "/guides/taches" },
          { label: task.label },
        ]}
      />
      <GuideList
        guides={guides}
        emptyMessage="Aucun guide publié pour cette tâche pour le moment."
      />
    </PageShell>
  );
}
