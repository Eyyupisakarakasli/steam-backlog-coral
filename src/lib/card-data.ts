/**
 * Kart verisini hazırlar. Hata durumunda genel bir kart döner — gizli profilde
 * bile link önizlemesi bozulmasın.
 */

import { SteamError } from "./steam";
import { lookup } from "./lookup";
import type { CardData } from "./card";

export async function getCardData(rawSteamId: string): Promise<CardData> {
  try {
    const result = await lookup(decodeURIComponent(rawSteamId));
    return {
      label: result.archetype.label,
      proof: result.archetype.proof,
      name: result.profile.name,
      avatarUrl: result.profile.avatarUrl,
    };
  } catch (err) {
    if (!(err instanceof SteamError)) console.error("card data failed", err);
    return {
      label: "Steam Backlog",
      proof: "How much of your library have you actually played?",
      name: null,
      avatarUrl: null,
    };
  }
}
