"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Download,
  Eye,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderPlus,
  ImageIcon,
  Loader2,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { SideDrawer } from "@/components/ui/drawer";
import { GedToolbar } from "@/components/ged/ged-toolbar";
import {
  GedPreviewModal,
  type PreviewDoc,
} from "@/components/ged/ged-preview-modal";
import {
  createFolderAction,
  deleteFolderAction,
  getDocumentDownloadUrlAction,
  renameFolderAction,
  softDeleteDocumentAction,
  uploadDocumentAction,
} from "@/actions/ged";
import { cn } from "@/lib/utils";
import { childCountLabel, formatSize } from "@/lib/ged/format";
import {
  dateBucket,
  folderAccent,
  mimeKind,
  type GedGroupBy,
  type GedSortDir,
  type GedSortKey,
  type GedViewMode,
} from "@/lib/ged/view-prefs";

export type GedFolderRow = {
  id: string;
  name: string;
  code: string;
  path: string;
  childFolderCount: number;
  childFileCount: number;
  isProtected: boolean;
};

export type GedDocRow = {
  id: string;
  originalName: string;
  mime: string;
  size: number;
  createdAt: string;
};

export type BreadcrumbItem = { id: string; name: string };

type Entry =
  | { kind: "folder"; folder: GedFolderRow }
  | { kind: "doc"; doc: GedDocRow };

const PREFS_KEY = "msk-ged-view-prefs";

type Prefs = {
  view: GedViewMode;
  sortKey: GedSortKey;
  sortDir: GedSortDir;
  groupBy: GedGroupBy;
};

