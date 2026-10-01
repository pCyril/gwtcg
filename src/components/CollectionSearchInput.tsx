"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";

/**
 * Full-width name search for the collection views. Keeps its own text state so
 * typing stays instant, and only reports the value to the parent (which
 * refetches) once the user pauses.
 */
export function CollectionSearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useLocale();
  const [text, setText] = useState(value);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  useEffect(() => {
    if (text.trim() === valueRef.current.trim()) return;
    const timer = setTimeout(() => onChangeRef.current(text.trim()), 300);
    return () => clearTimeout(timer);
  }, [text]);

  return (
    <input
      type="search"
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder={t("collection.searchPlaceholder")}
      aria-label={t("collection.searchPlaceholder")}
      className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
    />
  );
}
