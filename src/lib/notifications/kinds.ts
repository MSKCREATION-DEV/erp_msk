/** Kinds actionnables → push Realtime + refresh files à traiter. */
export const ACTIONABLE_NOTIFICATION_KINDS = [
  "crm.assignment_request",
  "crm.assigned",
  "crm.assignment_resolved",
  "iam.user_created",
] as const;

export type ActionableNotificationKind =
  (typeof ACTIONABLE_NOTIFICATION_KINDS)[number];

export function isActionableNotificationKind(kind: string): boolean {
  return (ACTIONABLE_NOTIFICATION_KINDS as readonly string[]).includes(kind);
}

/** Kinds qui envoient aussi un e-mail (V1 validé + resolved). */
export const EMAIL_NOTIFICATION_KINDS = [
  "crm.assignment_request",
  "crm.assigned",
  "crm.assignment_resolved",
  "crm.followup_overdue",
] as const;

export function shouldEmailNotificationKind(kind: string): boolean {
  return (EMAIL_NOTIFICATION_KINDS as readonly string[]).includes(kind);
}
