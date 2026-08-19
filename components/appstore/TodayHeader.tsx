"use client";

import { useEffect, useState } from "react";

/**
 * The large-title header. The date is rendered after mount so it is always the
 * reader's own date — the store never shows a stale one — and the server
 * markup stays static.
 */
export function TodayHeader() {
  const [date, setDate] = useState<string | null>(null);

  useEffect(() => {
    setDate(
      new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
        .format(new Date())
        .toUpperCase(),
    );
  }, []);

  return (
    <div className="pb-3 pt-3">
      <p className="h-[13px] text-as-cap font-bold uppercase text-as-label-2">{date ?? ""}</p>
      <h1 className="mt-0.5 text-as-large font-bold tracking-[0.011em] text-as-label">Today</h1>
    </div>
  );
}
