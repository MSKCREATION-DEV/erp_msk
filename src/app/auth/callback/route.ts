import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { UserStatus } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const SAFE_NEXT = "/reinitialiser-mot-de-passe";

function safeNextPath(raw: string | null): string {
  if (!raw) return SAFE_NEXT;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return SAFE_NEXT;
}

/**
 * Après recovery : forcer le changement de MDP (évite de naviguer dans l’ERP
 * avec une session recovery sans nouveau mot de passe).
 */
async function forceMustChangePassword(userId: string) {
  await prisma.user.updateMany({
    where: {
      id: userId,
      status: {
        notIn: [UserStatus.ARCHIVED, UserStatus.SUSPENDED],
      },
    },
    data: { mustChangePassword: true },
  });
}

/**
 * Callback Auth (recovery) — `code` (PKCE) ou `token_hash`+`type` (e-mail custom),
 * puis redirect vers la page nouveau MDP.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"));
  const isRecoveryIntent =
    type === "recovery" || next.includes("reinitialiser");

  const supabase = await createClient();
  let sessionOk = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    sessionOk = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    sessionOk = !error;
  } else if (searchParams.get("session_ready") === "1") {
    // Cookies déjà posés par le client (hash `#access_token`)
    const {
      data: { user },
    } = await supabase.auth.getUser();
    sessionOk = Boolean(user);
  }

  if (sessionOk) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && isRecoveryIntent) {
      try {
        await forceMustChangePassword(user.id);
      } catch {
        /* best-effort : la page reset reste utilisable */
      }
    }
    return NextResponse.redirect(new URL(next, origin));
  }

  const login = new URL("/login", origin);
  login.searchParams.set("error", "lien_invalide");
  return NextResponse.redirect(login);
}
