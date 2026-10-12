import { requireUser } from "@/lib/auth/session";
import { commercialNavItems } from "@/lib/commercial/nav";
import { CommercialSubnav } from "@/components/commercial/commercial-subnav";

/** Sous-nav filtrée selon l’utilisateur (Server Component). */
export async function CommercialNav() {
  const user = await requireUser();
  const items = commercialNavItems(user);
  return <CommercialSubnav items={items} />;
}
