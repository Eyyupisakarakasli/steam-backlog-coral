/**
 * Arketip seçimi.
 *
 * Manşet sabit bir sayı değil, kullanıcıyı tarif eden bir etiket. Sebebi:
 * insanlar sayıyı değil, kendilerini anlatan etiketi paylaşıyor.
 *
 * v0'da seçim sabit öncelik sırasıyla yapılır — ilk tutan kazanır. Kullanıcı
 * verisi biriktiğinde bu, ortalamadan sapmaya göre puanlamaya çevrilecek ve
 * "senin gibi kullanıcıların %3'ü" karşılaştırması eklenebilecek.
 */

import type { OwnedGame } from "./steam";
import type { BacklogStats } from "./backlog";

export type ArchetypeId =
  | "loyalist"
  | "hoarder"
  | "deep_diver"
  | "bouncer"
  | "finisher"
  | "casual";

export type Archetype = {
  id: ArchetypeId;
  /** Paylaşım kartındaki büyük etiket. */
  label: string;
  /** Etiketi doğrulayan tek cümle. Sayı burada. */
  proof: string;
  /** Sonuç sayfasındaki kısa açıklama. */
  blurb: string;
};

/** Bir oyunun "derin oynanmış" sayılması için eşik. */
const DEEP_DIVE_HOURS = 100;

export function pickArchetype(stats: BacklogStats, games: OwnedGame[]): Archetype {
  const { totalGames, neverPlayed, neverPlayedPercent, bounced, totalHours, mostPlayed } = stats;

  const bouncedPercent = totalGames === 0 ? 0 : Math.round((bounced / totalGames) * 100);

  const topHours = mostPlayed ? Math.round(mostPlayed.playtimeMinutes / 60) : 0;
  const topShare = totalHours === 0 ? 0 : Math.round((topHours / totalHours) * 100);

  const deepDives = games.filter((g) => g.playtimeMinutes >= DEEP_DIVE_HOURS * 60);
  const deepDiveHours = Math.round(
    deepDives.reduce((sum, g) => sum + g.playtimeMinutes, 0) / 60
  );

  // Öncelik sırası: en kişisel ve en şaşırtıcı olan en başta.

  if (topShare >= 50 && mostPlayed) {
    return {
      id: "loyalist",
      label: "The Loyalist",
      proof: `${fmt(topHours)} of your ${fmt(totalHours)} hours went into ${mostPlayed.name}.`,
      blurb: "You found your game and you never left.",
    };
  }

  if (neverPlayedPercent >= 40 && totalGames >= 30) {
    return {
      id: "hoarder",
      label: "The Hoarder",
      proof: `You own ${fmt(totalGames)} games. You never opened ${fmt(neverPlayed)} of them.`,
      blurb: "The sales got you. Every single time.",
    };
  }

  if (deepDives.length >= 2) {
    return {
      id: "deep_diver",
      label: "The Deep Diver",
      proof: `${deepDives.length} games took ${fmt(deepDiveHours)} hours of your life.`,
      blurb: "You don't play games. You move into them.",
    };
  }

  if (bouncedPercent >= 25) {
    return {
      id: "bouncer",
      label: "The Bouncer",
      proof: `${fmt(bounced)} of your ${fmt(totalGames)} games never got a full hour.`,
      blurb: "You give every game a chance. A very short one.",
    };
  }

  if (neverPlayedPercent <= 20) {
    return {
      id: "finisher",
      label: "The Finisher",
      proof: `You've played ${100 - neverPlayedPercent}% of the games you own.`,
      blurb: "You actually play what you buy. That is rare.",
    };
  }

  return {
    id: "casual",
    label: "The Casual",
    proof: `${fmt(totalGames)} games, ${fmt(totalHours)} hours, no strong pattern.`,
    blurb: "You keep it balanced. Boring, but healthy.",
  };
}

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
