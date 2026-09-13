# Steam Backlog

Paste a Steam profile, see how much of the library was never opened.

**Live:** https://steam-backlog-coral.vercel.app

No signup. Nothing about you is stored.

## What it does

Reads a public Steam library and answers one question: how much of it did you
actually play?

The headline is not a fixed number. It picks the stat that describes you best —
a large untouched backlog, a habit of quitting within the hour, or hundreds of
hours sunk into a single game.

## Why the headline is a label

People share labels, not numbers. `184 games, 113 never opened` is information.
`The Hoarder` is an identity. The second one gets sent to a friend.

Archetypes are chosen in a fixed priority order; the first match wins. Once there
is real usage data this becomes a deviation score, which also unlocks comparisons
like "3% of players are like you".

## Steam privacy

Steam hides game details by default, even on public profiles. The API returns an
empty response in that case, which is deliberately kept separate from a genuinely
empty library — the two get different messages.

To be visible: Profile → Edit Profile → Privacy Settings → **Game details** →
Public.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # then paste your key
npm run dev
```

Get a key at https://steamcommunity.com/dev/apikey — enter `localhost` if it asks
for a domain.

## Stack

Next.js App Router, TypeScript, Tailwind. Share cards are rendered server-side
with `next/og`. Counters use Upstash Redis over its REST API; without the
credentials the app still runs and just logs instead.

## Privacy

No accounts, no user database, no cookies. Steam IDs are never stored. The
counters record an event name and a date, nothing else. `repeat` uses
`localStorage` in the browser, so no identity exists on the server.

## Status

v0. It measures three things and the thresholds were frozen before launch:

| | Target |
|---|---|
| Profiles looked up | 50 |
| Shared or downloaded | 5 |
| Came back a second time | 10 |

Live numbers: [`/stats`](https://steam-backlog-coral.vercel.app/stats)

The share number is the one that matters. If nobody shares, adding a social layer
will not fix it.

## License

[MIT](LICENSE) © Eyyüp İsa Karakaşlı
