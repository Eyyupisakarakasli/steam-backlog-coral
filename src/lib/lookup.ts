/**
 * Tek giriş noktası: girdiden sonuca.
 *
 * Hem API rotası hem sonuç sayfası bunu kullanır; iki yerde aynı mantığın
 * kopyalanmaması için ayrıldı.
 */

import { getOwnedGames, getProfile, toSteamId, gameHeaderUrl } from "./steam";
import { computeBacklog } from "./backlog";
import { pickArchetype, type Archetype } from "./archetype";
import { getDetails } from "./gamedetails";

/** Listede kaç oyun gösterilecek. Sayfayı boğmadan seçim sunacak kadar. */
const BACKLOG_LIST_SIZE = 24;

export type BacklogEntry = {
  appid: number;
  name: string;
  headerUrl: string;
  /** Steam inceleme sayısı; bilgi çekilemediyse null. */
  reviews: number | null;
  metacritic: number | null;
  genres: string[];
};

export type LookupResult = {
  profile: { steamId: string; name: string; avatarUrl: string };
  archetype: Archetype;
  stats: {
    totalGames: number;
    neverPlayed: number;
    neverPlayedPercent: number;
    bounced: number;
    totalHours: number;
    playedLastTwoWeeks: number;
    mostPlayed: { name: string; hours: number } | null;
  };
  /** Oynanmamış oyunlar, kaliteye göre sıralı. İlk üçü "buradan başla". */
  backlog: BacklogEntry[];
  /** Listeye sığmayan oynanmamış oyun sayısı. */
  backlogRemaining: number;
};

export async function lookup(raw: string): Promise<LookupResult> {
  const steamId = await toSteamId(raw);

  // Profil ve kütüphane birbirinden bağımsız; paralel çekilir.
  const [profile, games] = await Promise.all([getProfile(steamId), getOwnedGames(steamId)]);

  const stats = computeBacklog(games);
  const archetype = pickArchetype(stats, games);

  // Oyun bilgisi yalnız oynanmamışlar için gerekiyor; hepsini çekmek gereksiz.
  const details = await getDetails(stats.unplayedGames.map((g) => g.appid));

  const backlog: BacklogEntry[] = stats.unplayedGames
    .map((g) => {
      const d = details.get(g.appid);
      return {
        appid: g.appid,
        name: g.name,
        headerUrl: gameHeaderUrl(g.appid),
        reviews: d?.reviews ?? null,
        metacritic: d?.metacritic ?? null,
        genres: d?.genres ?? [],
      };
    })
    // Bilgisi olmayanlar sona düşer; aralarında inceleme sayısı belirleyici.
    .sort((a, b) => (b.reviews ?? -1) - (a.reviews ?? -1));

  return {
    profile: {
      steamId: profile.steamId,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
    },
    archetype,
    stats: {
      totalGames: stats.totalGames,
      neverPlayed: stats.neverPlayed,
      neverPlayedPercent: stats.neverPlayedPercent,
      bounced: stats.bounced,
      totalHours: stats.totalHours,
      playedLastTwoWeeks: stats.playedLastTwoWeeks,
      mostPlayed: stats.mostPlayed
        ? { name: stats.mostPlayed.name, hours: Math.round(stats.mostPlayed.playtimeMinutes / 60) }
        : null,
    },
    backlog: backlog.slice(0, BACKLOG_LIST_SIZE),
    backlogRemaining: Math.max(0, backlog.length - BACKLOG_LIST_SIZE),
  };
}
