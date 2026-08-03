"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectRazorpay } from "./actions";

export function DisconnectButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await disconnectRazorpay();
          router.refresh();
        })
      }
      className="h-11 rounded-full border border-paper-edge px-5 text-caption font-medium text-ink-700 hover:border-ink-300 disabled:opacity-60"
    >
      {pending ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}
