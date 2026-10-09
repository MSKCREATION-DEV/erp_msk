export const USER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  INVITE_PENDING: "Invitation",
  MUST_CHANGE_PASSWORD: "MDP requis",
  SUSPENDED: "Suspendu",
  ARCHIVED: "Archivé",
};

export const USER_STATUS_TONE: Record<
  string,
  "blue" | "ink" | "coral" | "muted" | "success"
> = {
  ACTIVE: "success",
  INVITE_PENDING: "blue",
  MUST_CHANGE_PASSWORD: "ink",
  SUSPENDED: "coral",
  ARCHIVED: "muted",
};
