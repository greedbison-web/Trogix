"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setBusinessStatus,
  deleteBusiness,
  setSubscription,
  startImpersonation,
} from "../../actions";
import type { AdminRole } from "@/lib/admin/auth";

const PLANS = ["trial", "starter", "growth", "enterprise"] as const;

export function RestaurantControls({
  businessId,
  businessName,
  status,
  plan,
  role,
  canSuspend,
  canDelete,
  canManagePlan,
  canImpersonate,
}: {
  businessId: string;
  businessName: string;
  status: string;
  plan: string;
  role: AdminRole;
  canSuspend: boolean;
  canDelete: boolean;
  canManagePlan: boolean;
  canImpersonate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [impersonating, setImpersonating] = useState(false);

  function run(fn: () => Promise<{ ok: boolean; message: string | null }>) {
    startTransition(async () => {
      const result = await fn();
      setNotice(result.ok ? null : result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {notice ? (
        <p role="alert" className="text-caption text-[var(--color-state-late)]">
          {notice}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {canSuspend && status !== "suspended" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setBusinessStatus(businessId, "suspended"))}
            className="h-10 rounded-full border border-paper-edge px-4 text-micro font-medium text-[var(--color-state-late)] hover:border-ink-300 disabled:opacity-60"
          >
            Suspend
          </button>
        ) : null}

        {canSuspend && status !== "active" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => setBusinessStatus(businessId, "active"))}
            className="h-10 rounded-full bg-ink px-4 text-micro font-medium text-paper disabled:opacity-60"
          >
            Activate
          </button>
        ) : null}

        {canImpersonate ? (
          <button
            type="button"
            onClick={() => setImpersonating((v) => !v)}
            className="h-10 rounded-full border border-paper-edge px-4 text-micro font-medium text-ink-700 hover:border-ink-300"
          >
            Log in as restaurant
          </button>
        ) : null}

        {canDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete((v) => !v)}
            className="ml-auto h-10 rounded-full px-4 text-micro font-medium text-[var(--color-state-late)] hover:bg-paper-sunken"
          >
            Delete
          </button>
        ) : null}
      </div>

      {impersonating ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await startImpersonation(formData);
              // A successful start redirects; only failures return here.
              if (result && !result.ok) setNotice(result.message);
            });
          }}
          className="rounded-xl border border-paper-edge bg-paper p-4"
        >
          <input type="hidden" name="businessId" value={businessId} />
          <label className="block">
            <span className="text-micro font-medium text-ink-700">
              Reason for access (recorded in the audit log)
            </span>
            <input
              name="reason"
              required
              minLength={8}
              placeholder="Investigating ticket #1240 — menu not saving"
              className="mt-2 h-11 w-full rounded-xl border border-paper-edge bg-paper-raised px-3 text-caption outline-none focus:border-accent"
            />
          </label>
          <p className="mt-2 text-micro text-ink-500">
            Access lasts 30 minutes and can be revoked at any time from Security.
          </p>
          <button
            type="submit"
            className="mt-3 h-10 rounded-full bg-ink px-4 text-micro font-medium text-paper"
          >
            Start session
          </button>
        </form>
      ) : null}

      {confirmDelete ? (
        <div className="rounded-xl border border-[var(--color-state-late)]/40 bg-paper p-4">
          <p className="text-caption text-ink-700">
            This archives the restaurant and stops all guest traffic. Orders,
            payments and receipts are kept as financial records.
          </p>
          <label className="mt-3 block">
            <span className="text-micro font-medium text-ink-700">
              Type <span className="font-semibold">{businessName}</span> to confirm
            </span>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-paper-edge bg-paper-raised px-3 text-caption outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            disabled={pending || confirmText.trim() !== businessName}
            onClick={() =>
              run(async () => {
                const result = await deleteBusiness(businessId, confirmText);
                if (result.ok) router.push("/admin/restaurants");
                return result;
              })
            }
            className="mt-3 h-10 rounded-full bg-[var(--color-state-late)] px-4 text-micro font-medium text-white disabled:opacity-40"
          >
            Delete permanently
          </button>
        </div>
      ) : null}

      {canManagePlan ? (
        <div className="rounded-xl border border-paper-edge bg-paper p-4">
          <p className="text-micro font-medium text-ink-700">Subscription</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {PLANS.map((option) => (
              <button
                key={option}
                type="button"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    setSubscription(businessId, option, option === "trial" ? 14 : 365),
                  )
                }
                className={`h-9 rounded-full px-3.5 text-micro font-medium capitalize transition-colors disabled:opacity-60 ${
                  plan === option
                    ? "bg-ink text-paper"
                    : "border border-paper-edge text-ink-700 hover:border-ink-300"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <p className="mt-2 text-micro text-ink-500">
            Trial sets 14 days; paid plans set 365 days from today.
          </p>
        </div>
      ) : (
        <p className="text-micro text-ink-300">
          Your role ({role}) is read-only for subscription changes.
        </p>
      )}
    </div>
  );
}
