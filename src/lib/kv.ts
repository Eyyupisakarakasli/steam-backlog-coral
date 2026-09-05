/**
 * Upstash Redis'in REST arayüzü. SDK bağımlılığı yok, düz HTTP.
 *
 * Hem sayaç hem oyun bilgisi önbelleği bunu kullanıyor. Ortam değişkenleri
 * yoksa bütün işlemler sessizce boş döner; ürün depo olmadan da çalışır.
 */

const REST_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvEnabled = Boolean(REST_URL && REST_TOKEN);

/** Redis komutunu REST üzerinden çalıştırır. Hata yutulur — depo ürünü durdurmaz. */
async function run(parts: (string | number)[], timeoutMs = 3_000): Promise<unknown> {
  if (!kvEnabled) return null;

  const path = parts.map((p) => encodeURIComponent(String(p))).join("/");
  try {
    const res = await fetch(`${REST_URL}/${path}`, {
      headers: { Authorization: `Bearer ${REST_TOKEN}` },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: unknown };
    return body.result ?? null;
  } catch {
    return null;
  }
}

export async function incr(key: string): Promise<void> {
  await run(["incr", key]);
}

export async function getNumber(key: string): Promise<number | null> {
  const v = await run(["get", key]);
  return v == null ? null : Number(v);
}

/** JSON değeri okur. Bozuk kayıt varsa yok sayılır. */
export async function getJson<T>(key: string): Promise<T | null> {
  const v = await run(["get", key]);
  if (typeof v !== "string") return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

/** JSON değeri saniye cinsinden ömürle yazar. */
export async function setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await run(["set", key, JSON.stringify(value), "ex", ttlSeconds]);
}

/** Birden çok anahtarı tek çağrıda okur; sıra korunur. */
export async function mgetJson<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  const v = await run(["mget", ...keys], 5_000);
  if (!Array.isArray(v)) return keys.map(() => null);
  return v.map((item) => {
    if (typeof item !== "string") return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  });
}
