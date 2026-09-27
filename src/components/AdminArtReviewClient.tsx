"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { interpolateJsx } from "@/lib/i18n/interpolateJsx";

interface Submission {
  id: string;
  imageUrl: string;
  createdAt: string;
  submitterPseudo: string;
  wikiPageTitle: string;
  wikiPageUrl: string;
}

export function AdminArtReviewClient() {
  const { t } = useLocale();
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  function refresh() {
    return fetch("/api/art-submissions/pending")
      .then((res) => {
        if (res.status === 403) {
          setForbidden(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setSubmissions(data.submissions);
      });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    setPending(id);
    try {
      await fetch(`/api/art-submissions/${id}/${action}`, { method: "POST" });
      await refresh();
    } finally {
      setPending(null);
    }
  }

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
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
        <Link href="/" className="text-sm text-neutral-400 underline hover:text-neutral-200">
          {t("common.back")}
        </Link>
      </div>

      {!submissions ? (
        <p className="text-neutral-400">{t("common.loading")}</p>
      ) : submissions.length === 0 ? (
        <p className="text-neutral-400">{t("admin.empty")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {submissions.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- user-submitted moderation queue, not an optimizable local asset set */}
              <img src={s.imageUrl} alt="" className="aspect-[3/2] w-full rounded object-cover" />
              <p className="text-sm font-semibold">{s.wikiPageTitle}</p>
              <p className="text-xs text-neutral-500">
                {interpolateJsx(
                  t("admin.by", { pseudo: s.submitterPseudo }),
                  "wikiLink",
                  <a href={s.wikiPageUrl} target="_blank" rel="noreferrer noopener" className="underline">
                    {t("common.wikiLink")}
                  </a>,
                )}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => review(s.id, "approve")}
                  disabled={pending === s.id}
                  className="flex-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {t("admin.approve")}
                </button>
                <button
                  onClick={() => review(s.id, "reject")}
                  disabled={pending === s.id}
                  className="flex-1 rounded border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-red-400 hover:text-red-400 disabled:opacity-50"
                >
                  {t("admin.reject")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
