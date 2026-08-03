"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp, signInWithGoogle, type AuthState } from "./actions";

const initial: AuthState = { error: null };

export function AuthForm({
  mode,
  next = "/dashboard",
}: {
  mode: "signin" | "signup";
  next?: string;
}) {
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction] = useActionState(action, initial);
  const fields = state.fields ?? {};

  return (
    <div className="space-y-5">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <GoogleButton />
      </form>

      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-paper-edge" />
        <span className="text-micro text-ink-300">or</span>
        <span className="h-px flex-1 bg-paper-edge" />
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

        {mode === "signup" ? (
          <Field
            label="Owner name"
            name="ownerName"
            type="text"
            autoComplete="name"
            placeholder="Ananya Rao"
            error={fields.ownerName}
          />
        ) : null}

        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@restaurant.com"
          error={fields.email}
        />

        {mode === "signup" ? (
          <Field
            label="Phone number"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="9876543210"
            error={fields.phone}
            hint="Indian mobile number. Verified during signup."
          />
        ) : null}

        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
          error={fields.password}
        />

        {state.error ? (
          <p role="alert" className="text-caption text-[var(--color-state-late)]">
            {state.error}
          </p>
        ) : null}

        <SubmitButton label={mode === "signin" ? "Sign in" : "Create account"} />
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  placeholder,
  inputMode,
  error,
  hint,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  inputMode?: "numeric";
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-micro font-medium text-ink-700">{label}</span>
      <input
        name={name}
        type={type}
        required
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`mt-2 h-12 w-full rounded-xl border bg-paper-raised px-4 text-body text-ink outline-none transition-colors duration-200 placeholder:text-ink-300 focus:border-accent ${
          error ? "border-[var(--color-state-late)]" : "border-paper-edge"
        }`}
      />
      {error ? (
        <span className="mt-1.5 block text-micro text-[var(--color-state-late)]">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-micro text-ink-300">{hint}</span>
      ) : null}
    </label>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-full bg-ink text-caption font-medium text-paper transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Please wait…" : label}
    </button>
  );
}

function GoogleButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-paper-edge bg-paper-raised text-caption font-medium text-ink transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-ink-300 active:scale-[0.98] disabled:opacity-60"
    >
      <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
        <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
      </svg>
      {pending ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}
