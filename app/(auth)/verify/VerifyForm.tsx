"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendCode, submitCode, type VerifyState } from "./actions";

const initial: VerifyState = { error: null, notice: null };

export function VerifyForm({
  email,
  phone,
  hasLiveCode,
  cooldownSeconds,
  resendsLeft,
  attemptsLeft,
  blockedMinutes,
}: {
  email: string;
  phone: string;
  hasLiveCode: boolean;
  cooldownSeconds: number;
  resendsLeft: number;
  attemptsLeft: number;
  blockedMinutes: number;
}) {
  const [sendState, sendAction] = useActionState(sendCode, initial);
  const [codeState, codeAction] = useActionState(submitCode, initial);
  const cooldown = useCountdown(cooldownSeconds);

  const blocked = blockedMinutes > 0;
  const notice = sendState.notice;
  const error = codeState.error ?? sendState.error;

  return (
    <div className="space-y-6">
      <dl className="rounded-2xl border border-paper-edge bg-paper-raised px-5 py-4">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-micro text-ink-500">Email</dt>
          <dd className="min-w-0 truncate text-caption text-ink">{email}</dd>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between gap-4">
          <dt className="text-micro text-ink-500">Phone</dt>
          <dd className="text-caption tabular-nums text-ink">
            {phone ? `+91 ${phone}` : "Not set"}
          </dd>
        </div>
      </dl>

      {blocked ? (
        <p role="alert" className="text-caption text-[var(--color-state-late)]">
          Too many codes were requested for this account. Verification unlocks in{" "}
          {blockedMinutes} minute{blockedMinutes === 1 ? "" : "s"}.
        </p>
      ) : null}

      {notice ? <p className="text-caption text-ink-500">{notice}</p> : null}
      {error ? (
        <p role="alert" className="text-caption text-[var(--color-state-late)]">
          {error}
        </p>
      ) : null}

      {hasLiveCode && !blocked ? (
        <form action={codeAction} className="space-y-4">
          <label className="block">
            <span className="text-micro font-medium text-ink-700">
              6-digit code
            </span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              required
              autoFocus
              placeholder="••••••"
              className="mt-2 h-14 w-full rounded-xl border border-paper-edge bg-paper-raised px-4 text-center font-mono text-[1.5rem] tracking-[0.4em] text-ink outline-none transition-colors duration-200 placeholder:text-ink-300 focus:border-accent"
            />
          </label>
          <p className="text-micro text-ink-500">
            {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left before the
            code is invalidated.
          </p>
          <Submit label="Verify account" />
        </form>
      ) : null}

      {blocked ? null : (
        <form action={sendAction} className="space-y-4">
          {hasLiveCode ? (
            <input type="hidden" name="resend" value="1" />
          ) : (
            <label className="block">
              <span className="text-micro font-medium text-ink-700">
                Phone number
              </span>
              <input
                name="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                defaultValue={phone}
                required
                placeholder="9876543210"
                className="mt-2 h-12 w-full rounded-xl border border-paper-edge bg-paper-raised px-4 text-body text-ink outline-none transition-colors duration-200 placeholder:text-ink-300 focus:border-accent"
              />
            </label>
          )}

          {hasLiveCode ? (
            <ResendButton
              cooldown={cooldown}
              resendsLeft={resendsLeft}
            />
          ) : (
            <Submit label="Send verification code" />
          )}
        </form>
      )}
    </div>
  );
}

function useCountdown(from: number) {
  const [value, setValue] = useState(from);

  useEffect(() => {
    setValue(from);
  }, [from]);

  useEffect(() => {
    if (value <= 0) return;
    const timer = setTimeout(() => setValue((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [value]);

  return value;
}

function Submit({ label }: { label: string }) {
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

function ResendButton({
  cooldown,
  resendsLeft,
}: {
  cooldown: number;
  resendsLeft: number;
}) {
  const { pending } = useFormStatus();
  const waiting = cooldown > 0;

  return (
    <div className="space-y-2">
      <button
        type="submit"
        disabled={pending || waiting || resendsLeft <= 0}
        className="h-12 w-full rounded-full border border-paper-edge bg-paper-raised text-caption font-medium text-ink transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-ink-300 active:scale-[0.98] disabled:opacity-50"
      >
        {pending
          ? "Sending…"
          : waiting
            ? `Resend in ${cooldown}s`
            : "Send a new code"}
      </button>
      <p className="text-center text-micro text-ink-300">
        {resendsLeft} resend{resendsLeft === 1 ? "" : "s"} remaining
      </p>
    </div>
  );
}
