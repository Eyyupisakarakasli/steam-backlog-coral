"use client";

import { useEffect } from "react";
import { LIBRARY_BUCKETS, UNPLAYED_BUCKETS, bucketFor } from "@/lib/buckets";

/**
 * Ziyaret sayacı.
 *
 * İstemcide çalışıyor çünkü sunucu tarafı her istekte tetiklenir ve bot
 * taramaları sayıyı şişirir. Tarayıcıda çalışan kod çoğu botu eler.
 *
 * `repeat`, aynı tarayıcının ikinci kez sorgulaması demek. localStorage
 * kullanıyor; sunucuda kimlik tutulmuyor.
 *
 * Kütüphane boyutu da burada sayılıyor, sunucuda değil. Sebebi: böylece
 * `lookup` ile aynı paydayı paylaşıyorlar. Biri sunucuda biri istemcide
 * sayılsaydı ikisinin oranı anlamsız olurdu.
 */

type Props = {
  totalGames: number;
  neverPlayed: number;
};

export default function TrackVisit({ totalGames, neverPlayed }: Props) {
  useEffect(() => {
    const send = (name: string) =>
      void fetch(`/api/event?name=${encodeURIComponent(name)}`, { method: "POST" }).catch(() => {});

    send("lookup");
    send(bucketFor(LIBRARY_BUCKETS, totalGames).id);
    send(bucketFor(UNPLAYED_BUCKETS, neverPlayed).id);

    try {
      const KEY = "sb_seen";
      if (localStorage.getItem(KEY)) {
        send("repeat");
      } else {
        localStorage.setItem(KEY, "1");
      }
    } catch {
      // Gizli sekmede localStorage kapalı olabilir; tekrar ölçümü kaybolur, sorun değil.
    }
  }, [totalGames, neverPlayed]);

  return null;
}
