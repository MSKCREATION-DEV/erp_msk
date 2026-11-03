import { prisma } from "@/lib/prisma";
import {
  DEFAULT_SCHEDULE_CODE,
  FALLBACK_WORK_SCHEDULE,
  toWorkScheduleConfig,
  type WorkScheduleConfig,
} from "@/lib/rh/work-schedule";

/** Charge l’horaire collectif MSK (fallback mémoire si seed absent). */
export async function getDefaultWorkSchedule(): Promise<WorkScheduleConfig> {
  const row = await prisma.rhWorkSchedule.findFirst({
    where: { active: true, code: DEFAULT_SCHEDULE_CODE },
  });
  if (!row) {
    const any = await prisma.rhWorkSchedule.findFirst({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
    if (!any) return FALLBACK_WORK_SCHEDULE;
    return toWorkScheduleConfig(any);
  }
  return toWorkScheduleConfig(row);
}

/** Jours fériés sur une plage [from, to] inclus (dates UTC). */
export async function getHolidayDateKeys(
  from: Date,
  to: Date,
): Promise<Set<string>> {
  const rows = await prisma.rhPublicHoliday.findMany({
    where: {
      date: { gte: from, lte: to },
    },
    select: { date: true },
  });
  return new Set(rows.map((r) => r.date.toISOString().slice(0, 10)));
}
