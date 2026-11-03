"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useMarketEnabled } from "@/lib/useMarketEnabled";
import type { TranslationKey } from "@/lib/i18n/translations";

interface NavLink {
  href: string;
  label: TranslationKey;
  external?: boolean;
  /** Small count pill next to the label (hidden when 0/undefined). */
  badge?: number;
  badgeLabel?: TranslationKey;
}

const INFO_LINKS: NavLink[] = [
  { href: "/drops", label: "nav.drops" },
  { href: "/changelog", label: "nav.changelog" },
  { href: "https://github.com/pCyril/gwtcg", label: "nav.source", external: true },
];

const adminLinks = (pendingArt: number): NavLink[] => [
  { href: "/admin/art", label: "nav.moderation", badge: pendingArt, badgeLabel: "nav.pendingArt" },
  { href: "/admin/stats", label: "nav.stats" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Badge({ count, label }: { count: number; label: string }) {
  return (
    <span
      className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-xs font-semibold leading-5 text-white"
      title={label}
    >
      <span aria-hidden="true">{count > 9 ? "9+" : count}</span>
      <span className="sr-only">{`, ${label}`}</span>
    </span>
  );
}

/** Visual cue for the current page that doesn't rely on colour alone (RGAA 3.1). */
const CURRENT_CUE = "underline decoration-2 underline-offset-4";

function NavItem({ link, pathname, onNavigate }: { link: NavLink; pathname: string; onNavigate?: () => void }) {
  const { t } = useLocale();
  const current = !link.external && isActive(pathname, link.href);
  const className = `block whitespace-nowrap rounded px-2 py-1.5 text-sm transition-colors hover:text-neutral-100 ${
    current ? `text-emerald-300 ${CURRENT_CUE}` : "text-neutral-300"
  }`;
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>
        {t(link.label)}
      </a>
    );
  }
  return (
    <Link href={link.href} onClick={onNavigate} className={className} aria-current={current ? "page" : undefined}>
      {t(link.label)}
      {link.badge ? <Badge count={link.badge} label={t(link.badgeLabel ?? "nav.pendingTrades", { count: link.badge })} /> : null}
    </Link>
  );
}

/**
 * A labelled group of links that opens as a small popover; closes on outside click, Escape, navigation
 * or when keyboard focus leaves it. Escape from inside the popover puts focus back on the toggle button.
 */
