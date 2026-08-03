"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setAdminRole,
  setAdminStatus,
  inviteAdmin,
  revokeImpersonation,
} from "../actions";
import { Panel, TableShell, Pill, EmptyRow } from "../ui";

const ROLES = ["owner", "admin", "support", "readonly"] as const;

type AdminView = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  lastSeenAt: string | null;
};

type SessionView = {
  id: string;
  businessName: string;
  adminEmail: string | null;
  reason: string;
  expiresAt: string;
  revokedAt: string | null;
};

export function AdminControls({
  admins,
  sessions,
  currentAdminId,
  canManage,
  canRevoke,
}: {
  admins: AdminView[];
  sessions: SessionView[];
  currentAdminId: string;
  canManage: boolean;
  canRevoke: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; message: string | null }>) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result.ok ? null : result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Platform admins"
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => setInviting((v) => !v)}
              className="h-9 rounded-full bg-ink px-3.5 text-micro font-medium text-paper"
            >
              {inviting ? "Close" : "Grant access"}
            </button>
          ) : null
        }
      >
        {notice ? (
          <p role="alert" className="px-5 pt-4 text-caption text-[var(--color-state-late)]">
            {notice}
          </p>
        ) : null}

        {inviting ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const formData = new FormData(form);
              startTransition(async () => {
                const result = await inviteAdmin(formData);
                setNotice(result.ok ? null : result.message);
                if (result.ok) {
                  form.reset();
                  setInviting(false);
                  router.refresh();
                }
              });
            }}
            className="flex flex-wrap items-end gap-3 border-b border-paper-edge p-5"
          >
            <label className="min-w-[240px] flex-1">
              <span className="text-micro font-medium text-ink-700">
                Email of an existing Trogix account
              </span>
              <input
                name="email"
                type="email"
                required
                placeholder="name@trogix.co.in"
                className="mt-2 h-11 w-full rounded-xl border border-paper-edge bg-paper px-3 text-caption outline-none focus:border-accent"
              />
            </label>
            <label>
              <span className="text-micro font-medium text-ink-700">Role</span>
              <select
                name="role"
                defaultValue="support"
                className="mt-2 h-11 rounded-xl border border-paper-edge bg-paper px-3 text-caption outline-none focus:border-accent"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-full bg-ink px-5 text-caption font-medium text-paper disabled:opacity-60"
            >
              Grant
            </button>
          </form>
        ) : null}

        {admins.length === 0 ? (
          <EmptyRow>No platform admins found.</EmptyRow>
        ) : (
          <TableShell head={["Admin", "Role", "Status", "Last seen", ""]}>
            {admins.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3">
                  <p className="text-caption text-ink">{row.fullName ?? row.email}</p>
                  <p className="mt-0.5 text-micro text-ink-500">{row.email}</p>
                </td>
                <td className="px-5 py-3">
                  {canManage && row.id !== currentAdminId ? (
                    <select
                      defaultValue={row.role}
                      disabled={pending}
                      onChange={(e) =>
                        run(() =>
                          setAdminRole(
                            row.id,
                            e.target.value as (typeof ROLES)[number],
                          ),
                        )
                      }
                      aria-label={`Role for ${row.email}`}
                      className="h-9 rounded-full border border-paper-edge bg-paper px-3 text-micro capitalize outline-none focus:border-accent"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-caption capitalize text-ink-700">
                      {row.role}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <Pill value={row.status === "active" ? "active" : "revoked"} />
                </td>
                <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                  {row.lastSeenAt ? row.lastSeenAt.slice(0, 10) : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  {canManage && row.id !== currentAdminId ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        run(() =>
                          setAdminStatus(
                            row.id,
                            row.status === "active" ? "disabled" : "active",
                          ),
                        )
                      }
                      className="text-micro font-medium text-accent-deep hover:underline disabled:opacity-60"
                    >
                      {row.status === "active" ? "Disable" : "Enable"}
                    </button>
                  ) : (
                    <span className="text-micro text-ink-300">You</span>
                  )}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <Panel title="Impersonation sessions">
        {sessions.length === 0 ? (
          <EmptyRow>No sessions have been opened.</EmptyRow>
        ) : (
          <TableShell head={["Restaurant", "Admin", "Reason", "Expires", "State", ""]}>
            {sessions.map((row) => {
              const live = !row.revokedAt && new Date(row.expiresAt) > new Date();
              return (
                <tr key={row.id}>
                  <td className="px-5 py-3 text-caption text-ink">{row.businessName}</td>
                  <td className="px-5 py-3 text-micro text-ink-500">
                    {row.adminEmail ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-micro text-ink-700">{row.reason}</td>
                  <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                    {row.expiresAt.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-5 py-3">
                    <Pill
                      value={row.revokedAt ? "revoked" : live ? "active" : "expired"}
                    />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {live && canRevoke ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => revokeImpersonation(row.id))}
                        className="text-micro font-medium text-[var(--color-state-late)] hover:underline disabled:opacity-60"
                      >
                        Revoke
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </TableShell>
        )}
      </Panel>
    </div>
  );
}
