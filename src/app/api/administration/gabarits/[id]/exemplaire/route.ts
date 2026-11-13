import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/rbac/resolve";
import { prisma } from "@/lib/prisma";
import {
  assertExemplaireAvailable,
  generateSamplePdfForTemplate,
} from "@/lib/studio/generate-sample-pdf";
import type { DrawHeaderOptions } from "@/lib/pdf/rh";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET — PDF d’exemplaire (données par défaut du catalogue variables /
 * jeux démo legacy). Query : `signature=1` force l’aperçu signature ON.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    if (!hasPermission(user, "cfg.templates")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const template = await prisma.documentTemplate.findUnique({
      where: { id },
      include: { publishedVersion: true },
    });
    if (!template) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    assertExemplaireAvailable(template);

    const url = new URL(request.url);
    const signatureOverride =
      url.searchParams.get("signature") === "1"
        ? true
        : url.searchParams.get("signature") === "0"
          ? false
          : undefined;

    const pdfBytes = await generateSamplePdfForTemplate(template, {
      ownerUserId: user.id,
      ownerDisplayName: `${user.firstName} ${user.lastName}`,
      signatureOverride,
    });

    const safeCode = template.code.replace(/[^a-z0-9_-]+/gi, "_");
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="exemplaire_${safeCode}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Connectez")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "Erreur génération";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/**
 * POST — Aperçu Playground (corps / en-tête / logo éditables, sans persister).
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    if (!hasPermission(user, "cfg.templates")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const template = await prisma.documentTemplate.findUnique({
      where: { id },
      include: { publishedVersion: true },
    });
    if (!template) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (!template.active) {
      return NextResponse.json({ error: "Gabarit inactif" }, { status: 400 });
    }

    const body = (await request.json()) as {
      bodyText?: string;
      headerTitle?: string;
      logoAlign?: DrawHeaderOptions["logoAlign"];
      signaturePreview?: boolean;
    };

    if (template.generatorKind !== "ENGINE_BLOCKS") {
      return NextResponse.json(
        { error: "Playground éditable réservé aux gabarits Studio (blocs)." },
        { status: 400 },
      );
    }

    const pdfBytes = await generateSamplePdfForTemplate(template, {
      ownerUserId: user.id,
      ownerDisplayName: `${user.firstName} ${user.lastName}`,
      signatureOverride: body.signaturePreview ?? false,
      playground: {
        bodyText: body.bodyText,
        headerTitle: body.headerTitle,
        logoAlign: body.logoAlign,
      },
    });

    const safeCode = template.code.replace(/[^a-z0-9_-]+/gi, "_");
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="playground_${safeCode}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Connectez")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const message = e instanceof Error ? e.message : "Erreur aperçu";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
