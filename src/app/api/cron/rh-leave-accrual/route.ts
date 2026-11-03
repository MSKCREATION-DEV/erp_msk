import { NextResponse } from "next/server";
import {
  previousUtcMonth,
  runMonthlyLeaveAccrual,
} from "@/lib/rh/leave-ledger";

export const dynamic = "force-dynamic";

/**
 * Acquisition mensuelle des congés payés (+2,5 j / mois, prorata).
 * GET/POST /api/cron/rh-leave-accrual
 * Auth : Bearer CRON_SECRET
 * Optionnel : ?year=2026&month=10 pour forcer un mois (UTC).
 */
export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}

async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const yRaw = url.searchParams.get("year");
  const mRaw = url.searchParams.get("month");

  let year: number;
  let month: number;
  if (yRaw && mRaw) {
    year = Number(yRaw);
    month = Number(mRaw);
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      year < 2000 ||
      year > 2100
    ) {
      return NextResponse.json({ error: "year/month invalides" }, { status: 400 });
    }
  } else {
    const prev = previousUtcMonth();
    year = prev.year;
    month = prev.month;
  }

  const result = await runMonthlyLeaveAccrual(year, month);
  return NextResponse.json({ ok: true, ...result });
}
