import { getApiBase } from "@/utils/api";

export interface NormalizeResult {
  normalized: string;
  original: string;
  changed: boolean;
}

export async function normalizeSpeech(
  text: string,
  _apiKey?: string
): Promise<NormalizeResult> {
  const original = text;
  const unchanged: NormalizeResult = { normalized: text, original, changed: false };

  if (!text.trim()) return unchanged;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`${getApiBase()}/normalize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return unchanged;

    const data = (await res.json()) as { normalized?: string; changed?: boolean };
    const normalized = (data.normalized ?? "").trim();
    if (!normalized) return unchanged;

    return { normalized, original, changed: data.changed ?? false };
  } catch {
    clearTimeout(timer);
    return unchanged;
  }
}
