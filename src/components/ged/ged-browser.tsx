"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  File,
  Folder,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SideDrawer } from "@/components/ui/drawer";
import {
  getDocumentDownloadUrlAction,
  softDeleteDocumentAction,
  uploadDocumentAction,
} from "@/actions/ged";

export type GedFolderRow = {
  id: string;
  name: string;
  code: string;
  path: string;
};

export type GedDocRow = {
  id: string;
  originalName: string;
  mime: string;
  size: number;
  createdAt: string;
};

export type BreadcrumbItem = { id: string; name: string };

export function GedBrowser({
  folderId,
  breadcrumbs,
  folders,
  documents,
  canUpload,
  canDelete,
  yearRootId,
}: {
  folderId: string | null;
  breadcrumbs: BreadcrumbItem[];
  folders: GedFolderRow[];
  documents: GedDocRow[];
  canUpload: boolean;
  canDelete: boolean;
  yearRootId: string | null;
}) {
  const router = useRouter();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const empty = folders.length === 0 && documents.length === 0;

  function goFolder(id: string) {
    router.push(`/ged?folder=${id}`);
  }

  async function onUpload(formData: FormData) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await uploadDocumentAction(formData);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setMessage(res.message ?? "OK");
      setUploadOpen(false);
      router.refresh();
    });
  }

  async function onDownload(id: string) {
    const res = await getDocumentDownloadUrlAction(id);
    if (res.ok && res.url) {
      window.open(res.url, "_blank", "noopener,noreferrer");
    } else {
      setError(res.error ?? "Téléchargement impossible");
    }
  }

  async function onDelete(id: string) {
    const fd = new FormData();
    fd.set("documentId", id);
    startTransition(async () => {
      const res = await softDeleteDocumentAction(null, fd);
      if (!res.ok) setError(res.error ?? "Échec");
      else {
        setMessage(res.message ?? "OK");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Fil d’Ariane" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          <Link
            href="/ged"
            className="cursor-pointer font-medium text-msk-blue hover:underline"
          >
            GED
          </Link>
          {breadcrumbs.map((c, i) => (
            <span key={c.id} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 text-msk-ink/30" />
              {i === breadcrumbs.length - 1 ? (
                <span className="truncate font-medium text-msk-ink">{c.name}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => goFolder(c.id)}
                  className="cursor-pointer truncate text-msk-blue hover:underline"
                >
                  {c.name}
                </button>
              )}
            </span>
          ))}
        </nav>

        <div className="flex flex-wrap gap-2">
          {yearRootId && !folderId ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => goFolder(yearRootId)}
            >
              Ouvrir {new Date().getFullYear()}
            </Button>
          ) : null}
          {canUpload && folderId ? (
            <Button type="button" size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Déposer
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-msk-coral/30 bg-msk-coral/5 px-3 py-2 text-sm text-msk-coral">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-msk-blue/20 bg-msk-blue/5 px-3 py-2 text-sm text-msk-ink">
          {message}
        </p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {empty ? (
            <div className="px-6 py-16 text-center">
              <Folder className="mx-auto h-10 w-10 text-msk-ink/20" />
              <p className="mt-3 font-medium text-msk-ink">Dossier vide</p>
              <p className="mt-1 text-sm text-msk-ink/45">
                {canUpload && folderId
                  ? "Déposez un fichier ou naviguez via le fil d’Ariane."
                  : "Sélectionnez un dossier pour explorer."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-msk-ink/[0.06]">
              {folders.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => goFolder(f.id)}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition hover:bg-msk-chalk/80"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-msk-blue/10 text-msk-blue">
                      <Folder className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-msk-ink">
                        {f.name}
                      </span>
                      <span className="block truncate text-xs text-msk-ink/40">
                        {f.code}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-msk-ink/25" />
                  </button>
                </li>
              ))}
              {documents.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-msk-chalk/50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-msk-ink/5 text-msk-ink/60">
                    <File className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-msk-ink">
                      {d.originalName}
                    </span>
                    <span className="block text-xs text-msk-ink/40">
                      {formatSize(d.size)} ·{" "}
                      {new Date(d.createdAt).toLocaleString("fr-FR")}
                    </span>
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDownload(d.id)}
                      aria-label="Télécharger"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => onDelete(d.id)}
                        aria-label="Corbeille"
                      >
                        <Trash2 className="h-4 w-4 text-msk-coral" />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {folderId ? (
        <SideDrawer
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          title="Déposer un document"
          description="Le fichier sera classé dans le dossier courant."
        >
          <form action={onUpload} className="space-y-4">
            <input type="hidden" name="folderId" value={folderId} />
            <div>
              <label
                htmlFor="file"
                className="mb-1.5 block text-sm font-medium text-msk-ink"
              >
                Fichier
              </label>
              <input
                id="file"
                name="file"
                type="file"
                required
                className="block w-full cursor-pointer text-sm text-msk-ink/70 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-msk-blue file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              />
              <p className="mt-2 text-xs text-msk-ink/40">
                PDF, images, Office — max 20 Mo.
              </p>
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Envoi…" : "Déposer"}
            </Button>
          </form>
        </SideDrawer>
      ) : null}
    </div>
  );
}

function formatSize(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}
