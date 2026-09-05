/**
 * Paylaşım kartının görsel tanımı.
 *
 * İki yerde kullanılıyor: link önizlemesi (opengraph-image) ve indirilebilir
 * kart (/card). Aynı tasarımın iki kopyası olmasın diye burada.
 *
 * ImageResponse arka planda Satori kullanıyor: yalnız flexbox, grid yok, her
 * öğede `display` açıkça yazılmalı.
 */

/** Kartın altındaki adres. Vercel üretim alan adını kendisi veriyor. */
const SITE_HOST =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "steam-backlog-coral.vercel.app";

export const CARD_BG = "#0e1116";
const FG = "#e6edf3";
const MUTED = "#8b949e";
const ACCENT = "#66c0f4";

export const CARD_SIZES = {
  /** Link önizlemesi: WhatsApp, Discord, Twitter. */
  og: { width: 1200, height: 630 },
  /** Instagram gönderisi. */
  square: { width: 1080, height: 1080 },
  /** Instagram ve WhatsApp hikâyesi. */
  story: { width: 1080, height: 1920 },
} as const;

export type CardFormat = keyof typeof CARD_SIZES;

export type CardData = {
  label: string;
  proof: string;
  name: string | null;
  avatarUrl: string | null;
};

/** Kartı verilen biçim için üretir. Ölçüler biçime göre orantılanır. */
export function renderCard(data: CardData, format: CardFormat) {
  const { width, height } = CARD_SIZES[format];

  // Dar ve uzun biçimlerde yazı büyür, yatayda küçülür.
  const scale = width / 1200;
  const pad = Math.round(72 * scale * (format === "og" ? 1 : 1.1));
  const labelSize = Math.round(34 * scale * (format === "og" ? 1 : 1.35));
  const proofSize = Math.round(68 * scale * (format === "og" ? 1 : 1.25));
  const nameSize = Math.round(32 * scale * (format === "og" ? 1 : 1.3));
  const avatar = Math.round(64 * scale * (format === "og" ? 1 : 1.3));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: CARD_BG,
        padding: pad,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: Math.round(20 * scale) }}>
        {data.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.avatarUrl}
            alt=""
            width={avatar}
            height={avatar}
            style={{ borderRadius: 999 }}
          />
        )}
        {data.name && (
          <div style={{ display: "flex", fontSize: nameSize, color: MUTED }}>{data.name}</div>
        )}
      </div>

      {/* Orta blok kalan alanı doldurur ve içeriği kendi içinde ortalar. Bu
          olmadan uzun biçimlerde üç öğe uçlara dağılıp ortada boşluk kalıyor. */}
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: labelSize,
            letterSpacing: Math.round(8 * scale),
            color: ACCENT,
            textTransform: "uppercase",
          }}
        >
          {data.label}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: Math.round(24 * scale),
            fontSize: proofSize,
            lineHeight: 1.15,
            color: FG,
            fontWeight: 700,
          }}
        >
          {data.proof}
        </div>
      </div>

      <div style={{ display: "flex", fontSize: nameSize, color: MUTED }}>
        {SITE_HOST}
      </div>
    </div>
  );
}
