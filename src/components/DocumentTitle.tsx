"use client";

import { useDocumentTitle } from "@/lib/useDocumentTitle";

/** Renders nothing; sets document.title from a server component (e.g. not-found). */
export default function DocumentTitle({ title }: { title: string }) {
  useDocumentTitle(title);
  return null;
}
