import { SiteHeaderClient } from "@/components/layout/site-header-client";
import { getCurrentUser } from "@/lib/auth/session";

export async function SiteHeader({ editHref }: { editHref?: string }) {
  const user = await getCurrentUser();

  return <SiteHeaderClient isAuthenticated={Boolean(user)} editHref={user ? editHref : undefined} />;
}
