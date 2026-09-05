"use client";

import { useEffect } from "react";

/**
 * Ziyaret sayacı.
 *
 * İstemcide çalışıyor çünkü sunucu tarafı her istekte tetiklenir ve bot
 * taramaları sayıyı şişirir. Tarayıcıda çalışan kod çoğu botu eler.
 *
 * `repeat`, aynı tarayıcının ikinci kez sorgulaması demek. localStorage
 * kullanıyor; sunucuda kimlik tutulmuyor.
 */
export default function TrackVisit() {
  useEffect(() => {
    const send = (name: string) =>
      void fetch(`/api/event?name=${name}`, { method: "POST" }).catch(() => {});

    send("lookup");

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
  }, []);

  return null;
}
