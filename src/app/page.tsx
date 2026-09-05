"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseSteamInput } from "@/lib/steam";

/**
 * Giriş ekranı. Tek kutu, tek buton.
 *
 * Girdi burada da ayrıştırılıyor ki açıkça hatalı bir şey yazıldığında sunucuya
 * gitmeden uyaralım. Vanity adının gerçekten var olup olmadığı yalnız sunucuda
 * anlaşılır.
 */
export default function Home() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      parseSteamInput(value);
    } catch {
      setError("That doesn't look like a Steam profile. Paste your profile link.");
      return;
    }
    router.push(`/u/${encodeURIComponent(value.trim())}`);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          How much of your Steam library
          <br />
          have you actually played?
        </h1>

        <p className="mt-4 text-muted">Paste your profile. No signup, nothing saved.</p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="steamcommunity.com/id/yourname"
            aria-label="Steam profile link or username"
            className="flex-1 rounded-lg border border-border bg-surface px-4 py-3 text-foreground
                       placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-6 py-3 font-semibold text-[#0e1116] transition hover:opacity-90"
          >
            Check
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <p className="mt-8 text-sm text-muted">
          Your Steam game details must be public. Steam hides them by default — Profile → Edit
          Profile → Privacy Settings → <strong>Game details</strong> → Public.
        </p>
      </div>
    </main>
  );
}
