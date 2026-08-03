"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSetting } from "../actions";
import { Panel } from "../ui";

type SettingView = {
  key: string;
  value: string;
  description: string | null;
  updatedByEmail: string | null;
};

export function SettingsEditor({
  title,
  namespace,
  settings,
  canEdit,
}: {
  title: string;
  namespace: string;
  settings: SettingView[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(settings.map((s) => [s.key, s.value])),
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  return (
    <Panel title={title}>
      {notice ? (
        <p role="alert" className="px-5 pt-4 text-caption text-[var(--color-state-late)]">
          {notice}
        </p>
      ) : null}

      <ul className="divide-y divide-paper-edge">
        {settings.map((setting) => (
          <li key={setting.key} className="grid gap-3 p-5 sm:grid-cols-[240px_minmax(0,1fr)_auto] sm:items-center">
            <div>
              <p className="text-caption font-medium text-ink">{setting.key}</p>
              {setting.description ? (
                <p className="mt-0.5 text-micro text-ink-500">{setting.description}</p>
              ) : null}
              {setting.updatedByEmail ? (
                <p className="mt-0.5 text-micro text-ink-300">
                  Last set by {setting.updatedByEmail}
                </p>
              ) : null}
            </div>

            <input
              value={drafts[setting.key] ?? ""}
              onChange={(e) =>
                setDrafts((d) => ({ ...d, [setting.key]: e.target.value }))
              }
              disabled={!canEdit}
              aria-label={`${setting.key} value`}
              className="h-11 w-full rounded-xl border border-paper-edge bg-paper px-3 font-mono text-micro text-ink outline-none focus:border-accent disabled:opacity-60"
            />

            {canEdit ? (
              <button
                type="button"
                disabled={pending || drafts[setting.key] === setting.value}
                onClick={() =>
                  startTransition(async () => {
                    const result = await updateSetting(
                      namespace,
                      setting.key,
                      drafts[setting.key] ?? "",
                    );
                    setNotice(result.ok ? null : result.message);
                    if (result.ok) {
                      setSaved(setting.key);
                      router.refresh();
                    }
                  })
                }
                className="h-11 rounded-full bg-ink px-4 text-micro font-medium text-paper disabled:opacity-40"
              >
                {saved === setting.key && drafts[setting.key] === setting.value
                  ? "Saved"
                  : "Save"}
              </button>
            ) : (
              <span className="text-micro text-ink-300">Read-only</span>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
