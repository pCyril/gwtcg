"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { RARITY_STYLES, rarityLabelKey, familyLabelKey, type RarityKey } from "@/lib/game/rarityStyles";
import type { DropRates } from "@/lib/game/dropRates";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function DropsClient({ rates }: { rates: DropRates }) {
  const { t, locale } = useLocale();
  const numberLocale = locale === "fr" ? "fr-FR" : "en-US";
  const pct = (value: number, digits = 2) =>
    `${value.toLocaleString(numberLocale, { maximumFractionDigits: digits })}%`;
  const int = (value: number) => value.toLocaleString(numberLocale);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("drops.title")}</h1>
          <p className="text-sm text-neutral-400">{t("drops.subtitle")}</p>
        </div>
      </div>

      <Section title={t("drops.how.title")}>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-neutral-300">
          <li>{t("drops.how.step1", { size: rates.boosterSize })}</li>
          <li>{t("drops.how.step2")}</li>
          <li>{t("drops.how.step3", { total: int(rates.totalCards) })}</li>
          <li>{t("drops.how.step4")}</li>
          <li>{t("drops.how.step5")}</li>
        </ol>
      </Section>

      <Section title={t("drops.rarity.title")}>
        <p className="text-sm text-neutral-400">{t("drops.rarity.intro")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-1 pr-3 font-semibold">{t("drops.rarity.col.rarity")}</th>
                <th className="py-1 pr-3 text-right font-semibold">{t("drops.rarity.col.share")}</th>
                <th className="py-1 pr-3 text-right font-semibold">{t("drops.rarity.col.cards")}</th>
                <th className="py-1 text-right font-semibold">{t("drops.rarity.col.perCard")}</th>
              </tr>
            </thead>
            <tbody>
              {rates.rarities.map((r) => {
                const style = RARITY_STYLES[r.rarity as RarityKey];
                return (
                  <tr key={r.rarity} className="border-t border-neutral-800">
                    <td className={`py-1.5 pr-3 font-medium ${style.text}`}>
                      <span className={`mr-2 inline-block h-2.5 w-2.5 rotate-45 ${style.accentBg}`} />
                      {t(rarityLabelKey(r.rarity as RarityKey))}
                    </td>
                    <td className="py-1.5 pr-3 text-right">{pct(r.share, 1)}</td>
                    <td className="py-1.5 pr-3 text-right text-neutral-400">{int(r.cards)}</td>
                    <td className="py-1.5 text-right text-neutral-400">{pct(r.perCard, 3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-500">{t("drops.rarity.note")}</p>
      </Section>

      <Section title={t("drops.family.title")}>
        <p className="text-sm text-neutral-400">{t("drops.family.intro")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-1 pr-3 font-semibold">{t("drops.family.col.family")}</th>
                <th className="py-1 pr-3 text-right font-semibold">{t("drops.family.col.cards")}</th>
                <th className="py-1 text-right font-semibold">{t("drops.family.col.share")}</th>
              </tr>
            </thead>
            <tbody>
              {rates.families.map((f) => (
                <tr key={f.family} className="border-t border-neutral-800">
                  <td className="py-1.5 pr-3">{t(familyLabelKey(f.family))}</td>
                  <td className="py-1.5 pr-3 text-right text-neutral-400">{int(f.cards)}</td>
                  <td className="py-1.5 text-right">{pct(f.dropShare, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-500">{t("drops.family.note")}</p>
      </Section>

      <Section title={t("drops.assign.title")}>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-neutral-300">
          <li>{t("drops.assign.skills")}</li>
          <li>{t("drops.assign.weapons")}</li>
          <li>{t("drops.assign.heroes")}</li>
          <li>{t("drops.assign.others")}</li>
        </ul>
      </Section>

      <Section title={t("drops.boosters.title")}>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-neutral-300">
          <li>{t("drops.boosters.standard", { count: rates.boostersPerBatch, minutes: rates.refillMinutes })}</li>
          <li>{t("drops.boosters.profession")}</li>
          <li>{t("drops.boosters.duplicates")}</li>
          <li>{t("drops.boosters.cardStats")}</li>
        </ul>
      </Section>
    </main>
  );
}
