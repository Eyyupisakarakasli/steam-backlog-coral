import { NextResponse } from "next/server";
import { bump } from "@/lib/counter";

/**
 * Sayaç ucu. Kişisel veri toplamıyor — ne Steam ID, ne IP, ne çerez.
 *
 * v0 için üç olay yeterli:
 *   lookup       bir profil sorgulandı
 *   share_click  paylaş veya indir tıklandı
 *   repeat       aynı tarayıcı ikinci kez sorguladı
 */

const ALLOWED = new Set(["lookup", "share_click", "repeat"]);

export async function POST(request: Request) {
  const name = new URL(request.url).searchParams.get("name") ?? "";
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await bump(name);
  return NextResponse.json({ ok: true });
}
