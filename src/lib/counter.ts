/**
 * Kalıcı sayaç.
 *
 * Upstash Redis'in REST arayüzünü kullanıyor — SDK gerekmiyor, düz HTTP.
 * Ortam değişkenleri yoksa sessizce loga düşer, ürün çalışmaya devam eder.
 * Böylece kod, depo kurulmadan önce de yayınlanabilir.
 *
 * Kişisel veri tutulmuyor: yalnız olay adı ve gün. Steam ID, IP ve çerez yok.
 */

const REST_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const counterEnabled = Boolean(REST_URL && REST_TOKEN);

/** Bugünün anahtarı, UTC. Günlük kırılım iki hafta sonra eğriyi görmeyi sağlar. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function command(parts: string[]): Promise<unknown> {
  if (!counterEnabled) return null;

  const url = `${REST_URL}/${parts.map(encodeURIComponent).join("/")}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${REST_TOKEN}` },
      cache: "no-store",
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    // Sayaç ürünün çalışmasını engellemez.
    return null;
  }
}

/**
 * Olayı bir artırır. İki anahtar tutulur: toplam ve günlük.
 * Çağıran beklemek zorunda değil — hata yutuluyor.
 */
export async function bump(event: string): Promise<void> {
  if (!counterEnabled) {
    console.log(`[event] ${event} ${new Date().toISOString()}`);
    return;
  }
  await Promise.all([
    command(["incr", `count:${event}`]),
    command(["incr", `count:${event}:${today()}`]),
  ]);
}

/** Bir olayın toplam sayısı. Depo yoksa null. */
export async function total(event: string): Promise<number | null> {
  const data = (await command(["get", `count:${event}`])) as { result?: string | null } | null;
  if (!data || data.result == null) return counterEnabled ? 0 : null;
  return Number(data.result);
}
