import { total, counterEnabled } from "@/lib/counter";

/**
 * Karar sayfası.
 *
 * İki hafta sonra bu üç sayıya bakılacak. Eşikler `18 - V0 KAPSAMI` dosyasında
 * dondurulmuştu ve burada da yazılı — sonucu görürken eşiği hatırlamak için.
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
  const counts = await Promise.all(GATES.map((g) => total(g.event)));

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
    </main>
  );
}
