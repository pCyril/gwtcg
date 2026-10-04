"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";

interface Stats {
  totalUsers: number;
  registeredAccounts: number;
  usersLast1h: number;
  usersLast24h: number;
  totalBoosters: number;
  boostersLast1h: number;
  boostersLast24h: number;
  totalTrades: number;
  totalAuctions: number;
  activeAuctions: number;
  totalArtSubmissions: number;
  pendingArtSubmissions: number;
  totalCardInstances: number;
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      <span className="text-2xl font-bold tracking-tight">{value.toLocaleString()}</span>
      {sub && <span className="text-xs text-neutral-500">{sub}</span>}
    </div>
  );
}

export function AdminStatsClient() {
  const { t } = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);
  const [forbidden, setForbidden] = useState(false);

  function refresh() {
    return fetch("/api/admin/stats")
      .then((res) => {
        if (res.status === 403) {
          setForbidden(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setStats(data);
      });
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (forbidden) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 text-neutral-400">
        {t("admin.forbidden")}{" "}
        <Link href="/" className="underline hover:text-neutral-200">
          {t("admin.backHome")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.statsTitle")}</h1>
      </div>

      {!stats ? (
        <p className="text-neutral-400">{t("common.loading")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            label={t("admin.stats.users")}
            value={stats.totalUsers}
            sub={t("admin.stats.last1h24h", { h1: stats.usersLast1h, h24: stats.usersLast24h })}
          />
          <StatCard
            label={t("admin.stats.registered")}
            value={stats.registeredAccounts}
            sub={t("admin.stats.registeredShare", {
              percent: stats.totalUsers > 0 ? Math.round((stats.registeredAccounts / stats.totalUsers) * 100) : 0,
            })}
          />
          <StatCard
            label={t("admin.stats.boosters")}
            value={stats.totalBoosters}
            sub={t("admin.stats.last1h24h", { h1: stats.boostersLast1h, h24: stats.boostersLast24h })}
          />
          <StatCard label={t("admin.stats.cardInstances")} value={stats.totalCardInstances} />
          <StatCard label={t("admin.stats.trades")} value={stats.totalTrades} />
          <StatCard
            label={t("admin.stats.auctions")}
            value={stats.totalAuctions}
            sub={t("admin.stats.active", { count: stats.activeAuctions })}
          />
          <StatCard
            label={t("admin.stats.artSubmissions")}
            value={stats.totalArtSubmissions}
            sub={t("admin.stats.pending", { count: stats.pendingArtSubmissions })}
          />
        </div>
      )}
    </main>
  );
}
