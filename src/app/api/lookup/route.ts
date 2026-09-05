import { NextResponse } from "next/server";
import { SteamError, type SteamErrorCode } from "@/lib/steam";
import { lookup } from "@/lib/lookup";

/** Steam hata kodundan HTTP durumu. Hepsi istemci hatası değil. */
const STATUS: Record<SteamErrorCode, number> = {
  no_api_key: 500,
  bad_input: 400,
  not_found: 404,
  private: 403,
  empty_library: 404,
  steam_down: 503,
};

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("q") ?? "";

  try {
    return NextResponse.json(await lookup(raw));
  } catch (err) {
    if (err instanceof SteamError) {
      return NextResponse.json({ error: err.code }, { status: STATUS[err.code] });
    }
    // Beklenmeyen hata: ayrıntıyı istemciye sızdırma.
    console.error("lookup failed", err);
    return NextResponse.json({ error: "steam_down" }, { status: 503 });
  }
}
