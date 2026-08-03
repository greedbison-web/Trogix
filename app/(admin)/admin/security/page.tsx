import { getAdmins, getAuditLogs, getImpersonationSessions } from "@/lib/queries/admin";
import { requireAdmin, can, CAPABILITIES } from "@/lib/admin/auth";
import { PageHeader, Panel, TableShell, Pill, EmptyRow } from "../ui";
import { AdminControls } from "./AdminControls";

export const metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const admin = await requireAdmin("audit.read");

  let admins: Awaited<ReturnType<typeof getAdmins>> = [];
  let logs: Awaited<ReturnType<typeof getAuditLogs>> = [];
  let sessions: Awaited<ReturnType<typeof getImpersonationSessions>> = [];
  try {
    [admins, logs, sessions] = await Promise.all([
      getAdmins(),
      getAuditLogs(150),
      getImpersonationSessions(30),
    ]);
  } catch {
    admins = [];
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Security"
        subtitle="Who can reach the platform, what they did, and which sessions are open."
      />

      <AdminControls
        admins={admins.map((a) => ({
          id: a.id,
          email: a.email,
          fullName: a.fullName,
          role: a.role,
          status: a.status,
          lastSeenAt: a.lastSeenAt ? a.lastSeenAt.toISOString() : null,
        }))}
        sessions={sessions.map((s) => ({
          id: s.id,
          businessName: s.businessName,
          adminEmail: s.adminEmail,
          reason: s.reason,
          expiresAt: s.expiresAt.toISOString(),
          revokedAt: s.revokedAt ? s.revokedAt.toISOString() : null,
        }))}
        currentAdminId={admin.adminId}
        canManage={can(admin.role, "admins.manage")}
        canRevoke={can(admin.role, "impersonate")}
      />

      <Panel title="Role permissions">
        <TableShell head={["Capability", "Owner", "Admin", "Support", "Read-only"]}>
          {Object.entries(CAPABILITIES).map(([capability, roles]) => (
            <tr key={capability}>
              <td className="px-5 py-3 text-caption text-ink">{capability}</td>
              {(["owner", "admin", "support", "readonly"] as const).map((role) => (
                <td key={role} className="px-5 py-3 text-caption">
                  {(roles as readonly string[]).includes(role) ? (
                    <span className="text-accent-deep">Yes</span>
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </TableShell>
      </Panel>

      <Panel title="Audit log">
        {logs.length === 0 ? (
          <EmptyRow>No admin actions recorded.</EmptyRow>
        ) : (
          <TableShell head={["Action", "Admin", "Target", "IP", "When"]}>
            {logs.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3 text-caption text-ink">{row.action}</td>
                <td className="px-5 py-3 text-micro text-ink-500">
                  {row.adminEmail ?? "—"}
                </td>
                <td className="px-5 py-3 text-micro text-ink-700">
                  {row.businessName ?? row.targetType ?? "—"}
                </td>
                <td className="px-5 py-3 text-micro tabular-nums text-ink-300">
                  {row.ipAddress ?? "—"}
                </td>
                <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                  {row.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </div>
  );
}
