"use client";

import { useEffect, useState } from "react";

/** null while loading - treat as enabled (optimistic) until the check resolves. */
export function useMarketEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setEnabled(data.marketEnabled !== false))
      .catch(() => {});
  }, []);

  return enabled;
}
