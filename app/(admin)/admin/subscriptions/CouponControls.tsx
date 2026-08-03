"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCoupon, setCouponActive } from "../actions";
import { Panel, TableShell, Pill, EmptyRow } from "../ui";

type CouponView = {
  id: string;
  code: string;
  description: string | null;
  percentOff: number;
  redemptions: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  isActive: boolean;
};

export function CouponControls({
  coupons,
  canManage,
}: {
  coupons: CouponView[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <Panel
      title="Coupons"
      action={
        canManage ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-9 rounded-full bg-ink px-3.5 text-micro font-medium text-paper"
          >
            {open ? "Close" : "New coupon"}
          </button>
        ) : null
      }
    >
      {notice ? (
        <p role="alert" className="px-5 pt-4 text-caption text-[var(--color-state-late)]">
          {notice}
        </p>
      ) : null}

      {open ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            startTransition(async () => {
              const result = await createCoupon(formData);
              setNotice(result.ok ? null : result.message);
              if (result.ok) {
                form.reset();
                setOpen(false);
                router.refresh();
              }
            });
          }}
          className="grid gap-3 border-b border-paper-edge p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Field label="Code" name="code" placeholder="LAUNCH20" required />
          <Field label="Percent off" name="percentOff" placeholder="20" required />
          <Field label="Max redemptions" name="maxRedemptions" placeholder="100" />
          <Field label="Expires in days" name="expiresInDays" placeholder="90" />
          <div className="sm:col-span-2 lg:col-span-4">
            <Field label="Description" name="description" placeholder="Launch offer" />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-ink px-5 text-caption font-medium text-paper disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create coupon"}
          </button>
        </form>
      ) : null}

      {coupons.length === 0 ? (
        <EmptyRow>No coupons yet.</EmptyRow>
      ) : (
        <TableShell head={["Code", "Discount", "Used", "Expires", "Status", ""]}>
          {coupons.map((coupon) => (
            <tr key={coupon.id}>
              <td className="px-5 py-3">
                <p className="text-caption font-medium text-ink">{coupon.code}</p>
                {coupon.description ? (
                  <p className="mt-0.5 text-micro text-ink-500">{coupon.description}</p>
                ) : null}
              </td>
              <td className="px-5 py-3 text-caption tabular-nums">
                {coupon.percentOff}%
              </td>
              <td className="px-5 py-3 text-caption tabular-nums text-ink-700">
                {coupon.redemptions}
                {coupon.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}
              </td>
              <td className="px-5 py-3 text-micro tabular-nums text-ink-500">
                {coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : "—"}
              </td>
              <td className="px-5 py-3">
                <Pill value={coupon.isActive ? "active" : "disconnected"} />
              </td>
              <td className="px-5 py-3 text-right">
                {canManage ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await setCouponActive(
                          coupon.id,
                          !coupon.isActive,
                        );
                        setNotice(result.ok ? null : result.message);
                        router.refresh();
                      })
                    }
                    className="text-micro font-medium text-accent-deep hover:underline disabled:opacity-60"
                  >
                    {coupon.isActive ? "Disable" : "Enable"}
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

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-micro font-medium text-ink-700">{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="mt-2 h-11 w-full rounded-xl border border-paper-edge bg-paper px-3 text-caption outline-none focus:border-accent"
      />
    </label>
  );
}
