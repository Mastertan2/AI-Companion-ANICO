import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.post("/normalize", async (req: Request, res: Response) => {
  const { text, language } = req.body as { text?: string; language?: string };

  if (!text?.trim()) {
    res.json({ normalized: text ?? "", changed: false });
    return;
  }

  const apiKey = process.env.SEALION_API_KEY;
  if (!apiKey) {
    res.json({ normalized: text, changed: false });
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const sealionRes = await fetch("https://api.aisingapore.org/v1/sea-lion/normalize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        text,
        instructions:
          "You are a language assistant for elderly users in Singapore. Convert informal, mixed-language, or dialect speech (including Hokkien, Cantonese, Singlish, and mixed English-Chinese-Malay-Tamil) into clear and simple standard English commands. Return only the normalized command, nothing else.",
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!sealionRes.ok) {
      res.json({ normalized: text, changed: false });
      return;
    }

    const data = (await sealionRes.json()) as { normalized_text?: string };
    const normalized = (data.normalized_text ?? "").trim();

    if (!normalized) {
      res.json({ normalized: text, changed: false });
      return;
    }

    const changed = normalized.toLowerCase() !== text.toLowerCase();
    res.json({ normalized, changed });
  } catch {
    clearTimeout(timer);
    res.json({ normalized: text, changed: false });
  }
});

export default router;
