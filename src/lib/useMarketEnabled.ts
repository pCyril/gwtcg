"use client";

import { useEffect, useState } from "react";

/**
 * null while loading. The Kamadan is meant to be fully hideable (not just
 * blocked), so callers should treat null the same as false - only show
 * Kamadan UI once this is a confirmed `true` - to avoid a flash of
 * now-you-see-it-now-you-don't while the config check is in flight.
 */
export function useMarketEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setEnabled(data.marketEnabled !== false))
      .catch(() => setEnabled(true));
  }, []);

  return enabled;
}
