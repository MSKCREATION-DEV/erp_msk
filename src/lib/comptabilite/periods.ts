import { prisma } from "@/lib/prisma";

export async function ensureExercisePeriods(year: number) {
  const exercise = await prisma.cptExercise.upsert({
    where: { year },
    create: { year, status: "OPEN" },
    update: {},
  });
  for (let month = 1; month <= 12; month++) {
    await prisma.cptPeriod.upsert({
      where: { exerciseId_month: { exerciseId: exercise.id, month } },
      create: { exerciseId: exercise.id, month, status: "OPEN" },
      update: {},
    });
  }
  return exercise;
}

export async function ensureCurrentExercisePeriods() {
  return ensureExercisePeriods(new Date().getFullYear());
}

/** Résout une période OPEN pour la date ; provisionne l’exercice si besoin. */
export async function resolveOpenPeriodForDate(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  let period = await prisma.cptPeriod.findFirst({
    where: {
      month,
      status: "OPEN",
      exercise: { year, status: "OPEN" },
    },
    include: { exercise: true },
  });

  if (!period) {
    const exercise = await ensureExercisePeriods(year);
    if (exercise.status === "CLOSED") return null;
    period = await prisma.cptPeriod.findFirst({
      where: {
        exerciseId: exercise.id,
        month,
        status: "OPEN",
      },
      include: { exercise: true },
    });
  }

  return period;
}
