import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminShell } from "@/components/admin/admin-shell";
import { getDashboardData } from "@/lib/content/dashboard";

export default async function PanelPage() {
  const dashboard = await getDashboardData();

  return (
    <AdminShell
      title="Dashboard Editorial"
      subtitle="Vision central del archivo oncologico, la cola de revision, las importaciones y las automatizaciones internas."
    >
      <AdminDashboard {...dashboard} />
    </AdminShell>
  );
}
