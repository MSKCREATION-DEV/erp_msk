import { Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/ui/user-avatar";
import { USER_STATUS_LABEL, USER_STATUS_TONE } from "@/lib/users/status";

export function UserProfileCard({
  firstName,
  lastName,
  email,
  phone,
  status,
  isSuperAdmin,
  permissionCount,
  groupCodes,
  packCodes,
}: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: string;
  isSuperAdmin: boolean;
  permissionCount: number;
  groupCodes: string[];
  packCodes: string[];
}) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 brand-gradient" />
      <CardContent className="pt-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <UserAvatar
              firstName={firstName}
              lastName={lastName}
              size="xl"
              className="ring-2 ring-white shadow-md shadow-msk-ink/10"
            />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold tracking-tight text-msk-ink">
                {firstName} {lastName}
              </h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Badge tone={USER_STATUS_TONE[status] ?? "ink"}>
                  {USER_STATUS_LABEL[status] ?? status}
                </Badge>
                {isSuperAdmin ? <Badge tone="blue">Super Admin</Badge> : null}
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-msk-ink/55">
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-msk-blue" />
                  <a
                    href={`mailto:${email}`}
                    className="cursor-pointer truncate hover:text-msk-blue"
                  >
                    {email}
                  </a>
                </li>
                {phone ? (
                  <li className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-msk-blue" />
                    <span>{phone}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:min-w-[280px]">
            <Stat label="Permissions" value={String(permissionCount)} />
            <Stat label="Groupes" value={String(groupCodes.length)} />
            <Stat label="Packs" value={String(packCodes.length)} />
          </div>
        </div>

        {(groupCodes.length > 0 || packCodes.length > 0) && (
          <>
            <Separator className="my-5" />
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
              {groupCodes.length > 0 ? (
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-msk-ink/35">
                    Groupes
                  </p>
                  <p className="mt-1 truncate text-sm text-msk-ink/70">
                    {groupCodes.join(", ")}
                  </p>
                </div>
              ) : null}
              {packCodes.length > 0 ? (
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-msk-ink/35">
                    Packs
                  </p>
                  <p className="mt-1 truncate text-sm text-msk-ink/70">
                    {packCodes.join(", ")}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-msk-chalk/80 px-3 py-2.5 text-center">
      <p className="text-lg font-semibold tabular-nums text-msk-ink">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-msk-ink/40">
        {label}
      </p>
    </div>
  );
}