const DEFAULT_PREFS: Prefs = {
  view: "list",
  sortKey: "name",
  sortDir: "asc",
  groupBy: "none",
};

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function GedBrowser({
  folderId,
  breadcrumbs,
  folders,
  documents,
  canUpload,
  canDelete,
  canManageFolders,
}: {
  folderId: string | null;
  breadcrumbs: BreadcrumbItem[];
  folders: GedFolderRow[];
  documents: GedDocRow[];
  canUpload: boolean;
  canDelete: boolean;
  canManageFolders: boolean;
  yearRootId: string | null;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<GedFolderRow | null>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);

  useEffect(() => {
    setPrefs(loadPrefs());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs, hydrated]);

  useEffect(() => {
    setPendingHref(null);
  }, [folderId]);

  const empty = folders.length === 0 && documents.length === 0;

  const entries = useMemo(() => {
    const list: Entry[] = [
      ...folders.map((folder) => ({ kind: "folder" as const, folder })),
      ...documents.map((doc) => ({ kind: "doc" as const, doc })),
    ];
    return sortEntries(list, prefs.sortKey, prefs.sortDir);
  }, [folders, documents, prefs.sortKey, prefs.sortDir]);

  const groups = useMemo(
    () => groupEntries(entries, prefs.groupBy),
    [entries, prefs.groupBy],
  );

  function folderHref(id: string) {
    return `/ged?folder=${id}`;
  }

  function updatePrefs(patch: Partial<Prefs>) {
    setPrefs((p) => ({ ...p, ...patch }));
  }

  async function runBusy(fn: () => Promise<void>) {
    if (pending) return;
    setPending(true);
    try {
      await fn();
    } finally {
      setPending(false);
    }
  }

  async function onUpload(formData: FormData) {
    setError(null);
    setMessage(null);
    await runBusy(async () => {
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

  async function onCreateFolder(formData: FormData) {
    setError(null);
    setMessage(null);
    await runBusy(async () => {
      const res = await createFolderAction(formData);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setMessage(res.message ?? "OK");
      setFolderOpen(false);
      router.refresh();
    });
  }

  async function onRenameFolder(formData: FormData) {
    setError(null);
    setMessage(null);
    await runBusy(async () => {
      const res = await renameFolderAction(formData);
      if (!res.ok) {
        setError(res.error ?? "Échec");
        return;
      }
      setMessage(res.message ?? "OK");
      setRenameTarget(null);
      router.refresh();
    });
  }

  async function onDeleteFolder(folder: GedFolderRow) {
    if (folder.isProtected) {
      setError("Ce dossier système ne peut pas être supprimé");
      return;
    }
    setError(null);
    setMessage(null);
    const fd = new FormData();
    fd.set("folderId", folder.id);
    const ok = await confirm({
      title: "Supprimer ce dossier ?",
      description: `« ${folder.name} » et ses sous-dossiers seront définitivement retirés. Les fichiers seront mis à la corbeille.`,
      confirmLabel: "Supprimer",
      cancelLabel: "Annuler",
      loadingLabel: "Suppression…",
      tone: "danger",
      icon: "trash",
      action: async () => {
        const res = await deleteFolderAction(fd);
        if (!res.ok) throw new Error(res.error ?? "Échec");
        setMessage(res.message ?? "OK");
      },
    });
    if (!ok) return;
    startTransition(() => {
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

  async function onDelete(id: string, name?: string) {
    setError(null);
    setMessage(null);
    const fd = new FormData();
    fd.set("documentId", id);
    const ok = await confirm({
      title: "Mettre à la corbeille ?",
      description: name
        ? `« ${name} » sera retiré de ce dossier (soft-delete).`
        : "Ce document sera retiré de ce dossier (soft-delete).",
      confirmLabel: "Corbeille",
      cancelLabel: "Annuler",
      loadingLabel: "Mise à la corbeille…",
      tone: "danger",
      icon: "trash",
      action: async () => {
        const res = await softDeleteDocumentAction(null, fd);
        if (!res.ok) throw new Error(res.error ?? "Échec");
        setMessage(res.message ?? "OK");
      },
    });
    if (!ok) return;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="relative space-y-3">
      {pending ? (
        <div
          className="absolute inset-0 z-20 flex items-start justify-center rounded-xl bg-white/70 pt-24 backdrop-blur-[2px]"
          aria-live="polite"
          aria-busy
        >
          <div className="flex items-center gap-2 rounded-full border border-msk-ink/10 bg-white px-4 py-2 text-sm text-msk-ink shadow-md">
            <Loader2 className="h-4 w-4 animate-spin text-msk-blue" />
            Mise à jour…
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Fil d’Ariane"
          className="flex min-w-0 flex-wrap items-center gap-1 text-sm"
        >
          <Link
            href="/ged"
            prefetch={false}
            scroll={false}
            onClick={() => setPendingHref("/ged")}
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
                <Link
                  href={folderHref(c.id)}
                  prefetch={false}
                  scroll={false}
                  onClick={() => setPendingHref(folderHref(c.id))}
                  className="cursor-pointer truncate text-msk-blue hover:underline"
                >
                  {c.name}
                </Link>
              )}
            </span>
          ))}
          {pendingHref ? (
            <span
              className="ml-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-msk-blue/30 border-t-msk-blue"
              aria-hidden
            />
          ) : null}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {canManageFolders && folderId ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setFolderOpen(true)}
            >
              <FolderPlus className="h-4 w-4" />
              Nouveau dossier
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

      <GedToolbar
        view={prefs.view}
        sortKey={prefs.sortKey}
        sortDir={prefs.sortDir}
        groupBy={prefs.groupBy}
        onView={(view) => updatePrefs({ view })}
        onSort={(sortKey, sortDir) =>
          updatePrefs({
            sortKey,
            ...(sortDir ? { sortDir } : {}),
          })
        }
        onGroup={(groupBy) => updatePrefs({ groupBy })}
      />

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
                {folderId
                  ? "Créez un sous-dossier ou déposez un fichier."
                  : "Sélectionnez un dossier pour explorer."}
              </p>
              {canManageFolders && folderId ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => setFolderOpen(true)}
                >
                  <FolderPlus className="h-4 w-4" />
                  Nouveau dossier
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="divide-y divide-msk-ink/6">
              {groups.map((g) => (
                <div key={g.label || "all"}>
                  {prefs.groupBy !== "none" ? (
                    <div className="sticky top-0 z-[1] border-b border-msk-ink/4 bg-msk-chalk/80 px-4 py-2 backdrop-blur-sm">
                      <p className="text-xs font-semibold uppercase tracking-caps text-msk-ink/45">
                        {g.label}
                        <span className="ml-2 font-normal normal-case tracking-normal text-msk-ink/30">
                          {g.items.length}
                        </span>
                      </p>
                    </div>
                  ) : null}
                  {prefs.view === "tiles" ? (
                    <ul className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {g.items.map((entry) =>
                        entry.kind === "folder" ? (
                          <FolderTile
                            key={entry.folder.id}
                            folder={entry.folder}
                            href={folderHref(entry.folder.id)}
                            pending={pendingHref === folderHref(entry.folder.id)}
                            canManage={canManageFolders}
                            busy={pending}
                            onNavigate={() =>
                              setPendingHref(folderHref(entry.folder.id))
                            }
                            onRename={() => setRenameTarget(entry.folder)}
                            onDelete={() => onDeleteFolder(entry.folder)}
                          />
                        ) : (
                          <DocTile
                            key={entry.doc.id}
                            doc={entry.doc}
                            canDelete={canDelete}
                            pending={pending}
                            onPreview={() => setPreview(entry.doc)}
                            onDownload={() => onDownload(entry.doc.id)}
                            onDelete={() =>
                              onDelete(entry.doc.id, entry.doc.originalName)
                            }
                          />
                        ),
                      )}
                    </ul>
                  ) : (
                    <ul
                      className={cn(
                        prefs.view === "compact"
                          ? "divide-y divide-msk-ink/4"
                          : "divide-y divide-msk-ink/6",
                      )}
                    >
                      {g.items.map((entry) =>
                        entry.kind === "folder" ? (
                          <FolderRow
                            key={entry.folder.id}
                            folder={entry.folder}
                            href={folderHref(entry.folder.id)}
                            compact={prefs.view === "compact"}
                            pending={pendingHref === folderHref(entry.folder.id)}
                            canManage={canManageFolders}
                            busy={pending}
                            onNavigate={() =>
                              setPendingHref(folderHref(entry.folder.id))
                            }
                            onRename={() => setRenameTarget(entry.folder)}
                            onDelete={() => onDeleteFolder(entry.folder)}
                          />
                        ) : (
                          <DocRow
                            key={entry.doc.id}
                            doc={entry.doc}
                            compact={prefs.view === "compact"}
                            canDelete={canDelete}
                            pending={pending}
                            onPreview={() => setPreview(entry.doc)}
                            onDownload={() => onDownload(entry.doc.id)}
                            onDelete={() =>
                              onDelete(entry.doc.id, entry.doc.originalName)
                            }
                          />
                        ),
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <GedPreviewModal
        doc={preview}
        open={!!preview}
        onOpenChange={(o) => {
          if (!o) setPreview(null);
        }}
      />

      <SideDrawer
        open={!!renameTarget}
        onOpenChange={(o) => {
          if (!o) setRenameTarget(null);
        }}
        title="Renommer le dossier"
        description={
          renameTarget?.isProtected
            ? "Dossier système : seul le nom affiché change."
            : "Le nom et le chemin interne seront mis à jour."
        }
      >
        {renameTarget ? (
          <form action={onRenameFolder} className="space-y-4" key={renameTarget.id}>
            <input type="hidden" name="folderId" value={renameTarget.id} />
            <div>
              <label
                htmlFor="rename-folder-name"
                className="mb-1.5 block text-sm font-medium text-msk-ink"
              >
                Nom
              </label>
              <input
                id="rename-folder-name"
                name="name"
                type="text"
                required
                maxLength={120}
                defaultValue={renameTarget.name}
                className="w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm text-msk-ink outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/20"
              />
            </div>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </form>
        ) : null}
      </SideDrawer>

      {folderId ? (
        <>
          <SideDrawer
            open={folderOpen}
            onOpenChange={setFolderOpen}
            title="Nouveau dossier"
            description="Créé comme enfant direct du dossier courant."
          >
            <form action={onCreateFolder} className="space-y-4">
              <input type="hidden" name="parentId" value={folderId} />
              <div>
                <label
                  htmlFor="folder-name"
                  className="mb-1.5 block text-sm font-medium text-msk-ink"
                >
                  Nom du dossier
                </label>
                <input
                  id="folder-name"
                  name="name"
                  type="text"
                  required
                  maxLength={120}
                  placeholder="Ex. Client ACME"
                  className="w-full rounded-lg border border-msk-ink/15 bg-white px-3 py-2 text-sm text-msk-ink outline-none focus:border-msk-blue focus:ring-2 focus:ring-msk-blue/20"
                />
              </div>
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "Création…" : "Créer"}
              </Button>
            </form>
          </SideDrawer>

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
        </>
      ) : null}
    </div>
  );
}

function sortEntries(
  list: Entry[],
  key: GedSortKey,
  dir: GedSortDir,
): Entry[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    if (key === "name" || key === "type") {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    }
    const av = entrySortValue(a, key);
    const bv = entrySortValue(b, key);
    if (typeof av === "number" && typeof bv === "number") {
      return (av - bv) * mul;
    }
    return (
      String(av).localeCompare(String(bv), "fr", { sensitivity: "base" }) * mul
    );
  });
}

function entrySortValue(e: Entry, key: GedSortKey): string | number {
  if (e.kind === "folder") {
    switch (key) {
      case "name":
        return e.folder.name;
      case "type":
        return "0-folder";
      case "size":
        return e.folder.childFolderCount + e.folder.childFileCount;
      case "date":
        return 0;
    }
  }
  switch (key) {
    case "name":
      return e.doc.originalName;
    case "type":
      return mimeKind(e.doc.mime);
    case "size":
      return e.doc.size;
    case "date":
      return new Date(e.doc.createdAt).getTime();
  }
}

function groupEntries(
  entries: Entry[],
  groupBy: GedGroupBy,
): { label: string; items: Entry[] }[] {
  if (groupBy === "none") return [{ label: "", items: entries }];

  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    let label: string;
    if (groupBy === "kind") {
      label = e.kind === "folder" ? "Dossiers" : "Fichiers";
    } else if (groupBy === "type") {
      label = e.kind === "folder" ? "Dossiers" : mimeKind(e.doc.mime);
    } else {
      label = e.kind === "folder" ? "Dossiers" : dateBucket(e.doc.createdAt);
    }
    const list = map.get(label) ?? [];
    list.push(e);
    map.set(label, list);
  }

  const order =
    groupBy === "kind"
      ? ["Dossiers", "Fichiers"]
      : [...map.keys()].sort((a, b) => {
          if (a === "Dossiers") return -1;
          if (b === "Dossiers") return 1;
          return a.localeCompare(b, "fr");
        });

  return order
    .filter((k) => map.has(k))
    .map((label) => ({ label, items: map.get(label)! }));
}

function FolderRow({
  folder,
  href,
  compact,
  pending,
  canManage,
  busy,
  onNavigate,
  onRename,
  onDelete,
}: {
  folder: GedFolderRow;
  href: string;
  compact: boolean;
  pending: boolean;
  canManage: boolean;
  busy: boolean;
  onNavigate: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const meta = childCountLabel(folder.childFolderCount, folder.childFileCount);
  return (
    <li
      className={cn(
        "flex items-center gap-1 hover:bg-msk-chalk/80",
        compact ? "pr-2" : "pr-3",
        pending && "bg-msk-blue/4",
      )}
    >
      <Link
        href={href}
        prefetch={false}
        scroll={false}
        onClick={onNavigate}
        className={cn(
          "flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left",
          compact ? "px-3 py-1.5" : "px-4 py-3",
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-lg",
            compact ? "h-7 w-7" : "h-9 w-9",
            folderAccent(folder.code),
          )}
        >
          <Folder className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate font-medium text-msk-ink",
              compact && "text-sm",
            )}
          >
            {folder.name}
          </span>
          {!compact ? (
            <span className="block truncate text-xs text-msk-ink/40">{meta}</span>
          ) : (
            <span className="block text-[11px] text-msk-ink/35">{meta}</span>
          )}
        </span>
        {pending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-msk-blue/30 border-t-msk-blue" />
        ) : (
          <ChevronRight className="h-4 w-4 text-msk-ink/25" />
        )}
      </Link>
      {canManage ? (
        <div className="flex shrink-0 gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRename}
            aria-label="Renommer"
            disabled={busy}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!folder.isProtected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label="Supprimer"
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5 text-msk-coral" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function DocRow({
  doc,
  compact,
  canDelete,
  pending,
  onPreview,
  onDownload,
  onDelete,
}: {
  doc: GedDocRow;
  compact: boolean;
  canDelete: boolean;
  pending: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const Icon = docIcon(doc.mime);
  return (
    <li
      className={cn(
        "flex items-center gap-3 hover:bg-msk-chalk/50",
        compact ? "px-3 py-1.5" : "px-4 py-3",
      )}
    >
      <button
        type="button"
        onClick={onPreview}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-lg bg-msk-ink/5 text-msk-ink/60",
            compact ? "h-7 w-7" : "h-9 w-9",
          )}
        >
          <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate font-medium text-msk-ink hover:text-msk-blue",
              compact && "text-sm",
            )}
          >
            {doc.originalName}
          </span>
          {!compact ? (
            <span className="block text-xs text-msk-ink/40">
              {mimeKind(doc.mime)} · {formatSize(doc.size)} ·{" "}
              {new Date(doc.createdAt).toLocaleString("fr-FR")}
            </span>
          ) : (
            <span className="block text-[11px] text-msk-ink/35">
              {formatSize(doc.size)}
            </span>
          )}
        </span>
      </button>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onPreview}
          aria-label="Aperçu"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDownload}
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
            onClick={onDelete}
            aria-label="Corbeille"
          >
            <Trash2 className="h-4 w-4 text-msk-coral" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function FolderTile({
  folder,
  href,
  pending,
  canManage,
  busy,
  onNavigate,
  onRename,
  onDelete,
}: {
  folder: GedFolderRow;
  href: string;
  pending: boolean;
  canManage: boolean;
  busy: boolean;
  onNavigate: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const meta = childCountLabel(folder.childFolderCount, folder.childFileCount);
  return (
    <li className="relative flex flex-col rounded-xl border border-msk-ink/6 bg-white">
      <Link
        href={href}
        prefetch={false}
        scroll={false}
        onClick={onNavigate}
        className={cn(
          "flex flex-1 cursor-pointer flex-col items-center gap-2 p-4 text-center transition hover:border-msk-blue/25",
          pending && "bg-msk-blue/3",
        )}
      >
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl",
            folderAccent(folder.code),
          )}
        >
          <Folder className="h-6 w-6" />
        </span>
        <span className="line-clamp-2 text-sm font-medium text-msk-ink">
          {folder.name}
        </span>
        <span className="text-[11px] text-msk-ink/40">{meta}</span>
      </Link>
      {canManage ? (
        <div className="flex justify-center gap-1 border-t border-msk-ink/5 px-2 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRename}
            aria-label="Renommer"
            disabled={busy}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {!folder.isProtected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              aria-label="Supprimer"
              disabled={busy}
            >
              <Trash2 className="h-3.5 w-3.5 text-msk-coral" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function DocTile({
  doc,
  canDelete,
  pending,
  onPreview,
  onDownload,
  onDelete,
}: {
  doc: GedDocRow;
  canDelete: boolean;
  pending: boolean;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const Icon = docIcon(doc.mime);
  return (
    <li className="flex flex-col rounded-xl border border-msk-ink/6 bg-white p-4">
      <button
        type="button"
        onClick={onPreview}
        className="mb-3 flex h-20 w-full cursor-pointer items-center justify-center rounded-lg bg-msk-chalk/80 transition hover:bg-msk-blue/10"
      >
        <Icon className="h-8 w-8 text-msk-ink/40" />
      </button>
      <button
        type="button"
        onClick={onPreview}
        className="line-clamp-2 cursor-pointer text-left text-sm font-medium text-msk-ink hover:text-msk-blue"
      >
        {doc.originalName}
      </button>
      <p className="mt-1 text-[11px] text-msk-ink/40">
        {formatSize(doc.size)} ·{" "}
        {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
      </p>
      <div className="mt-auto flex gap-1 pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={onPreview}
          aria-label="Aperçu"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex-1"
          onClick={onDownload}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={onDelete}
            aria-label="Corbeille"
          >
            <Trash2 className="h-3.5 w-3.5 text-msk-coral" />
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function docIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  if (mime.includes("sheet") || mime.includes("excel")) return FileSpreadsheet;
  return File;
}
