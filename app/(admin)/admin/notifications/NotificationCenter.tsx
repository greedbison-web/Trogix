"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendNotification, dismissNotification } from "../actions";
import { Panel, TableShell, Pill, EmptyRow } from "../ui";

type NotificationView = {
  id: string;
  title: string;
  body: string;
  level: string;
  isMaintenanceBanner: boolean;
  target: string;
  publishedAt: string;
  expiresAt: string | null;
  createdByEmail: string | null;
};

export function NotificationCenter({
  notifications,
  restaurants,
  canSend,
}: {
  notifications: NotificationView[];
  restaurants: { id: string; name: string }[];
  canSend: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState(false);

  return (
    <div className="space-y-6">
      {canSend ? (
        <Panel title="Send a message">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const formData = new FormData(form);
              formData.set("isMaintenanceBanner", String(maintenance));
              startTransition(async () => {
                const result = await sendNotification(formData);
                setNotice(result.ok ? null : result.message);
                if (result.ok) {
                  form.reset();
                  setMaintenance(false);
                  router.refresh();
                }
              });
            }}
            className="space-y-4 p-5"
          >
            {notice ? (
              <p role="alert" className="text-caption text-[var(--color-state-late)]">
                {notice}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-micro font-medium text-ink-700">Recipient</span>
                <select
                  name="businessId"
                  className="mt-2 h-11 w-full rounded-xl border border-paper-edge bg-paper px-3 text-caption outline-none focus:border-accent"
                >
                  <option value="">All restaurants</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-micro font-medium text-ink-700">Level</span>
                <select
                  name="level"
                  defaultValue="info"
                  className="mt-2 h-11 w-full rounded-xl border border-paper-edge bg-paper px-3 text-caption outline-none focus:border-accent"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-micro font-medium text-ink-700">Title</span>
              <input
                name="title"
                required
                minLength={3}
                placeholder="Scheduled maintenance on Sunday"
                className="mt-2 h-11 w-full rounded-xl border border-paper-edge bg-paper px-3 text-caption outline-none focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="text-micro font-medium text-ink-700">Message</span>
              <textarea
                name="body"
                required
                minLength={3}
                rows={3}
                placeholder="Ordering will be unavailable between 03:00 and 04:00 IST."
                className="mt-2 w-full resize-y rounded-xl border border-paper-edge bg-paper px-3 py-2.5 text-caption outline-none focus:border-accent"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-micro font-medium text-ink-700">
                  Expires in hours (optional)
                </span>
                <input
                  name="expiresInHours"
                  inputMode="numeric"
                  placeholder="24"
                  className="mt-2 h-11 w-full rounded-xl border border-paper-edge bg-paper px-3 text-caption outline-none focus:border-accent"
                />
              </label>

              <label className="flex cursor-pointer items-center justify-between self-end rounded-xl border border-paper-edge bg-paper px-4 py-3">
                <span className="text-caption text-ink">Show as maintenance banner</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={maintenance}
                  aria-label="Show as maintenance banner"
                  onClick={() => setMaintenance((v) => !v)}
                  className={`h-6 w-11 shrink-0 rounded-full border transition-colors ${
                    maintenance
                      ? "border-accent bg-accent"
                      : "border-paper-edge bg-paper-sunken"
                  }`}
                >
                  <span
                    className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                      maintenance ? "translate-x-[26px]" : "translate-x-[3px]"
                    }`}
                  />
                </button>
              </label>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="h-11 rounded-full bg-ink px-6 text-caption font-medium text-paper disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send notification"}
            </button>
          </form>
        </Panel>
      ) : null}

      <Panel title="Sent">
        {notifications.length === 0 ? (
          <EmptyRow>Nothing has been sent yet.</EmptyRow>
        ) : (
          <TableShell head={["Message", "Target", "Level", "Sent", ""]}>
            {notifications.map((row) => (
              <tr key={row.id}>
                <td className="px-5 py-3">
                  <p className="text-caption text-ink">
                    {row.title}
                    {row.isMaintenanceBanner ? (
                      <span className="ml-2 rounded-full bg-paper-sunken px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-ink-500">
                        Banner
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-micro text-ink-500">{row.body}</p>
                </td>
                <td className="px-5 py-3 text-micro text-ink-700">{row.target}</td>
                <td className="px-5 py-3">
                  <Pill value={row.level} />
                </td>
                <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                  {row.publishedAt.slice(0, 16).replace("T", " ")}
                </td>
                <td className="px-5 py-3 text-right">
                  {canSend ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await dismissNotification(row.id);
                          setNotice(result.ok ? null : result.message);
                          router.refresh();
                        })
                      }
                      className="text-micro font-medium text-[var(--color-state-late)] hover:underline disabled:opacity-60"
                    >
                      Remove
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </div>
  );
}
