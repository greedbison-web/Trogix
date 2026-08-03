"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  BUSINESS_TYPES,
  INDIAN_STATES,
  slugify,
} from "@/lib/validation/business";
import { createBusiness } from "./actions";
import { initialOnboardingState, type OnboardingState } from "./state";

const STEPS = [
  { id: 0, label: "Business", fields: ["name", "type", "slug"] },
  { id: 1, label: "Owner", fields: ["ownerName", "phone", "gst"] },
  { id: 2, label: "Location", fields: ["addressLine", "city", "state", "pincode"] },
  { id: 3, label: "Brand", fields: ["logo", "timezone", "currency"] },
] as const;

export function OnboardingForm({ defaultOwnerName }: { defaultOwnerName: string }) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(
    createBusiness,
    initialOnboardingState,
  );
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [logoName, setLogoName] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const effectiveSlug = slugEdited ? slug : slugify(name);

  // Jump to the first step containing a server-reported error.
  useEffect(() => {
    const keys = Object.keys(state.errors);
    if (keys.length === 0) return;
    const target = STEPS.find((s) => s.fields.some((f) => keys.includes(f)));
    if (target) setStep(target.id);
  }, [state.errors]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);
  const isLast = step === STEPS.length - 1;

  return (
    <div>
      {/* Progress */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <p className="text-micro font-medium uppercase tracking-[0.16em] text-ink-500">
            Step {step + 1} of {STEPS.length} · {STEPS[step].label}
          </p>
          <p className="text-micro tabular-nums text-ink-300">
            {Math.round(progress)}%
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-label="Onboarding progress"
          className="mt-3 h-1 w-full overflow-hidden rounded-full bg-paper-sunken"
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-serif text-[2rem] leading-none tracking-[-0.02em] outline-none"
      >
        {stepHeading(step)}
      </h1>
      <p className="mt-3 text-caption text-ink-500">{stepSubhead(step)}</p>

      <form action={formAction} className="mt-8">
        {/* Every field stays mounted so values survive step changes. */}
        <Panel active={step === 0}>
          <Field
            label="Business name"
            name="name"
            value={name}
            onChange={(v) => setName(v)}
            error={state.errors.name}
            placeholder="Sundara"
            autoFocus
          />

          <fieldset>
            <legend className="text-micro font-medium text-ink-700">
              Business type
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {BUSINESS_TYPES.map((option, index) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-paper-edge bg-paper-raised px-4 py-3 text-caption transition-colors duration-200 hover:border-ink-300 has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
                >
                  <input
                    type="radio"
                    name="type"
                    value={option.value}
                    defaultChecked={index === 0}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <FieldError message={state.errors.type} />
          </fieldset>

          <div>
            <label htmlFor="slug" className="text-micro font-medium text-ink-700">
              Your menu link
            </label>
            <div className="mt-2 flex items-center rounded-xl border border-paper-edge bg-paper-raised focus-within:border-accent">
              <span className="pl-4 text-caption text-ink-300">trogix.co.in/</span>
              <input
                id="slug"
                name="slug"
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="sundara"
                className="h-12 flex-1 bg-transparent pr-4 text-body text-ink outline-none placeholder:text-ink-300"
              />
            </div>
            <FieldError message={state.errors.slug} />
          </div>
        </Panel>

        <Panel active={step === 1}>
          <Field
            label="Owner name"
            name="ownerName"
            defaultValue={defaultOwnerName}
            error={state.errors.ownerName}
            placeholder="Full name"
          />
          <div>
            <label htmlFor="phone" className="text-micro font-medium text-ink-700">
              Phone number
            </label>
            <div className="mt-2 flex items-center rounded-xl border border-paper-edge bg-paper-raised focus-within:border-accent">
              <span className="pl-4 text-caption text-ink-300">+91</span>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                className="h-12 flex-1 bg-transparent px-3 text-body text-ink outline-none placeholder:text-ink-300"
              />
            </div>
            <FieldError message={state.errors.phone} />
          </div>
          <Field
            label="GSTIN (optional)"
            name="gst"
            error={state.errors.gst}
            placeholder="27AAAAA0000A1Z5"
            required={false}
          />
        </Panel>

        <Panel active={step === 2}>
          <Field
            label="Street address"
            name="addressLine"
            error={state.errors.addressLine}
            placeholder="Shop 4, Waterfield Road"
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="City"
              name="city"
              error={state.errors.city}
              placeholder="Mumbai"
            />
            <div>
              <label htmlFor="state" className="text-micro font-medium text-ink-700">
                State
              </label>
              <select
                id="state"
                name="state"
                defaultValue="Maharashtra"
                className="mt-2 h-12 w-full rounded-xl border border-paper-edge bg-paper-raised px-4 text-body text-ink outline-none focus:border-accent"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <FieldError message={state.errors.state} />
            </div>
          </div>
          <Field
            label="Pincode"
            name="pincode"
            error={state.errors.pincode}
            placeholder="400050"
            inputMode="numeric"
            maxLength={6}
          />
        </Panel>

        <Panel active={step === 3}>
          <div>
            <span className="text-micro font-medium text-ink-700">
              Business logo (optional)
            </span>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-paper-edge bg-paper-raised">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-micro text-ink-300">Logo</span>
                )}
              </div>
              <label className="cursor-pointer rounded-full border border-paper-edge bg-paper-raised px-4 py-2.5 text-caption font-medium text-ink transition-colors duration-200 hover:border-ink-300">
                {logoName ? "Change file" : "Choose file"}
                <input
                  type="file"
                  name="logo"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (logoPreview) URL.revokeObjectURL(logoPreview);
                    setLogoName(file?.name ?? null);
                    setLogoPreview(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </label>
              {logoName ? (
                <span className="truncate text-micro text-ink-500">{logoName}</span>
              ) : null}
            </div>
            <p className="mt-2 text-micro text-ink-300">PNG, JPG, WebP or SVG. Max 2 MB.</p>
            <FieldError message={state.errors.logo} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="timezone" className="text-micro font-medium text-ink-700">
                Timezone
              </label>
              <select
                id="timezone"
                name="timezone"
                defaultValue="Asia/Kolkata"
                className="mt-2 h-12 w-full rounded-xl border border-paper-edge bg-paper-raised px-4 text-body text-ink outline-none focus:border-accent"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Dubai">Asia/Dubai</option>
                <option value="Asia/Singapore">Asia/Singapore</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
            <div>
              <label htmlFor="currency" className="text-micro font-medium text-ink-700">
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                defaultValue="INR"
                className="mt-2 h-12 w-full rounded-xl border border-paper-edge bg-paper-raised px-4 text-body text-ink outline-none focus:border-accent"
              >
                <option value="INR">INR — Indian Rupee</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="SGD">SGD — Singapore Dollar</option>
                <option value="GBP">GBP — Pound Sterling</option>
              </select>
            </div>
          </div>
        </Panel>

        {state.message ? (
          <p role="alert" className="mt-6 text-caption text-[var(--color-state-late)]">
            {state.message}
          </p>
        ) : null}

        <div className="mt-10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="h-12 rounded-full px-5 text-caption font-medium text-ink-700 transition-colors duration-200 hover:bg-paper-sunken disabled:invisible"
          >
            Back
          </button>

          {isLast ? (
            <SubmitButton />
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="h-12 rounded-full bg-ink px-7 text-caption font-medium text-paper transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98]"
            >
              Continue
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Panel({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div className={active ? "space-y-5" : "hidden"} aria-hidden={!active}>
      {children}
    </div>
  );
}

function Field({
  label,
  name,
  error,
  placeholder,
  defaultValue,
  value,
  onChange,
  required = true,
  autoFocus = false,
  inputMode,
  maxLength,
}: {
  label: string;
  name: string;
  error?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  autoFocus?: boolean;
  inputMode?: "numeric" | "text";
  maxLength?: number;
}) {
  const controlled = value !== undefined;
  return (
    <div>
      <label htmlFor={name} className="text-micro font-medium text-ink-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...(controlled
          ? { value, onChange: (e) => onChange?.(e.target.value) }
          : { defaultValue })}
        className={`mt-2 h-12 w-full rounded-xl border bg-paper-raised px-4 text-body text-ink outline-none transition-colors duration-200 placeholder:text-ink-300 focus:border-accent ${
          error ? "border-[var(--color-state-late)]" : "border-paper-edge"
        }`}
      />
      {error ? <FieldError message={error} id={`${name}-error`} /> : null}
      {!required ? null : null}
    </div>
  );
}

function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-micro text-[var(--color-state-late)]">
      {message}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 rounded-full bg-ink px-7 text-caption font-medium text-paper transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create business"}
    </button>
  );
}

function stepHeading(step: number) {
  return [
    "Tell us about your business",
    "Who runs it?",
    "Where is it?",
    "Finishing touches",
  ][step];
}

function stepSubhead(step: number) {
  return [
    "This is the name your guests will see on the menu.",
    "We use this to reach you during setup and service.",
    "Used on receipts and for tax details.",
    "You can change any of this later.",
  ][step];
}
