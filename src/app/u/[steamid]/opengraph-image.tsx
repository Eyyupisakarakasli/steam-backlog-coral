import { ImageResponse } from "next/og";
import { getCardData } from "@/lib/card-data";
import { renderCard, CARD_SIZES } from "@/lib/card";

/**
 * Link önizleme görseli.
 *
 * Sonuç URL'si bir yere yapıştırıldığında görünen kart budur — WhatsApp,
 * Discord ve Twitter hepsi bunu çeker. Ürünün dağıtımı buna bağlı.
 */

export const size = CARD_SIZES.og;
export const contentType = "image/png";
export const alt = "Steam backlog result";

export default async function Image({ params }: { params: Promise<{ steamid: string }> }) {
  const { steamid } = await params;
  const data = await getCardData(steamid);
  return new ImageResponse(renderCard(data, "og"), size);
}
