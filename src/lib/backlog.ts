/**
 * Kütüphane istatistikleri.
 *
 * Buradaki hiçbir sayı tahmine dayanmaz. Steam satın alma tarihini vermediği
 * için "şu kadar zamandır duruyor" gibi bir iddiada bulunmuyoruz; yalnız
 * oynanma süresinden çıkarılabilecek şeyleri hesaplıyoruz.
 */

import type { OwnedGame } from "./steam";

/** 60 dakikanın altı "açıp bıraktım" sayılır. */
const BOUNCED_LIMIT_MINUTES = 60;

export type BacklogStats = {
  totalGames: number;
  neverPlayed: number;
  /** Hiç açılmamışların yüzdesi, tam sayıya yuvarlanmış. */
  neverPlayedPercent: number;
  /** 0 dakikadan fazla ama bir saatten az oynanan: alınmış, denenmiş, bırakılmış. */
  bounced: number;
  totalHours: number;
  mostPlayed: OwnedGame | null;
  playedLastTwoWeeks: number;
  /** Hiç açılmamış oyunlar, öneri seçimi için. */
  unplayedGames: OwnedGame[];
};

export function computeBacklog(games: OwnedGame[]): BacklogStats {
  const totalGames = games.length;

  const unplayedGames = games.filter((g) => g.playtimeMinutes === 0);
  const neverPlayed = unplayedGames.length;

  const bounced = games.filter(
    (g) => g.playtimeMinutes > 0 && g.playtimeMinutes < BOUNCED_LIMIT_MINUTES
  ).length;

  const totalMinutes = games.reduce((sum, g) => sum + g.playtimeMinutes, 0);

  const mostPlayed = games.reduce<OwnedGame | null>(
    (best, g) => (best === null || g.playtimeMinutes > best.playtimeMinutes ? g : best),
    null
  );

  return {
    totalGames,
    neverPlayed,
    neverPlayedPercent: totalGames === 0 ? 0 : Math.round((neverPlayed / totalGames) * 100),
    bounced,
    totalHours: Math.round(totalMinutes / 60),
    mostPlayed: mostPlayed && mostPlayed.playtimeMinutes > 0 ? mostPlayed : null,
    playedLastTwoWeeks: games.filter((g) => g.playtimeTwoWeeksMinutes > 0).length,
    unplayedGames,
  };
}

/** Saat gösterimi: 1.234 yerine "1.234 saat" gibi okunur biçim. */
export function formatHours(hours: number): string {
  return hours.toLocaleString("en-US");
}
