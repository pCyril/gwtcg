"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** First keyboard-focusable element inside `root`, if any. */
export function firstFocusable(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>(FOCUSABLE);
}

/**
 * Opens a native <dialog> as a modal (showModal: top layer, rest of the page inert,
 * Escape raises "cancel") as soon as the component mounts, and moves focus into it.
 * On unmount, closes it and (unless `restoreFocus` is false) gives focus back to
 * whatever had it before the dialog opened, if it's still in the page.
 *
 * Meant for components that are rendered only while open (`{open && <Modal/>}`),
 * which is how every overlay of this app is mounted: nothing is rendered server-side.
 *
 * Returns the ref to put on the <dialog> and `isStaleClose()`: true for a "close"
 * event that doesn't mean "the user closed the dialog" - the one the browser fires
 * (asynchronously) after the unmount close(), or one left over from React's
 * StrictMode unmount/remount while the dialog is open again.
 */
export function useModalDialog({
  initialFocus,
  restoreFocus = true,
}: {
  initialFocus?: (dialog: HTMLDialogElement) => HTMLElement | null | undefined;
  restoreFocus?: boolean;
} = {}) {
  const ref = useRef<HTMLDialogElement>(null);
  const unmounting = useRef(false);
  const initialFocusRef = useRef(initialFocus);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    unmounting.current = false;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    // Browsers pick their own initial focus; set it explicitly so it's the same everywhere.
    (initialFocusRef.current?.(dialog) ?? firstFocusable(dialog))?.focus();
    return () => {
      unmounting.current = true;
      // Leave the top layer first: while the dialog is modal the opener is inert and can't take focus.
      if (dialog.open) dialog.close();
      if (restoreFocus && opener?.isConnected) opener.focus();
    };
  }, [restoreFocus]);

  const isStaleClose = useCallback(() => {
    const dialog = ref.current;
    return unmounting.current || !dialog || !dialog.isConnected || dialog.open;
  }, []);
  return { ref, isStaleClose };
}

/**
 * Schedules a focus move for right after the next render - for toggles that unmount
 * the focused control (e.g. "Create an account" replaced by the form it reveals),
 * which would otherwise drop the focus on <body>.
 */
export function useFocusAfterRender() {
  const target = useRef<(() => HTMLElement | null | undefined) | null>(null);
  useEffect(() => {
    const get = target.current;
    if (!get) return;
    target.current = null;
    get()?.focus();
  });
  return useCallback((get: () => HTMLElement | null | undefined) => {
    target.current = get;
  }, []);
}
