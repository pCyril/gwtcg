"use client";

import { useEffect, useState } from "react";

// Shared across every caller so a grid of cards fetches /api/config once, not once per card.
let wikiArchivePromise: Promise<boolean> | null = null;

function fetchWikiArchive(): Promise<boolean> {
  wikiArchivePromise ??= fetch("/api/config")
    .then((res) => res.json())
    .then((data) => data.wikiArchive === true)
    .catch(() => false);
  return wikiArchivePromise;
}

/** Called after an admin flips the setting, so links on the current page follow. */
export function setWikiArchiveCache(enabled: boolean) {
  wikiArchivePromise = Promise.resolve(enabled);
}

/** The Wayback Machine redirects a timestamp-less /web/<url> to its latest crawl of that page. */
export function archiveUrl(url: string): string {
  return `https://web.archive.org/web/${url}`;
}

/**
 * Returns a function mapping a wiki page URL to the link to show: the live
 * wiki normally, or its latest archive.org crawl while an admin has switched
 * wiki links to the archive (wiki down for maintenance).
 */
export function useWikiUrl(): (url: string) => string {
  const [archived, setArchived] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchWikiArchive().then((value) => {
      if (!cancelled) setArchived(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (url) => (archived ? archiveUrl(url) : url);
}
