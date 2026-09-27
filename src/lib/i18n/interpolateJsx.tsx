import type { ReactNode } from "react";

/**
 * Splits a translated string on a single `{placeholder}` and substitutes a
 * React node in its place - for sentences that need to embed a link, a
 * <strong>, or other markup that a plain string param can't carry.
 */
export function interpolateJsx(text: string, placeholder: string, node: ReactNode): ReactNode[] {
  const token = `{${placeholder}}`;
  const parts = text.split(token);
  return parts.flatMap((part, i) => (i < parts.length - 1 ? [part, <span key={i}>{node}</span>] : [part]));
}
