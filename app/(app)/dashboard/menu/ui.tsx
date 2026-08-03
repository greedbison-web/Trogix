"use client";

import { useEffect } from "react";

export function Drawer({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex h-full w-full max-w-[520px] flex-col border-l border-paper-edge bg-paper shadow-float"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-paper-edge px-6 py-4">
          <h2 className="font-serif text-[1.5rem] leading-none tracking-[-0.02em]">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 rounded-full text-ink-500 transition-colors hover:bg-paper-sunken hover:text-ink"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-paper-edge px-6 py-4">
          {footer}
        </footer>
      </div>
    </div>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  placeholder,
  error,
  inputMode,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <div>
      <label htmlFor={name} className="text-micro font-medium text-ink-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        className={`mt-2 h-12 w-full rounded-xl border bg-paper-raised px-4 text-body text-ink outline-none transition-colors duration-200 placeholder:text-ink-300 focus:border-accent ${
          error ? "border-[var(--color-state-late)]" : "border-paper-edge"
        }`}
      />
      {error ? (
        <p role="alert" className="mt-2 text-micro text-[var(--color-state-late)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-xl border border-paper-edge bg-paper-raised px-4 py-3">
      <span className="text-caption text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ${
          checked ? "border-accent bg-accent" : "border-paper-edge bg-paper-sunken"
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition-transform duration-200 ${
            checked ? "translate-x-[26px]" : "translate-x-[3px]"
          }`}
        />
      </button>
    </label>
  );
}
