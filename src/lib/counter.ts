/**
 * Kalıcı sayaç.
 *
 * Kişisel veri tutulmuyor: yalnız olay adı ve gün. Steam ID, IP ve çerez yok.
 * Depo kurulmamışsa loga düşer, ürün çalışmaya devam eder.
 */

import { incr, getNumber, kvEnabled } from "./kv";

export const counterEnabled = kvEnabled;

/** Bugünün anahtarı, UTC. Günlük kırılım iki hafta sonra eğriyi görmeyi sağlar. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Olayı bir artırır: toplam ve günlük. */
export async function bump(event: string): Promise<void> {
  if (!counterEnabled) {
    console.log(`[event] ${event} ${new Date().toISOString()}`);
    return;
  }
  await Promise.all([incr(`count:${event}`), incr(`count:${event}:${today()}`)]);
}

/** Bir olayın toplam sayısı. Depo yoksa null. */
export async function total(event: string): Promise<number | null> {
  if (!counterEnabled) return null;
  return (await getNumber(`count:${event}`)) ?? 0;
}
