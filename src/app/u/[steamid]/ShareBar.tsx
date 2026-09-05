"use client";

import { useState } from "react";

/**
 * Paylaşım çubuğu — ürünün tek dağıtım aracı.
 *
 * İki yol sunuyor: linki paylaşmak (önizleme kartı kendiliğinden görünür) ve
 * görseli indirmek (Instagram gibi link önizlemesi olmayan yerler için).
 *
 * Tıklama sayacı v0'ın en önemli metriği: paylaşım yoksa ürün ilginç değil.
 */
export default function ShareBar({ steamId }: { steamId: string }) {
  const [copied, setCopied] = useState(false);

  function track(name: string) {
    void fetch(`/api/event?name=${name}`, { method: "POST" }).catch(() => {});
  }

  async function shareLink() {
    track("share_click");
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // Kullanıcı vazgeçti veya desteklenmedi; kopyalamaya düş.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Pano da yoksa yapacak bir şey yok.
    }
  }

  const cardUrl = (format: "square" | "story") =>
    `/u/${encodeURIComponent(steamId)}/card?format=${format}`;

  return (
    <div className="mt-12 rounded-xl border border-border bg-surface p-5">
      <p className="font-semibold">Send this to the friend with 400 games</p>
      <p className="mt-1 text-sm text-muted">See which one of you is worse.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={shareLink}
          className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-[#0e1116] transition hover:opacity-90"
        >
          {copied ? "Link copied" : "Share link"}
        </button>

        <a
          href={cardUrl("square")}
          download="steam-backlog.png"
          onClick={() => track("share_click")}
          className="rounded-lg border border-border px-5 py-2.5 font-semibold transition hover:border-accent"
        >
          Download post
        </a>

        <a
          href={cardUrl("story")}
          download="steam-backlog-story.png"
          onClick={() => track("share_click")}
          className="rounded-lg border border-border px-5 py-2.5 font-semibold transition hover:border-accent"
        >
          Download story
        </a>
      </div>
    </div>
  );
}
