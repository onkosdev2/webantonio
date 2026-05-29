import { McpConsole } from "@/components/admin/mcp-console";
import { AdminShell } from "@/components/admin/admin-shell";

export default function PanelMcpPage() {
  return (
    <AdminShell
      title="Consola MCP"
      subtitle="Cabina para inspeccionar recursos y ejecutar tools MCP sobre el archivo oncológico sin salir de la plataforma."
    >
      <McpConsole />
    </AdminShell>
  );
}
