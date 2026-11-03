/** Horaires théoriques MSK — calculs purs (pas de badgeuse V1). */

export type WorkScheduleConfig = {
  code: string;
  label: string;
  weeklyHours: number;
  /** ISO weekday 1=lundi … 7=dimanche. */
  workDays: number[];
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
};

export const DEFAULT_SCHEDULE_CODE = "msk_default";

export const FALLBACK_WORK_SCHEDULE: WorkScheduleConfig = {
  code: DEFAULT_SCHEDULE_CODE,
  label: "Horaire collectif MSK",
  weeklyHours: 40,
  workDays: [1, 2, 3, 4, 5],
  startTime: "08:00",
  endTime: "17:00",
  breakStart: "13:00",
  breakEnd: "14:00",
};

/** Parse "HH:MM" → minutes depuis minuit. */
export function parseTimeToMinutes(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 0;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return 0;
  return h * 60 + min;
}

export function dailyTheoreticalMinutes(schedule: WorkScheduleConfig): number {
  const span =
    parseTimeToMinutes(schedule.endTime) -
    parseTimeToMinutes(schedule.startTime);
  const brk =
    parseTimeToMinutes(schedule.breakEnd) -
    parseTimeToMinutes(schedule.breakStart);
  const raw = Math.max(0, span - Math.max(0, brk));
  if (schedule.workDays.length === 0) return 0;
  // Cohérence : weeklyHours / nb jours si défini, sinon plage horaire
  const fromWeekly = Math.round(
    (schedule.weeklyHours * 60) / schedule.workDays.length,
  );
  return fromWeekly > 0 ? fromWeekly : raw;
}

export function parseWorkDaysJson(raw: string | null | undefined): number[] {
  if (!raw) return [...FALLBACK_WORK_SCHEDULE.workDays];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...FALLBACK_WORK_SCHEDULE.workDays];
    return parsed
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
  } catch {
    return [...FALLBACK_WORK_SCHEDULE.workDays];
  }
}

export function toWorkScheduleConfig(row: {
  code: string;
  label: string;
  weeklyHours: number;
  workDaysJson: string;
  startTime: string;
  endTime: string;
  breakStart: string;
  breakEnd: string;
}): WorkScheduleConfig {
  return {
    code: row.code,
    label: row.label,
    weeklyHours: row.weeklyHours,
    workDays: parseWorkDaysJson(row.workDaysJson),
    startTime: row.startTime,
    endTime: row.endTime,
    breakStart: row.breakStart,
    breakEnd: row.breakEnd,
  };
}

/** ISO weekday 1–7 for a Date (UTC date parts). */
export function isoWeekdayUtc(date: Date): number {
  const d = date.getUTCDay(); // 0=dim … 6=sam
  return d === 0 ? 7 : d;
}

export function isWorkDay(
  date: Date,
  schedule: WorkScheduleConfig,
  holidayDates?: Set<string>,
): boolean {
  if (!schedule.workDays.includes(isoWeekdayUtc(date))) return false;
  if (holidayDates?.has(date.toISOString().slice(0, 10))) return false;
  return true;
}

export function theoreticalMinutesForDate(
  date: Date,
  schedule: WorkScheduleConfig,
  holidayDates?: Set<string>,
): number {
  if (!isWorkDay(date, schedule, holidayDates)) return 0;
  return dailyTheoreticalMinutes(schedule);
}

export type DayHoursCompare = {
  date: Date;
  dateKey: string;
  theoreticalMinutes: number;
  declaredMinutes: number;
  isWorkDay: boolean;
  isHoliday: boolean;
  deltaMinutes: number;
};

/** Compare théorique vs déclaré pour une liste de jours (ordre chronologique). */
export function compareWeekHours(
  days: Date[],
  schedule: WorkScheduleConfig,
  declaredByDate: Map<string, number>,
  holidayDates: Set<string> = new Set(),
): DayHoursCompare[] {
  return days.map((date) => {
    const dateKey = date.toISOString().slice(0, 10);
    const holiday = holidayDates.has(dateKey);
    const work = isWorkDay(date, schedule, holidayDates);
    const theoretical = theoreticalMinutesForDate(
      date,
      schedule,
      holidayDates,
    );
    const declared = declaredByDate.get(dateKey) ?? 0;
    return {
      date,
      dateKey,
      theoreticalMinutes: theoretical,
      declaredMinutes: declared,
      isWorkDay: work,
      isHoliday: holiday,
      deltaMinutes: declared - theoretical,
    };
  });
}

export function sumTheoreticalWeek(
  weekStartMonday: Date,
  schedule: WorkScheduleConfig,
  holidayDates?: Set<string>,
): number {
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStartMonday);
    d.setUTCDate(d.getUTCDate() + i);
    total += theoreticalMinutesForDate(d, schedule, holidayDates);
  }
  return total;
}
