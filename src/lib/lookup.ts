/**
 * Tek giriş noktası: girdiden sonuca.
 *
 * Hem API rotası hem sonuç sayfası bunu kullanır; iki yerde aynı mantığın
 * kopyalanmaması için ayrıldı.
 */

import { getOwnedGames, getProfile, toSteamId, gameHeaderUrl } from "./steam";
import { computeBacklog } from "./backlog";
import { pickArchetype, type Archetype } from "./archetype";

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
  suggestion: { appid: number; name: string; headerUrl: string } | null;
};

export async function lookup(raw: string): Promise<LookupResult> {
  const steamId = await toSteamId(raw);

  // Profil ve kütüphane birbirinden bağımsız; paralel çekilir.
  const [profile, games] = await Promise.all([getProfile(steamId), getOwnedGames(steamId)]);

  const stats = computeBacklog(games);
  const archetype = pickArchetype(stats, games);

  // Öneri: hiç açılmamışlar arasından rastgele. Sıralama v1'de, fiyat ve
  // inceleme verisi önbelleğe alındığında gelecek.
  const pick =
    stats.unplayedGames.length > 0
      ? stats.unplayedGames[Math.floor(Math.random() * stats.unplayedGames.length)]
      : null;

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
    suggestion: pick
      ? { appid: pick.appid, name: pick.name, headerUrl: gameHeaderUrl(pick.appid) }
      : null,
  };
}
