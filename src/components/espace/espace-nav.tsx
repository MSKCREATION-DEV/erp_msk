import { requireUser } from "@/lib/auth/session";
import { espaceNavItems } from "@/lib/espace/nav";
import { EspaceSubnav } from "@/components/espace/espace-subnav";

export async function EspaceNav() {
  const user = await requireUser();
  const items = espaceNavItems(user);
  return <EspaceSubnav items={items} />;
}
