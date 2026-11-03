"use client";

import { useEffect } from "react";

/**
 * Sets document.title once client-side data is known (RGAA 8.6): used where the
 * page title depends on data fetched in the browser (auction card, trade partner)
 * or where the route can't export metadata (not-found).
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} - GWTCG`;
  }, [title]);
}
