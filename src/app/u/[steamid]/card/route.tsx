import { ImageResponse } from "next/og";
import { getCardData } from "@/lib/card-data";
import { renderCard, CARD_SIZES, type CardFormat } from "@/lib/card";

/**
 * İndirilebilir paylaşım kartı.
 *
 * `?format=square` Instagram gönderisi, `?format=story` hikâye boyutu.
 * Link önizlemesi ayrı dosyada (opengraph-image); o kendiliğinden metadata'ya
 * bağlanıyor, bu ise kullanıcının indirmesi için.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ steamid: string }> }
) {
  const { steamid } = await params;

  const requested = new URL(request.url).searchParams.get("format");
  const format: CardFormat =
    requested === "square" || requested === "story" ? requested : "square";

  const data = await getCardData(steamid);

  return new ImageResponse(renderCard(data, format), CARD_SIZES[format]);
}
