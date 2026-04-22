const SEALION_API_URL = "https://api.sealion.ai/normalize";
const TIMEOUT_MS = 5000;

export interface NormalizeResult {
  normalized: string;
  original: string;
  changed: boolean;
}

export async function normalizeSpeech(
  text: string,
  apiKey: string
): Promise<NormalizeResult> {
  const original = text;
  const unchanged: NormalizeResult = { normalized: text, original, changed: false };

  if (!apiKey.trim() || !text.trim()) return unchanged;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(SEALION_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        text,
        instructions:
          "You are a language assistant for elderly users in Singapore. Convert informal, mixed-language, or dialect speech (including Hokkien, Cantonese, Singlish, and mixed English-Chinese-Malay-Tamil) into clear and simple English commands. Return only the normalized command, nothing else.",
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return unchanged;

    const data = (await res.json()) as { normalized_text?: string };
    const normalized = (data.normalized_text ?? "").trim();
    if (!normalized) return unchanged;

    const changed = normalized.toLowerCase() !== text.toLowerCase();
    return { normalized, original, changed };
  } catch {
    clearTimeout(timer);
    return unchanged;
  }
}
