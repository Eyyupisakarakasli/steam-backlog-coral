/**
 * Kütüphane boyutu histogramı.
 *
 * Tek soruyu cevaplamak için var: gelen kullanıcılar istifçi mi, yoksa küçük
 * kütüphaneli mi? Cevap, ortak oynanmamış oyun eşleşmesi fikrinin yaşayıp
 * yaşamayacağını belirliyor.
 *
 * 6 Eylül 2026 ölçümü: 25 ve 16 oyunluk iki kütüphanede ortak oynanmamış oyun
 * sıfır çıktı. Kaba hesap, eşleşmenin çalışması için iki tarafın da 50 civarı
 * oyuna ihtiyaç duyduğunu söylüyor. Bu histogram, o eşiğin üstünde kaç kişi
 * olduğunu ölçüyor.
 *
 * Kişisel veri yok: yalnız hangi aralığa düştüğü sayılıyor, sayının kendisi
 * değil. Steam ID de saklanmıyor.
 */

export type Bucket = {
  /** Sayaç olay adı. */
  id: string;
  label: string;
  min: number;
  /** Üst sınır dahil. Son aralıkta sonsuz. */
  max: number;
};

export const LIBRARY_BUCKETS: Bucket[] = [
  { id: "lib_0-10", label: "1–10 games", min: 0, max: 10 },
  { id: "lib_11-50", label: "11–50 games", min: 11, max: 50 },
  { id: "lib_51-100", label: "51–100 games", min: 51, max: 100 },
  { id: "lib_100+", label: "100+ games", min: 101, max: Infinity },
];

export const UNPLAYED_BUCKETS: Bucket[] = [
  { id: "unplayed_0-5", label: "0–5 never opened", min: 0, max: 5 },
  { id: "unplayed_6-20", label: "6–20 never opened", min: 6, max: 20 },
  { id: "unplayed_21-50", label: "21–50 never opened", min: 21, max: 50 },
  { id: "unplayed_50+", label: "50+ never opened", min: 51, max: Infinity },
];

/** Sayının düştüğü aralık. Sınır dışı kalırsa son aralığa yazılır. */
export function bucketFor(buckets: Bucket[], n: number): Bucket {
  return buckets.find((b) => n >= b.min && n <= b.max) ?? buckets[buckets.length - 1];
}

/** Sayaç ucunun kabul edeceği adlar. Uydurma olay adı yazılamasın diye. */
export const BUCKET_EVENTS: ReadonlySet<string> = new Set(
  [...LIBRARY_BUCKETS, ...UNPLAYED_BUCKETS].map((b) => b.id)
);

/**
 * Eşleşme fikrinin yaşaması için gereken eşik: 50+ oynanmamış oyun.
 * Stats sayfasında bu oranın altını çiziyoruz.
 */
export const COPLAY_VIABLE_BUCKETS = ["unplayed_21-50", "unplayed_50+"];
