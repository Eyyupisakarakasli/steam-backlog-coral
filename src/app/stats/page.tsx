import { total, counterEnabled } from "@/lib/counter";
import {
  LIBRARY_BUCKETS,
  UNPLAYED_BUCKETS,
  COPLAY_VIABLE_BUCKETS,
  type Bucket,
} from "@/lib/buckets";

/**
 * Karar sayfası.
 *
 * İki hafta sonra bu üç sayıya bakılacak. Eşikler `18 - V0 KAPSAMI` dosyasında
 * dondurulmuştu ve burada da yazılı — sonucu görürken eşiği hatırlamak için.
 *
 * Altındaki histogram ikinci bir soruyu cevaplıyor: ortak oynanmamış oyun
 * eşleşmesi fikri yaşar mı? Cevap, gelen kullanıcıların kütüphane boyutunda.
 */

export const dynamic = "force-dynamic";

const GATES = [
  {
    event: "lookup",
    label: "Looked up a profile",
    target: 50,
    note: "Below 50 means distribution was never tested — not a product verdict.",
  },
  {
    event: "share_click",
    label: "Shared or downloaded",
    target: 5,
    note: "The one that matters. Zero means the product isn't interesting.",
  },
  {
    event: "repeat",
    label: "Came back a second time",
    target: 10,
    note: "Zero means it's a one-shot toy.",
  },
];

export default async function StatsPage() {
  const [counts, libCounts, unplayedCounts] = await Promise.all([
    Promise.all(GATES.map((g) => total(g.event))),
    Promise.all(LIBRARY_BUCKETS.map((b) => total(b.id))),
    Promise.all(UNPLAYED_BUCKETS.map((b) => total(b.id))),
  ]);

  // Eşleşme fikrinin yaşayabileceği kesimin payı. Payda, aralığı ölçülen
  // kullanıcı sayısı — `lookup` değil, çünkü eski ziyaretlerde aralık yoktu.
  const unplayedTotal = sum(unplayedCounts);
  const viable = UNPLAYED_BUCKETS.reduce(
    (acc, b, i) => (COPLAY_VIABLE_BUCKETS.includes(b.id) ? acc + (unplayedCounts[i] ?? 0) : acc),
    0
  );
  const viablePercent = unplayedTotal === 0 ? null : Math.round((viable / unplayedTotal) * 100);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <h1 className="text-2xl font-bold">v0 gates</h1>
      <p className="mt-2 text-muted">Frozen before launch. Read after two weeks.</p>

      {!counterEnabled && (
        <p className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
          Counter storage isn&apos;t configured, so nothing is being recorded. Add the Upstash
          Redis integration on Vercel and redeploy.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {GATES.map((gate, i) => {
          const count = counts[i];
          const passed = count !== null && count >= gate.target;

          return (
            <div key={gate.event} className="rounded-lg border border-border bg-surface p-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">{gate.label}</span>
                <span className="text-2xl font-bold tabular-nums">
                  {count === null ? "—" : count.toLocaleString("en-US")}
                  <span className="ml-1 text-sm font-normal text-muted">/ {gate.target}</span>
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{gate.note}</p>
              {count !== null && (
                <p className={`mt-2 text-sm ${passed ? "text-accent" : "text-muted"}`}>
                  {passed ? "Passed" : "Not yet"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <h2 className="mt-14 text-xl font-bold">Who is showing up</h2>
      <p className="mt-2 text-sm text-muted">
        Only the bracket is counted, never the number itself. No Steam IDs, no cookies.
      </p>

      <Histogram title="Library size" buckets={LIBRARY_BUCKETS} counts={libCounts} />
      <Histogram title="Never opened" buckets={UNPLAYED_BUCKETS} counts={unplayedCounts} />

      <div className="mt-6 rounded-lg border border-border bg-surface p-5">
        <p className="text-sm font-semibold">Co-op matching: viable?</p>
        <p className="mt-2 text-sm text-muted">
          Two people only share an unplayed game if both libraries are large. Measured on 6 Sep
          2026: two real accounts with 5 unplayed games each shared zero. Rough estimate says both
          sides need around 20+ unplayed games before a match is likely.
        </p>
        <p className="mt-3 text-sm">
          {viablePercent === null ? (
            <span className="text-muted">No data yet.</span>
          ) : (
            <>
              <span className="text-2xl font-bold tabular-nums">{viablePercent}%</span>{" "}
              <span className="text-muted">
                of visitors have 21+ unplayed games ({viable.toLocaleString("en-US")} of{" "}
                {unplayedTotal.toLocaleString("en-US")}).
              </span>
            </>
          )}
        </p>
        <p className="mt-2 text-sm text-muted">
          Under 25%: drop the idea. Over 50%: build it.
        </p>
      </div>
    </main>
  );
}

function sum(counts: (number | null)[]): number {
  return counts.reduce<number>((acc, c) => acc + (c ?? 0), 0);
}

function Histogram({
  title,
  buckets,
  counts,
}: {
  title: string;
  buckets: Bucket[];
  counts: (number | null)[];
}) {
  const totalCount = sum(counts);
  // Çubuk boyu en büyük aralığa göre; küçük farklar da görünsün diye.
  const peak = Math.max(1, ...counts.map((c) => c ?? 0));

  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-5">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-muted tabular-nums">
          {totalCount.toLocaleString("en-US")} total
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {buckets.map((bucket, i) => {
          const count = counts[i] ?? 0;
          const share = totalCount === 0 ? 0 : Math.round((count / totalCount) * 100);

          return (
            <div key={bucket.id} className="flex items-center gap-3 text-sm">
              <span className="w-36 shrink-0 text-muted">{bucket.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-accent"
                  style={{ width: `${(count / peak) * 100}%` }}
                />
              </span>
              <span className="w-20 shrink-0 text-right tabular-nums">
                {count.toLocaleString("en-US")}
                <span className="ml-1 text-muted">{share}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