function NavDropdown({
  label,
  links,
  pathname,
  badge,
  badgeLabel,
}: {
  label: TranslationKey;
  links: NavLink[];
  pathname: string;
  badge?: number;
  badgeLabel?: TranslationKey;
}) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Focus would otherwise fall back to <body> once the focused link unmounts.
      const focusInside = ref.current?.contains(document.activeElement) ?? false;
      setOpen(false);
      if (focusInside) buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const groupActive = links.some((l) => !l.external && isActive(pathname, l.href));

  // Close when focus moves to an element outside the group (Tab out). A null relatedTarget (click on a
  // non-focusable spot, Safari not focusing clicked links, window blur) is left to the pointerdown handler.
  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget as Node | null;
    if (next && !e.currentTarget.contains(next)) setOpen(false);
  };

  return (
    <div ref={ref} className="relative" onBlur={onBlur}>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1 rounded px-2 py-1.5 text-sm transition-colors hover:text-neutral-100 ${
          groupActive ? `text-emerald-300 ${CURRENT_CUE}` : "text-neutral-300"
        }`}
      >
        {t(label)}
        {badge ? <Badge count={badge} label={t(badgeLabel ?? "nav.pendingTrades", { count: badge })} /> : null}
        <ChevronDown size={14} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <ul
          role="list"
          className="absolute left-0 top-full z-50 mt-1 min-w-44 rounded-lg border border-neutral-800 bg-neutral-900 p-1 shadow-lg"
        >
          {links.map((link) => (
            <li key={link.href}>
              <NavItem link={link} pathname={pathname} onNavigate={() => setOpen(false)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SiteNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const marketEnabled = useMarketEnabled();
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingTrades, setPendingTrades] = useState(0);
  const [pendingArt, setPendingArt] = useState(0);
  // Only real accounts can sign out - a guest has nothing to sign out of.
  const [hasAccount, setHasAccount] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  // Close the mobile menu after navigating (adjusting state during render, per React's guidance).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  // Refreshed on every page change, and every minute while the tab is visible so
  // a trade proposed to you shows up without having to navigate.
  useEffect(() => {
    let ignore = false;
    const load = () =>
      fetch("/api/me")
        .then((res) => res.json())
        .then((data) => {
          if (ignore) return;
          setIsAdmin(Boolean(data.isAdmin));
          setHasAccount(data.isGuest === false);
          setPendingTrades(Number(data.pendingTrades) || 0);
          setPendingArt(Number(data.pendingArtSubmissions) || 0);
        })
        .catch(() => {});
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000);
    window.addEventListener("gm:auth-changed", load);
    return () => {
      ignore = true;
      clearInterval(timer);
      window.removeEventListener("gm:auth-changed", load);
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    // Tell the open page (home keeps its own copy of /api/me) and the nav to resync, then go home.
    window.dispatchEvent(new Event("gm:auth-changed"));
    router.push("/");
    router.refresh();
  }

  const totalPending = pendingTrades + (isAdmin ? pendingArt : 0);

  const mainLinks: NavLink[] = [
    { href: "/collection", label: "nav.collection" },
    { href: "/trade", label: "nav.trade", badge: pendingTrades },
    ...(marketEnabled ? [{ href: "/market", label: "nav.market" } as NavLink] : []),
  ];

  // Spoken/visible equivalent of the pending-items dot on the Menu button (RGAA 10.9).
  const pendingParts = [
    ...(pendingTrades > 0 ? [t("nav.pendingTrades", { count: pendingTrades })] : []),
    ...(isAdmin && pendingArt > 0 ? [t("nav.pendingArt", { count: pendingArt })] : []),
  ];
  const showPending = !menuOpen && totalPending > 0;

  return (
    <header className="border-b border-neutral-800 bg-neutral-950">
      <nav aria-label={t("nav.label")}>
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
          <Link href="/" className="mr-2 text-lg font-bold tracking-tight text-neutral-100">
            GWTCG
          </Link>

          <ul role="list" className="hidden items-center gap-1 md:flex">
            {mainLinks.map((link) => (
              <li key={link.href}>
                <NavItem link={link} pathname={pathname} />
              </li>
            ))}
            <li>
              <NavDropdown label="nav.info" links={INFO_LINKS} pathname={pathname} />
            </li>
            {isAdmin && (
              <li>
                <NavDropdown
                  label="nav.admin"
                  links={adminLinks(pendingArt)}
                  pathname={pathname}
                  badge={pendingArt}
                  badgeLabel="nav.pendingArt"
                />
              </li>
            )}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            {hasAccount && (
              <button
                onClick={logout}
                className="hidden whitespace-nowrap rounded px-2 py-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-100 md:block"
              >
                {t("auth.logout")}
              </button>
            )}
            <LanguageSwitcher />
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls={menuOpen ? "site-nav-mobile" : undefined}
              className="relative rounded p-1.5 text-neutral-300 hover:text-neutral-100 md:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
              <span className="sr-only">
                {showPending ? `${t("nav.menu")}, ${pendingParts.join(", ")}` : t("nav.menu")}
              </span>
              {showPending && (
                // Visible count rather than a bare dot; the full wording is in the sr-only name above.
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[11px] font-semibold leading-4 text-neutral-950 ring-2 ring-neutral-950"
                >
                  {totalPending > 9 ? "9+" : totalPending}
                </span>
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div id="site-nav-mobile" className="border-t border-neutral-800 px-4 py-2 md:hidden">
            <div className="mx-auto flex max-w-5xl flex-col">
              <ul role="list" className="flex flex-col">
                {mainLinks.map((link) => (
                  <li key={link.href}>
                    <NavItem link={link} pathname={pathname} />
                  </li>
                ))}
              </ul>
              <p id="site-nav-mobile-info" className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {t("nav.info")}
              </p>
              <ul role="list" aria-labelledby="site-nav-mobile-info" className="flex flex-col">
                {INFO_LINKS.map((link) => (
                  <li key={link.href}>
                    <NavItem link={link} pathname={pathname} />
                  </li>
                ))}
              </ul>
              {isAdmin && (
                <>
                  <p
                    id="site-nav-mobile-admin"
                    className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-400"
                  >
                    {t("nav.admin")}
                  </p>
                  <ul role="list" aria-labelledby="site-nav-mobile-admin" className="flex flex-col">
                    {adminLinks(pendingArt).map((link) => (
                      <li key={link.href}>
                        <NavItem link={link} pathname={pathname} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {hasAccount && (
                <button
                  onClick={logout}
                  className="mt-2 border-t border-neutral-800 px-2 py-2 text-left text-sm text-neutral-400 hover:text-neutral-100"
                >
                  {t("auth.logout")}
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
