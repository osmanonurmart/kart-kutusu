/**
 * Kart Kutusu — sesli pratik arka ucu (Cloudflare Worker)
 *
 * NEDEN VAR
 *   Anthropic API anahtarı tarayıcıya konamaz. index.html herkese açık;
 *   anahtarı oraya yazarsak kaynağı görüntüleyen herkes onu alıp senin
 *   hesabına istek atabilir. Bu Worker anahtarı sunucu tarafında tutar,
 *   tarayıcı yalnızca buraya konuşur.
 *
 * KURULUM: worker/README.md
 */

import Anthropic from "@anthropic-ai/sdk";

export interface Env {
  ANTHROPIC_API_KEY: string;
  /** Uygulamaya girerken sorulan parola. Depoda değil, Worker secret'ı. */
  APP_PASSPHRASE: string;
  /** Virgülle ayrılmış izinli origin listesi. */
  ALLOWED_ORIGINS: string;
}

/** Tek istekte kabul edilen en uzun kullanıcı mesajı. */
const MAX_MESSAGE_CHARS = 2000;
/** Sohbet geçmişinde taşınan en fazla tur sayısı (maliyet sınırı). */
const MAX_HISTORY_TURNS = 20;
/** Bağlama eklenen en fazla kart sayısı. */
const MAX_CARDS = 120;
/** Sesli cevap kısa olmalı; konuşma için 2000 token fazlasıyla yeter. */
const MAX_TOKENS = 2000;

type Turn = { role: "user" | "assistant"; content: string };

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean);
  const ok = origin && allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0] || "null",
    "Access-Control-Allow-Headers": "Content-Type, X-App-Passphrase",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

/**
 * Sesli pratik için sistem istemi. Kartlar buraya gömülür ki Claude
 * kullanıcının gerçekten çalıştığı kelimeler üzerinden konuşsun.
 */
function buildSystemPrompt(deckName: string, cards: Array<{ front: string; back: string }>, lang: string) {
  const list = cards.slice(0, MAX_CARDS).map((c) => `${c.front} = ${c.back}`).join("\n");
  const target = lang === "tr" ? "Türkçe" : "İngilizce";
  return `Sen bir dil pratiği arkadaşısın. Kullanıcı "${deckName}" adlı kart destesindeki kelimeleri çalışıyor ve seninle SESLİ konuşuyor — cevabın ekrana yazılmakla kalmayıp yüksek sesle okunacak.

Kurallar:
- ${target} konuş.
- Kısa konuş. En fazla 2-3 cümle. Bu bir sohbet, ders anlatımı değil.
- Sesli okunacağı için madde işareti, numaralı liste, markdown, emoji veya parantez içi açıklama KULLANMA. Düz, konuşma dilinde cümleler kur.
- Aşağıdaki kelimeleri sohbete doğal biçimde serpiştir. Kullanıcıyı bu kelimeleri kullanmaya teşvik et.
- Kullanıcı hata yaparsa önce anlamlı bir cevap ver, sonra tek cümleyle nazikçe düzelt.
- Kullanıcı zorlanırsa daha basit kelimelere in.

Destedeki kelimeler:
${list}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "Yalnızca POST" }, 405, cors);

    // --- parola kontrolü ---
    // Parola depoda değil; kullanıcı uygulamaya bir kez girer, tarayıcısında saklanır.
    const given = request.headers.get("X-App-Passphrase") || "";
    if (!env.APP_PASSPHRASE || given !== env.APP_PASSPHRASE) {
      return json({ error: "Parola yanlış." }, 401, cors);
    }

    let body: {
      message?: string;
      history?: Turn[];
      deckName?: string;
      cards?: Array<{ front: string; back: string }>;
      lang?: string;
    };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Geçersiz JSON." }, 400, cors);
    }

    const message = (body.message || "").trim();
    if (!message) return json({ error: "Boş mesaj." }, 400, cors);
    if (message.length > MAX_MESSAGE_CHARS) {
      return json({ error: `Mesaj çok uzun (en fazla ${MAX_MESSAGE_CHARS} karakter).` }, 400, cors);
    }

    const history = (Array.isArray(body.history) ? body.history : [])
      .filter((t) => t && (t.role === "user" || t.role === "assistant") && typeof t.content === "string")
      .slice(-MAX_HISTORY_TURNS)
      .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_MESSAGE_CHARS) }));

    const cards = (Array.isArray(body.cards) ? body.cards : [])
      .filter((c) => c && typeof c.front === "string" && typeof c.back === "string");

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    try {
      const stream = client.beta.messages.stream({
        model: "claude-opus-5",
        max_tokens: MAX_TOKENS,
        // Sohbet gecikmesi önemli; düşük efor hem hızlı hem ucuz.
        // Düşünmeyi kapatmak yerine eforu düşürmek öneriliyor.
        output_config: { effort: "low" },
        // Güvenlik sınıflandırıcısı isteği reddederse sunucu tarafında
        // uygun bir modele düşülsün, kullanıcı hata ekranı görmesin.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: [
          {
            type: "text",
            text: buildSystemPrompt(body.deckName || "deste", cards, body.lang === "tr" ? "tr" : "en"),
            // Kart listesi turlar arasında sabit; önbelleğe alınsın.
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [...history, { role: "user", content: message }],
      });

      // Metni tarayıcıya parça parça geçir ki cevap beklerken ekran donmasın.
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of stream) {
              if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
                controller.enqueue(encoder.encode(event.delta.text));
              }
            }
            const final = await stream.finalMessage();
            if (final.stop_reason === "refusal") {
              controller.enqueue(encoder.encode("\n[Bu isteğe cevap veremiyorum.]"));
            }
          } catch (err) {
            controller.enqueue(encoder.encode(`\n[Hata: ${(err as Error).message}]`));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: { ...cors, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    } catch (err) {
      const e = err as { status?: number; message?: string };
      if (e.status === 429) return json({ error: "Çok fazla istek, biraz bekle." }, 429, cors);
      if (e.status === 401) return json({ error: "API anahtarı geçersiz." }, 500, cors);
      console.error(err);
      return json({ error: "Claude'a ulaşılamadı: " + (e.message || "bilinmeyen hata") }, 502, cors);
    }
  },
};
