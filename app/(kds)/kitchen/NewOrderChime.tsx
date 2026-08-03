"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Browser notification + chime when a new ticket lands on the pass.
 *
 * Permission is requested only on an explicit click, never on load.
 */
export function NewOrderChime({ orderIds }: { orderIds: string[] }) {
  const known = useRef<Set<string> | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    // First render seeds the baseline; nothing is "new" on page load.
    if (known.current === null) {
      known.current = new Set(orderIds);
      return;
    }

    const fresh = orderIds.filter((id) => !known.current!.has(id));
    if (fresh.length === 0) {
      known.current = new Set(orderIds);
      return;
    }
    known.current = new Set(orderIds);

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("New order on the pass", {
        body: `${fresh.length} new ticket${fresh.length === 1 ? "" : "s"}`,
        tag: "trogix-kds",
      });
    }

    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      const audio = new Ctor();
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, audio.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.35);
      osc.start();
      osc.stop(audio.currentTime + 0.36);
    } catch {
      // Audio is a nicety; the visual ticket is the real signal.
    }
  }, [orderIds]);

  if (permission === "granted") return null;

  return (
    <button
      type="button"
      onClick={async () => {
        if (typeof Notification === "undefined") return;
        setPermission(await Notification.requestPermission());
      }}
      className="rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-medium text-paper/70 hover:bg-white/10 hover:text-paper"
    >
      Enable alerts
    </button>
  );
}
