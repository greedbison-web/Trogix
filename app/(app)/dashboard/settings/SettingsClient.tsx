"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INDIAN_STATES } from "@/lib/validation/business";
import { WEEKDAYS, ROLE_PERMISSIONS, type HoursRow } from "@/lib/settings-constants";
import { Field, Toggle } from "../menu/ui";
import {
  saveProfile,
  saveBranding,
  saveBilling,
  saveHours,
  saveStaff,
  setStaffStatus,
  removeStaff,
} from "./actions";
import type { ActionResult } from "../menu/types";

type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
};

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "branding", label: "Branding" },
  { id: "billing", label: "Taxes & charges" },
  { id: "hours", label: "Opening hours" },
  { id: "payments", label: "Payments" },
  { id: "team", label: "Team" },
  { id: "roles", label: "Roles" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsClient({
  business,
  settings,
  hours,
  staff,
  paymentStatus,
}: {
  business: {
    name: string;
    ownerName: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
    logoUrl: string | null;
    currency: string;
  };
  settings: {
    primaryColor: string;
    secondaryColor: string;
    receiptFooter: string | null;
    gstNumber: string | null;
    serviceCharge: number;
    taxEnabled: boolean;
    contactEmail: string | null;
    website: string | null;
  };
  hours: HoursRow[];
  staff: StaffRow[];
  paymentStatus: string;
}) {
  const [tab, setTab] = useState<TabId>("profile");

  return (
    <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className="flex flex-wrap gap-1 lg:flex-col">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "page" : undefined}
            className={`h-10 rounded-full px-4 text-left text-caption font-medium transition-colors ${
              tab === item.id
                ? "bg-ink text-paper"
                : "text-ink-500 hover:bg-paper-sunken hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div>
        {tab === "profile" ? <ProfileForm business={business} settings={settings} /> : null}
        {tab === "branding" ? <BrandingForm business={business} settings={settings} /> : null}
        {tab === "billing" ? <BillingForm settings={settings} /> : null}
        {tab === "hours" ? <HoursForm hours={hours} /> : null}
        {tab === "payments" ? <PaymentsPanel status={paymentStatus} /> : null}
        {tab === "team" ? <TeamPanel staff={staff} /> : null}
        {tab === "roles" ? <RolesPanel /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ shell */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-paper-edge bg-paper-raised p-6">
      <h2 className="font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function useSaver() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function submit(action: (formData: FormData) => Promise<ActionResult>) {
    return (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      startTransition(async () => {
        const result = await action(formData);
        setErrors(result.errors);
        setMessage(result.message);
        setSaved(result.ok);
        if (result.ok) router.refresh();
      });
    };
  }

  return { pending, errors, message, saved, submit, setSaved };
}

function SaveBar({
  pending,
  saved,
  message,
}: {
  pending: boolean;
  saved: boolean;
  message: string | null;
}) {
  return (
    <div className="mt-6 flex items-center gap-4">
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-ink px-6 text-caption font-medium text-paper disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
      {saved && !message ? (
        <span className="text-caption text-accent-deep">Saved</span>
      ) : null}
      {message ? (
        <span role="alert" className="text-caption text-[var(--color-state-late)]">
          {message}
        </span>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- profile */

function ProfileForm({
  business,
  settings,
}: {
  business: React.ComponentProps<typeof SettingsClient>["business"];
  settings: React.ComponentProps<typeof SettingsClient>["settings"];
}) {
  const s = useSaver();
  return (
    <Card title="Business profile">
      <form onSubmit={s.submit(saveProfile)}>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Business name" name="name" defaultValue={business.name} error={s.errors.name} />
          <Field label="Owner name" name="ownerName" defaultValue={business.ownerName} error={s.errors.ownerName} />
          <Field label="Phone" name="phone" inputMode="numeric" defaultValue={business.phone} error={s.errors.phone} />
          <Field label="Contact email" name="contactEmail" defaultValue={settings.contactEmail ?? ""} error={s.errors.contactEmail} />
          <div className="sm:col-span-2">
            <Field label="Street address" name="addressLine" defaultValue={business.addressLine} error={s.errors.addressLine} />
          </div>
          <Field label="City" name="city" defaultValue={business.city} error={s.errors.city} />
          <div>
            <label htmlFor="state" className="text-micro font-medium text-ink-700">
              State
            </label>
            <select
              id="state"
              name="state"
              defaultValue={business.state}
              className="mt-2 h-12 w-full rounded-xl border border-paper-edge bg-paper px-4 text-body outline-none focus:border-accent"
            >
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <Field label="Pincode" name="pincode" inputMode="numeric" defaultValue={business.pincode} error={s.errors.pincode} />
          <Field label="Website" name="website" defaultValue={settings.website ?? ""} error={s.errors.website} />
        </div>
        <SaveBar pending={s.pending} saved={s.saved} message={s.message} />
      </form>
    </Card>
  );
}

/* --------------------------------------------------------------- branding */

function BrandingForm({
  business,
  settings,
}: {
  business: React.ComponentProps<typeof SettingsClient>["business"];
  settings: React.ComponentProps<typeof SettingsClient>["settings"];
}) {
  const s = useSaver();
  const [preview, setPreview] = useState<string | null>(business.logoUrl);
  const [primary, setPrimary] = useState(settings.primaryColor);
  const [secondary, setSecondary] = useState(settings.secondaryColor);

  return (
    <Card title="Branding">
      <form onSubmit={s.submit(saveBranding)}>
        <div>
          <span className="text-micro font-medium text-ink-700">Logo</span>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-paper-edge bg-paper">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-micro text-ink-300">None</span>
              )}
            </div>
            <label className="cursor-pointer rounded-full border border-paper-edge bg-paper px-4 py-2.5 text-caption font-medium text-ink hover:border-ink-300">
              Choose file
              <input
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setPreview(file ? URL.createObjectURL(file) : business.logoUrl);
                }}
              />
            </label>
          </div>
          {s.errors.logo ? (
            <p role="alert" className="mt-2 text-micro text-[var(--color-state-late)]">
              {s.errors.logo}
            </p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <ColorField label="Primary colour" name="primaryColor" value={primary} onChange={setPrimary} error={s.errors.primaryColor} />
          <ColorField label="Accent colour" name="secondaryColor" value={secondary} onChange={setSecondary} error={s.errors.secondaryColor} />
        </div>

        <div className="mt-5">
          <label htmlFor="receiptFooter" className="text-micro font-medium text-ink-700">
            Receipt footer
          </label>
          <textarea
            id="receiptFooter"
            name="receiptFooter"
            rows={2}
            defaultValue={settings.receiptFooter ?? ""}
            placeholder="Thank you for dining with us."
            className="mt-2 w-full resize-y rounded-xl border border-paper-edge bg-paper px-4 py-3 text-body outline-none focus:border-accent"
          />
        </div>

        <SaveBar pending={s.pending} saved={s.saved} message={s.message} />
      </form>
    </Card>
  );
}

function ColorField({
  label,
  name,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-micro font-medium text-ink-700">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} picker`}
          className="h-12 w-12 shrink-0 cursor-pointer rounded-xl border border-paper-edge bg-paper"
        />
        <input
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 flex-1 rounded-xl border border-paper-edge bg-paper px-4 font-mono text-caption uppercase outline-none focus:border-accent"
        />
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-micro text-[var(--color-state-late)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- billing */

function BillingForm({
  settings,
}: {
  settings: React.ComponentProps<typeof SettingsClient>["settings"];
}) {
  const s = useSaver();
  const [taxEnabled, setTaxEnabled] = useState(settings.taxEnabled);

  return (
    <Card title="Taxes & charges">
      <form
        onSubmit={(e) => {
          const form = e.currentTarget;
          const hidden = form.querySelector<HTMLInputElement>('input[name="taxEnabled"]');
          if (hidden) hidden.value = String(taxEnabled);
          s.submit(saveBilling)(e);
        }}
      >
        <input type="hidden" name="taxEnabled" defaultValue={String(taxEnabled)} />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="GSTIN"
            name="gstNumber"
            defaultValue={settings.gstNumber ?? ""}
            placeholder="27AAAAA0000A1Z5"
            error={s.errors.gstNumber}
          />
          <Field
            label="Service charge (%)"
            name="serviceChargePercent"
            inputMode="decimal"
            defaultValue={(settings.serviceCharge / 100).toString()}
            error={s.errors.serviceChargePercent}
          />
        </div>

        <div className="mt-5">
          <Toggle label="Charge GST at 5%" checked={taxEnabled} onChange={setTaxEnabled} />
        </div>

        <p className="mt-3 text-micro text-ink-500">
          Applied to every new order. Existing orders keep the totals they were
          placed with.
        </p>

        <SaveBar pending={s.pending} saved={s.saved} message={s.message} />
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------ hours */

function HoursForm({ hours }: { hours: HoursRow[] }) {
  const s = useSaver();
  const [rows, setRows] = useState(hours);

  return (
    <Card title="Opening hours">
      <form
        onSubmit={(e) => {
          const form = e.currentTarget;
          for (const row of rows) {
            const input = form.querySelector<HTMLInputElement>(
              `input[name="open-${row.weekday}"]`,
            );
            if (input) input.value = String(row.isOpen);
          }
          s.submit(saveHours)(e);
        }}
      >
        <ul className="divide-y divide-paper-edge">
          {rows.map((row, index) => (
            <li
              key={row.weekday}
              className="grid gap-3 py-4 sm:grid-cols-[140px_auto_minmax(0,1fr)] sm:items-center"
            >
              <span className="text-caption text-ink">{WEEKDAYS[row.weekday]}</span>

              <input type="hidden" name={`open-${row.weekday}`} defaultValue={String(row.isOpen)} />
              <button
                type="button"
                role="switch"
                aria-checked={row.isOpen}
                aria-label={`${WEEKDAYS[row.weekday]} open`}
                onClick={() =>
                  setRows((list) =>
                    list.map((r, i) => (i === index ? { ...r, isOpen: !r.isOpen } : r)),
                  )
                }
                className={`h-6 w-11 shrink-0 rounded-full border transition-colors ${
                  row.isOpen ? "border-accent bg-accent" : "border-paper-edge bg-paper-sunken"
                }`}
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition-transform ${
                    row.isOpen ? "translate-x-[26px]" : "translate-x-[3px]"
                  }`}
                />
              </button>

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  name={`from-${row.weekday}`}
                  defaultValue={row.opensAt}
                  disabled={!row.isOpen}
                  aria-label={`${WEEKDAYS[row.weekday]} opens at`}
                  className="h-11 rounded-xl border border-paper-edge bg-paper px-3 text-caption tabular-nums outline-none focus:border-accent disabled:opacity-40"
                />
                <span className="text-micro text-ink-300">to</span>
                <input
                  type="time"
                  name={`until-${row.weekday}`}
                  defaultValue={row.closesAt}
                  disabled={!row.isOpen}
                  aria-label={`${WEEKDAYS[row.weekday]} closes at`}
                  className="h-11 rounded-xl border border-paper-edge bg-paper px-3 text-caption tabular-nums outline-none focus:border-accent disabled:opacity-40"
                />
              </div>
            </li>
          ))}
        </ul>
        <SaveBar pending={s.pending} saved={s.saved} message={s.message} />
      </form>
    </Card>
  );
}

/* --------------------------------------------------------------- payments */

function PaymentsPanel({ status }: { status: string }) {
  return (
    <Card title="Payments">
      <p className="text-caption leading-relaxed text-ink-500">
        Guests pay your own Razorpay account directly. Trogix never receives or
        holds your money.
      </p>
      <p className="mt-4 text-caption text-ink">
        Status:{" "}
        <span
          className={
            status === "connected" ? "text-accent-deep" : "text-[var(--color-state-late)]"
          }
        >
          {status}
        </span>
      </p>
      <a
        href="/dashboard/payments"
        className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-5 text-caption font-medium text-paper"
      >
        Manage payments
      </a>
    </Card>
  );
}

/* ------------------------------------------------------------------- team */

function TeamPanel({ staff }: { staff: StaffRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  function run(fn: () => Promise<ActionResult>) {
    startTransition(async () => {
      const result = await fn();
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return (
    <Card title="Team">
      {message ? (
        <p role="alert" className="mb-4 text-caption text-[var(--color-state-late)]">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setAdding((v) => !v)}
        className="h-10 rounded-full bg-ink px-4 text-micro font-medium text-paper"
      >
        {adding ? "Close" : "Add team member"}
      </button>

      {adding ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const formData = new FormData(form);
            startTransition(async () => {
              const result = await saveStaff(formData);
              setErrors(result.errors);
              setMessage(result.message);
              if (result.ok) {
                form.reset();
                setAdding(false);
                router.refresh();
              }
            });
          }}
          className="mt-4 grid gap-4 rounded-xl border border-paper-edge bg-paper p-4 sm:grid-cols-2"
        >
          <Field label="Name" name="name" error={errors.name} />
          <Field label="Email" name="email" error={errors.email} />
          <Field label="Phone" name="phone" inputMode="numeric" error={errors.phone} />
          <div>
            <label htmlFor="role" className="text-micro font-medium text-ink-700">
              Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue="waiter"
              className="mt-2 h-12 w-full rounded-xl border border-paper-edge bg-paper-raised px-4 text-body outline-none focus:border-accent"
            >
              {Object.keys(ROLE_PERMISSIONS)
                .filter((role) => role !== "owner")
                .map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-ink px-5 text-caption font-medium text-paper disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
          >
            {pending ? "Saving…" : "Add member"}
          </button>
        </form>
      ) : null}

      <ul className="mt-6 divide-y divide-paper-edge">
        {staff.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-caption text-ink">{member.name}</p>
              <p className="mt-0.5 text-micro text-ink-500">
                {member.email ?? member.phone ?? "No contact"} · {member.role}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize ${
                member.status === "active"
                  ? "bg-accent-soft text-accent-deep"
                  : "bg-paper-sunken text-ink-500"
              }`}
            >
              {member.status}
            </span>
            {member.role !== "owner" ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      setStaffStatus(
                        member.id,
                        member.status === "active" ? "disabled" : "active",
                      ),
                    )
                  }
                  className="text-micro font-medium text-accent-deep hover:underline disabled:opacity-60"
                >
                  {member.status === "active" ? "Disable" : "Activate"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => removeStaff(member.id))}
                  className="text-micro font-medium text-[var(--color-state-late)] hover:underline disabled:opacity-60"
                >
                  Remove
                </button>
              </>
            ) : (
              <span className="text-micro text-ink-300">Account owner</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ roles */

function RolesPanel() {
  return (
    <Card title="Roles & permissions">
      <ul className="divide-y divide-paper-edge">
        {Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => (
          <li key={role} className="py-4">
            <p className="text-caption font-medium capitalize text-ink">{role}</p>
            <p className="mt-1 text-micro text-ink-500">
              {(permissions as readonly string[]).join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
