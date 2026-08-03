"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryWebhook } from "../actions";
import { Panel, TableShell, Pill, EmptyRow } from "../ui";

type WebhookView = {
  id: string;
  eventType: string | null;
  eventId: string | null;
  status: string;
  attempts: number;
  lastError: string | null;
  signatureValid: boolean;
  createdAt: string;
};

export function WebhookControls({
  webhooks,
  canRetry,
}: {
  webhooks: WebhookView[];
  canRetry: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <Panel title="Failed webhooks">
      {notice ? (
        <p role="alert" className="px-5 pt-4 text-caption text-[var(--color-state-late)]">
          {notice}
        </p>
      ) : null}

      {webhooks.length === 0 ? (
        <EmptyRow>Every webhook has been processed.</EmptyRow>
      ) : (
        <TableShell head={["Event", "Status", "Attempts", "Error", "When", ""]}>
          {webhooks.map((hook) => (
            <tr key={hook.id}>
              <td className="px-5 py-3">
                <p className="text-caption text-ink">{hook.eventType ?? "unknown"}</p>
                <p className="mt-0.5 text-micro text-ink-500">{hook.eventId ?? "—"}</p>
              </td>
              <td className="px-5 py-3">
                <Pill value={hook.status} />
              </td>
              <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                {hook.attempts}
              </td>
              <td className="px-5 py-3 text-micro text-[var(--color-state-late)]">
                {hook.lastError ?? "—"}
              </td>
              <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                {hook.createdAt.slice(0, 16).replace("T", " ")}
              </td>
              <td className="px-5 py-3 text-right">
                {!hook.signatureValid ? (
                  <span className="text-micro text-ink-300">Not replayable</span>
                ) : canRetry ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await retryWebhook(hook.id);
                        setNotice(result.ok ? null : result.message);
                        router.refresh();
                      })
                    }
                    className="text-micro font-medium text-accent-deep hover:underline disabled:opacity-60"
                  >
                    Retry
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </TableShell>
      )}
    </Panel>
  );
}
