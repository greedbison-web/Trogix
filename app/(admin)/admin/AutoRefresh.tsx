"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Keeps a server-rendered admin screen live without client data fetching. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => router.refresh(), seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);

  return null;
}
