/**
 * Oyun bilgisi: inceleme sayısı, metacritic, tür.
 *
 * Steam'in kütüphane API'si oyun kalitesi hakkında hiçbir şey vermiyor; bu
 * bilgi yalnız mağaza uç noktasında var. O uç nokta belgelenmemiş, oyun başına
 * tek istek kabul ediyor (çoklu appid boş dönüyor) ve oran sınırı belirsiz.
 *
 * 5 Eylül 2026 ölçümü: 120 ardışık istek, 129 istek/dakika, sıfır hata. Yine de
 * güvenmiyoruz — önbellek zorunlu. Oyun bilgisi kullanıcıya özel değil, bir kez
 * çekilip herkes için kullanılıyor.
 */

import { getJson, setJson, mgetJson, kvEnabled } from "./kv";

/** Oyun bilgisi ayda bir tazelenmesi yeter; puanlar hızlı değişmiyor. */
const TTL_SECONDS = 30 * 24 * 60 * 60;

/** Tek istekte kaç yeni oyun çekilecek. Gecikmeyi sınırlar. */
const MAX_FETCH_PER_REQUEST = 40;

/** Aynı anda kaç istek. Steam'i yormamak ve gecikmeyi düşürmek arasında denge. */
const CONCURRENCY = 8;

export type GameDetails = {
  appid: number;
  /** Steam inceleme sayısı. Kalite sıralamasının ana sinyali. */
  reviews: number;
  /** Metacritic puanı; çoğu oyunda yok. */
  metacritic: number | null;
  genres: string[];
};

function key(appid: number): string {
  return `game:${appid}`;
}

/** Mağaza uç noktasından tek oyunun bilgisini çeker. Başarısızsa null. */
async function fetchOne(appid: number): Promise<GameDetails | null> {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6_000) });
    if (!res.ok) return null;

    const body = (await res.json()) as Record<
      string,
      {
        success?: boolean;
        data?: {
          recommendations?: { total?: number };
          metacritic?: { score?: number };
          genres?: { description: string }[];
        };
      }
    >;

    const entry = body[String(appid)];
    if (!entry?.success || !entry.data) return null;

    return {
      appid,
      reviews: entry.data.recommendations?.total ?? 0,
      metacritic: entry.data.metacritic?.score ?? null,
      genres: (entry.data.genres ?? []).map((g) => g.description).slice(0, 3),
    };
  } catch {
    return null;
  }
}

/** Verilen listeyi sınırlı eşzamanlılıkla işler. */
async function pooled<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    results.push(...(await Promise.all(items.slice(i, i + limit).map(fn))));
  }
  return results;
}

/**
 * Önbellekten okur, eksikleri çeker ve yazar.
 *
 * Önbellek yoksa yalnız ilk `MAX_FETCH_PER_REQUEST` oyun için bilgi gelir;
 * geri kalanı bilgisiz döner ve listede sona düşer. Bu bilinçli: 200 oyunluk
 * kütüphane için 200 istek beklemek kabul edilebilir bir gecikme değil.
 */
export async function getDetails(appids: number[]): Promise<Map<number, GameDetails>> {
  const out = new Map<number, GameDetails>();
  if (appids.length === 0) return out;

  let missing = appids;

  if (kvEnabled) {
    const cached = await mgetJson<GameDetails>(appids.map(key));
    missing = [];
    appids.forEach((appid, i) => {
      const hit = cached[i];
      if (hit) out.set(appid, hit);
      else missing.push(appid);
    });
  }

  const toFetch = missing.slice(0, MAX_FETCH_PER_REQUEST);
  const fetched = await pooled(toFetch, CONCURRENCY, fetchOne);

  await Promise.all(
    fetched.map(async (d) => {
      if (!d) return;
      out.set(d.appid, d);
      if (kvEnabled) await setJson(key(d.appid), d, TTL_SECONDS);
    })
  );

  return out;
}
