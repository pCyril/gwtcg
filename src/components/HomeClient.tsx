"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CardData } from "@/components/CardTile";
import { BoosterOverlay, PackVisual } from "@/components/BoosterOverlay";
import { AuthWidget } from "@/components/AuthWidget";
import { GameCharacterNameField } from "@/components/GameCharacterNameField";
import { PseudoField } from "@/components/PseudoField";
import { ArtLeaderboard } from "@/components/ArtLeaderboard";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { useMarketEnabled } from "@/lib/useMarketEnabled";

interface Me {
  pseudo: string;
  email: string | null;
  isGuest: boolean;
  isAdmin: boolean;
  boostersAvailable: number;
  dailyBoosterLimit: number;
  startingProfession: string | null;
  gameCharacterName: string | null;
  nextBoosterInMs: number | null;
}

const PROFESSIONS = [
  "Warrior",
  "Ranger",
  "Monk",
  "Necromancer",
  "Mesmer",
  "Elementalist",
  "Assassin",
  "Ritualist",
  "Paragon",
  "Dervish",
];

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes.toString().padStart(2, "0")}min` : `${minutes}min`;
}

export function HomeClient() {
  const { t, tError } = useLocale();
  const marketEnabled = useMarketEnabled();
  const [me, setMe] = useState<Me | null>(null);
  const [cards, setCards] = useState<CardData[] | null>(null);
  const [opening, setOpening] = useState(false);
  const [openId, setOpenId] = useState(0);
  const [packLabel, setPackLabel] = useState(t("home.packLabelStandard"));
  const [error, setError] = useState<string | null>(null);

  async function refreshMe() {
    const res = await fetch("/api/me");
    const data = await res.json();
    setMe(data);
  }

  useEffect(() => {
    let ignore = false;
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setMe(data);
      });
    return () => {
      ignore = true;
    };
  }, []);

  // Local ticking countdown so the button re-enables without polling the server.
  // Once it actually reaches zero, refetch for real instead of trusting the
  // local tick forever - background tabs get their timers throttled by the
  // browser, so a purely-local countdown can drift and look "stuck".
  const hasCountdown = me !== null && me.nextBoosterInMs !== null;
  useEffect(() => {
    if (!hasCountdown) return;
    const interval = setInterval(() => {
      setMe((prev) =>
        prev && prev.nextBoosterInMs !== null
          ? { ...prev, nextBoosterInMs: Math.max(0, prev.nextBoosterInMs - 1000) }
          : prev,
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [hasCountdown]);

  // Once the local countdown actually reaches zero, refetch for real instead
  // of trusting it forever - background tabs get their timers throttled by
  // the browser, so a purely-local countdown can drift and look "stuck".
  useEffect(() => {
    if (me?.nextBoosterInMs !== 0) return;
    let ignore = false;
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        if (!ignore) setMe(data);
      });
    return () => {
      ignore = true;
    };
  }, [me?.nextBoosterInMs]);

  // A backgrounded tab can have its countdown timer throttled for a long
  // while - resync with the server as soon as the player looks back at it.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") refreshMe();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  async function openBooster(type: "STANDARD" | "PROFESSION") {
    setError(null);
    setPackLabel(type === "STANDARD" ? t("home.packLabelStandard") : t("home.packLabelProfession"));
    setOpening(true);
    setCards(null);
    setOpenId((id) => id + 1);
    try {
      const res = await fetch("/api/booster/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(tError(data.error));
        return;
      }
      setCards(data.cards);
      await refreshMe();
    } finally {
      setOpening(false);
    }
  }

  async function chooseProfession(profession: string) {
    const res = await fetch("/api/profession", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profession }),
    });
    if (res.ok) {
      await refreshMe();
      await openBooster("PROFESSION");
    }
  }

  if (!me) {
    return <div className="p-8 text-neutral-400">{t("common.loading")}</div>;
  }

  const canOpenStandard = me.boostersAvailable > 0 && !opening;
  const showOverlay = opening || cards !== null;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{t("home.title")}</h1>
          <AuthWidget isGuest={me.isGuest} email={me.email} onAuthChange={refreshMe} />
        </div>
        <p className="text-neutral-400">
          {t("home.welcomePrefix")} <PseudoField value={me.pseudo} onSaved={refreshMe} />.{" "}
          {t("home.boosterCount", { available: me.boostersAvailable, limit: me.dailyBoosterLimit })}
        </p>
        <GameCharacterNameField value={me.gameCharacterName} onSaved={refreshMe} />
      </header>

      <section className="flex flex-col items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-center sm:text-left">
          <h2 className="text-xl font-semibold">{t("home.standardBoosterTitle")}</h2>
          <p className="text-sm text-neutral-400">{t("home.standardBoosterDesc")}</p>
          {me.boostersAvailable === 0 && me.nextBoosterInMs !== null && (
            <p className="text-xs text-neutral-500">
              {t("home.nextBoosterIn", { time: formatCountdown(me.nextBoosterInMs) })}
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <button
          onClick={() => openBooster("STANDARD")}
          disabled={!canOpenStandard}
          className="aspect-[5/7] w-32 shrink-0 cursor-pointer transition-transform enabled:hover:-translate-y-1 enabled:hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PackVisual />
        </button>
      </section>

      {!me.startingProfession && (
        <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h2 className="text-xl font-semibold">{t("home.chooseProfessionTitle")}</h2>
          <p className="text-sm text-neutral-400">{t("home.chooseProfessionDesc")}</p>
          <div className="flex flex-wrap gap-2">
            {PROFESSIONS.map((p) => (
              <button
                key={p}
                onClick={() => chooseProfession(p)}
                className="rounded-full border border-neutral-700 px-3 py-1 text-sm hover:border-emerald-400 hover:text-emerald-300"
              >
                {p}
              </button>
            ))}
          </div>
        </section>
      )}

      <ArtLeaderboard />

      <div className="flex gap-4">
        <Link href="/collection" className="text-sm text-neutral-400 underline hover:text-neutral-200">
          {t("home.viewCollection")}
        </Link>
        <Link href="/trade" className="text-sm text-neutral-400 underline hover:text-neutral-200">
          {t("home.trade")}
        </Link>
        {marketEnabled && (
          <Link href="/market" className="text-sm text-neutral-400 underline hover:text-neutral-200">
            {t("home.market")}
          </Link>
        )}
        {me.isAdmin && (
          <>
            <Link href="/admin/art" className="text-sm text-neutral-400 underline hover:text-neutral-200">
              {t("home.moderation")}
            </Link>
            <Link href="/admin/stats" className="text-sm text-neutral-400 underline hover:text-neutral-200">
              {t("home.stats")}
            </Link>
          </>
        )}
      </div>

      {showOverlay && (
        <BoosterOverlay
          key={openId}
          pending={opening}
          cards={cards}
          label={packLabel}
          onClose={() => setCards(null)}
          isGuest={me.isGuest}
          onAuthChange={refreshMe}
        />
      )}
    </main>
  );
}
