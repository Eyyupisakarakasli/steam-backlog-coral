/**
 * Steam Web API istemcisi.
 *
 * Kullanılan uç noktalar:
 *  - ISteamUser/ResolveVanityURL   -> kullanıcı adını SteamID64'e çevirir
 *  - ISteamUser/GetPlayerSummaries -> ad, avatar, profil görünürlüğü
 *  - IPlayerService/GetOwnedGames  -> kütüphane ve oynanma süreleri
 *
 * Oyun detayları gizliyse GetOwnedGames boş bir `response` döner. Kütüphane
 * gerçekten boş olan hesaptan ayırt edebilmek için bu iki durum ayrı ele alınır.
 */

const API = "https://api.steampowered.com";

/** Steam API anahtarı olmadan hiçbir çağrı yapılamaz. */
function apiKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new SteamError("no_api_key");
  return key;
}

export type SteamErrorCode =
  | "no_api_key"
  | "bad_input" // link veya kullanıcı adı çözümlenemedi
  | "not_found" // vanity URL Steam'de yok
  | "private" // oyun detayları gizli
  | "empty_library" // profil açık ama hiç oyun yok
  | "steam_down"; // Steam cevap vermedi veya bozuk cevap verdi

export class SteamError extends Error {
  constructor(public code: SteamErrorCode) {
    super(code);
    this.name = "SteamError";
  }
}

export type OwnedGame = {
  appid: number;
  name: string;
  /** Toplam oynanma, dakika. */
  playtimeMinutes: number;
  /** Son iki haftadaki oynanma, dakika. */
  playtimeTwoWeeksMinutes: number;
  /** Steam'in ikon karması; görsel URL'si bundan kurulur. Yoksa boş. */
  iconHash: string;
};

export type PlayerProfile = {
  steamId: string;
  name: string;
  avatarUrl: string;
  /** Steam'in kendi kodu: 1 gizli, 3 herkese açık. */
  visibilityState: number;
};

/**
 * Kullanıcının yapıştırdığı metinden SteamID64 veya vanity adı çıkarır.
 *
 * Kabul edilenler:
 *   https://steamcommunity.com/id/ornek/
 *   https://steamcommunity.com/profiles/76561198000000000/
 *   ornek
 *   76561198000000000
 */
export function parseSteamInput(
  raw: string
): { kind: "steamid"; value: string } | { kind: "vanity"; value: string } {
  const input = raw.trim();
  if (!input) throw new SteamError("bad_input");

  // SteamID64: 17 hane, 7656119 ile başlar.
  const isSteamId64 = (s: string) => /^7656119\d{10}$/.test(s);

  const profilesMatch = input.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (profilesMatch) return { kind: "steamid", value: profilesMatch[1] };

  const vanityMatch = input.match(/steamcommunity\.com\/id\/([^/?#\s]+)/i);
  if (vanityMatch) return { kind: "vanity", value: vanityMatch[1] };

  if (isSteamId64(input)) return { kind: "steamid", value: input };

  // Çıplak kullanıcı adı. Steam vanity adlarında harf, rakam, alt çizgi ve tire olur.
  if (/^[A-Za-z0-9_-]{2,32}$/.test(input)) return { kind: "vanity", value: input };

  throw new SteamError("bad_input");
}

/** Steam'e istek atar; ağ hatası ve bozuk JSON'u tek bir hataya indirger. */
async function getJson(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      // Steam yanıtları anlık; Next'in varsayılan önbelleğini kullanma.
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new SteamError("steam_down");
  }

  if (!res.ok) throw new SteamError("steam_down");

  try {
    return await res.json();
  } catch {
    throw new SteamError("steam_down");
  }
}

/** Vanity adı SteamID64'e çevirir. Steam `success: 1` dışında eşleşme yok demektir. */
export async function resolveVanity(vanity: string): Promise<string> {
  const url = `${API}/ISteamUser/ResolveVanityURL/v1/?key=${apiKey()}&vanityurl=${encodeURIComponent(
    vanity
  )}`;
  const data = (await getJson(url)) as {
    response?: { success?: number; steamid?: string };
  };

  const r = data.response;
  if (!r || r.success !== 1 || !r.steamid) throw new SteamError("not_found");
  return r.steamid;
}

/** Girdiyi doğrudan SteamID64'e indirger. */
export async function toSteamId(raw: string): Promise<string> {
  const parsed = parseSteamInput(raw);
  return parsed.kind === "steamid" ? parsed.value : resolveVanity(parsed.value);
}

/** Ad, avatar ve görünürlük. Profil hiç yoksa `not_found`. */
export async function getProfile(steamId: string): Promise<PlayerProfile> {
  const url = `${API}/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey()}&steamids=${steamId}`;
  const data = (await getJson(url)) as {
    response?: {
      players?: Array<{
        steamid: string;
        personaname: string;
        avatarfull: string;
        communityvisibilitystate: number;
      }>;
    };
  };

  const player = data.response?.players?.[0];
  if (!player) throw new SteamError("not_found");

  return {
    steamId: player.steamid,
    name: player.personaname,
    avatarUrl: player.avatarfull,
    visibilityState: player.communityvisibilitystate,
  };
}

/**
 * Kütüphaneyi getirir.
 *
 * Steam, oyun detayları gizliyse `{"response":{}}` döner — yani `game_count`
 * alanı hiç gelmez. Kütüphanesi gerçekten boş olan açık profilde ise
 * `game_count: 0` gelir. Ayrım bu alanın varlığına bakılarak yapılır.
 */
export async function getOwnedGames(steamId: string): Promise<OwnedGame[]> {
  const url =
    `${API}/IPlayerService/GetOwnedGames/v1/?key=${apiKey()}&steamid=${steamId}` +
    `&include_appinfo=true&include_played_free_games=true`;

  const data = (await getJson(url)) as {
    response?: {
      game_count?: number;
      games?: Array<{
        appid: number;
        name?: string;
        playtime_forever?: number;
        playtime_2weeks?: number;
        img_icon_url?: string;
      }>;
    };
  };

  const r = data.response;
  if (!r || typeof r.game_count !== "number") throw new SteamError("private");
  if (r.game_count === 0 || !r.games?.length) throw new SteamError("empty_library");

  return r.games.map((g) => ({
    appid: g.appid,
    name: g.name ?? `Unknown app ${g.appid}`,
    playtimeMinutes: g.playtime_forever ?? 0,
    playtimeTwoWeeksMinutes: g.playtime_2weeks ?? 0,
    iconHash: g.img_icon_url ?? "",
  }));
}

/** Steam ikon URL'si. `iconHash` boşsa görsel yok demektir. */
export function gameIconUrl(appid: number, iconHash: string): string | null {
  if (!iconHash) return null;
  return `https://media.steampowered.com/steamcommunity/public/images/apps/${appid}/${iconHash}.jpg`;
}

/** Mağaza kapak görseli. Ayrı bir istek gerektirmez, sabit şemadır. */
export function gameHeaderUrl(appid: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
}
