"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useMarketEnabled } from "@/lib/useMarketEnabled";
import type { TranslationKey } from "@/lib/i18n/translations";

interface NavLink {
  href: string;
  label: TranslationKey;
  external?: boolean;
}

const INFO_LINKS: NavLink[] = [
  { href: "/drops", label: "nav.drops" },
  { href: "/changelog", label: "nav.changelog" },
  { href: "https://github.com/pCyril/gwtcg", label: "nav.source", external: true },
];

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin/art", label: "nav.moderation" },
  { href: "/admin/stats", label: "nav.stats" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ link, pathname, onNavigate }: { link: NavLink; pathname: string; onNavigate?: () => void }) {
  const { t } = useLocale();
  const className = `block whitespace-nowrap rounded px-2 py-1.5 text-sm transition-colors hover:text-neutral-100 ${
    !link.external && isActive(pathname, link.href) ? "text-emerald-300" : "text-neutral-300"
  }`;
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" onClick={onNavigate} className={className}>
        {t(link.label)}
      </a>
    );
  }
  return (
    <Link href={link.href} onClick={onNavigate} className={className}>
      {t(link.label)}
    </Link>
  );
}

/** A labelled group of links that opens as a small popover; closes on outside click, Escape or navigation. */
function NavDropdown({ label, links, pathname }: { label: TranslationKey; links: NavLink[]; pathname: string }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const groupActive = links.some((l) => !l.external && isActive(pathname, l.href));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-1 rounded px-2 py-1.5 text-sm transition-colors hover:text-neutral-100 ${
          groupActive ? "text-emerald-300" : "text-neutral-300"
        }`}
      >
        {t(label)}
        <ChevronDown size={14} className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-44 rounded-lg border border-neutral-800 bg-neutral-900 p-1 shadow-lg">
          {links.map((link) => (
            <NavItem key={link.href} link={link} pathname={pathname} onNavigate={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SiteNav() {
  const { t } = useLocale();
  const pathname = usePathname();
  const marketEnabled = useMarketEnabled();
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  // Close the mobile menu after navigating (adjusting state during render, per React's guidance).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    let ignore = false;
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setIsAdmin(Boolean(data.isAdmin));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [pathname]);

  const mainLinks: NavLink[] = [
    { href: "/collection", label: "nav.collection" },
    { href: "/trade", label: "nav.trade" },
    ...(marketEnabled ? [{ href: "/market", label: "nav.market" } as NavLink] : []),
  ];

  return (
    <header className="border-b border-neutral-800 bg-neutral-950">
      <nav className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2" aria-label={t("nav.label")}>
        <Link href="/" className="mr-2 text-lg font-bold tracking-tight text-neutral-100">
          GWTCG
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {mainLinks.map((link) => (
            <NavItem key={link.href} link={link} pathname={pathname} />
          ))}
          <NavDropdown label="nav.info" links={INFO_LINKS} pathname={pathname} />
          {isAdmin && <NavDropdown label="nav.admin" links={ADMIN_LINKS} pathname={pathname} />}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label={t("nav.menu")}
            className="rounded p-1.5 text-neutral-300 hover:text-neutral-100 md:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="border-t border-neutral-800 px-4 py-2 md:hidden">
          <div className="mx-auto flex max-w-5xl flex-col">
            {mainLinks.map((link) => (
              <NavItem key={link.href} link={link} pathname={pathname} />
            ))}
            <p className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{t("nav.info")}</p>
            {INFO_LINKS.map((link) => (
              <NavItem key={link.href} link={link} pathname={pathname} />
            ))}
            {isAdmin && (
              <>
                <p className="mt-2 px-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  {t("nav.admin")}
                </p>
                {ADMIN_LINKS.map((link) => (
                  <NavItem key={link.href} link={link} pathname={pathname} />
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
