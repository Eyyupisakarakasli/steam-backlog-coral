import Link from "next/link";
import type { Metadata } from "next";
import { SteamError, type SteamErrorCode } from "@/lib/steam";
import { lookup, type LookupResult } from "@/lib/lookup";
import ShareBar from "./ShareBar";
import TrackVisit from "./TrackVisit";

type Props = { params: Promise<{ steamid: string }> };

/**
 * Sonuç sayfası.
 *
 * Sunucuda çalışır çünkü paylaşım için her sonucun kendi URL'si olmalı. İstemci
 * tarafı state ile yapılsaydı sonuç paylaşılamazdı ve ürünün tek dağıtım aracı
 * kaybolurdu.
 */

async function load(raw: string): Promise<LookupResult | SteamErrorCode> {
  try {
    return await lookup(decodeURIComponent(raw));
  } catch (err) {
    if (err instanceof SteamError) return err.code;
    console.error("lookup failed", err);
    return "steam_down";
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { steamid } = await params;
  const result = await load(steamid);

  if (typeof result === "string") {
    return { title: "Steam Backlog" };
  }

  const title = `${result.profile.name} — ${result.archetype.label}`;
  return {
    title,
    description: result.archetype.proof,
    openGraph: { title, description: result.archetype.proof },
    twitter: { card: "summary_large_image", title, description: result.archetype.proof },
  };
}

export default async function ResultPage({ params }: Props) {
  const { steamid } = await params;
  const result = await load(steamid);

  if (typeof result === "string") return <ErrorView code={result} />;

  const { profile, archetype, stats, backlog, backlogRemaining } = result;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <TrackVisit totalGames={stats.totalGames} neverPlayed={stats.neverPlayed} />

      <div className="flex items-center gap-3">
        {/* Steam avatarları sabit boyutlu; next/image yapılandırması gerektirmesin diye img. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profile.avatarUrl} alt="" className="h-10 w-10 rounded-full" />
        <span className="text-muted">{profile.name}</span>
      </div>

      <p className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
        {archetype.label}
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{archetype.proof}</h1>
      <p className="mt-3 text-muted">{archetype.blurb}</p>

      <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Games owned" value={stats.totalGames} />
        <Stat label="Never opened" value={stats.neverPlayed} />
        <Stat label="Under an hour" value={stats.bounced} />
        <Stat label="Hours played" value={stats.totalHours} />
        <Stat label="Played recently" value={stats.playedLastTwoWeeks} />
        {stats.mostPlayed && <Stat label="Most played" value={`${stats.mostPlayed.hours}h`} />}
      </dl>

      {stats.mostPlayed && (
        <p className="mt-4 text-sm text-muted">
          Most played: <span className="text-foreground">{stats.mostPlayed.name}</span>
        </p>
      )}

      {backlog.length > 0 && (
        <section className="mt-14">
          <h2 className="text-xl font-bold">Start here</h2>
          <p className="mt-1 text-sm text-muted">
            You already own these. You never opened them. Sorted by how many people reviewed
            them.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {backlog.slice(0, 3).map((g) => (
              <a
                key={g.appid}
                href={`https://store.steampowered.com/app/${g.appid}/`}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.headerUrl} alt="" className="w-full" />
                <div className="p-4">
                  <p className="font-semibold leading-snug">{g.name}</p>
                  {g.reviews !== null && (
                    <p className="mt-1 text-xs text-muted">
                      {g.reviews.toLocaleString("en-US")} reviews
                      {g.metacritic !== null && ` · ${g.metacritic} metacritic`}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>

          {backlog.length > 3 && (
            <ul className="mt-6 flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
              {backlog.slice(3).map((g) => (
                <li key={g.appid}>
                  <a
                    href={`https://store.steampowered.com/app/${g.appid}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-[#1b222c]"
                  >
                    <span className="truncate">{g.name}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {g.reviews !== null ? `${g.reviews.toLocaleString("en-US")} reviews` : "—"}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          {backlogRemaining > 0 && (
            <p className="mt-3 text-sm text-muted">
              and {backlogRemaining.toLocaleString("en-US")} more you have never opened.
            </p>
          )}
        </section>
      )}

      <ShareBar steamId={profile.steamId} />

      <Link href="/" className="mt-10 inline-block text-sm text-accent hover:underline">
        Check another profile
      </Link>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums">
        {typeof value === "number" ? value.toLocaleString("en-US") : value}
      </dd>
    </div>
  );
}

/** Dört hata durumu. Hiçbiri belirsiz mesaj vermiyor. */
function ErrorView({ code }: { code: SteamErrorCode }) {
  const content: Record<SteamErrorCode, { title: string; body: React.ReactNode }> = {
    private: {
      title: "Your game details are private",
      body: (
        <>
          <p className="text-muted">
            Steam hides your library by default. Two clicks to fix it:
          </p>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-muted">
            <li>Open your Steam profile</li>
            <li>Edit Profile → Privacy Settings</li>
            <li>
              Set <strong className="text-foreground">Game details</strong> to{" "}
              <strong className="text-foreground">Public</strong>
            </li>
          </ol>
          <p className="mt-4 text-sm text-muted">You can switch it back afterwards.</p>
        </>
      ),
    },
    not_found: {
      title: "No Steam profile found",
      body: (
        <p className="text-muted">
          Check the link. It should look like steamcommunity.com/id/yourname or
          steamcommunity.com/profiles/7656119…
        </p>
      ),
    },
    empty_library: {
      title: "Nothing to show yet",
      body: <p className="text-muted">This account doesn&apos;t own any games.</p>,
    },
    bad_input: {
      title: "That doesn't look like a Steam profile",
      body: <p className="text-muted">Paste your full profile link.</p>,
    },
    steam_down: {
      title: "Steam isn't answering",
      body: <p className="text-muted">Steam&apos;s API is having a moment. Try again shortly.</p>,
    },
    no_api_key: {
      title: "Server not configured",
      body: <p className="text-muted">This one is on us, not you.</p>,
    },
  };

  const { title, body } = content[code];

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-20">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="mt-4">{body}</div>
      <Link href="/" className="mt-8 inline-block text-sm text-accent hover:underline">
        Try again
      </Link>
    </main>
  );
}
