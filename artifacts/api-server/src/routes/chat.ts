import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

if (!process.env.OPENAI_API_KEY) {
  logger.error("OPENAI_API_KEY environment variable is not set.");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are a warm, patient, and friendly assistant designed specifically to help elderly users.

Always follow these rules:
- Use very simple, clear language. Avoid all technical jargon.
- Keep your answers short — no more than 3 to 4 sentences.
- Be encouraging, gentle, and reassuring. Never make the user feel embarrassed or confused.
- If the user seems unsure, offer to explain again in a simpler way.
- Focus on one step at a time when giving instructions.
- Use everyday words that everyone understands.
- Respond in the same language the user is writing in. If they write in Chinese, respond in Chinese. If in Malay, respond in Malay. If in Tamil, respond in Tamil.`;

router.get("/", (_req, res): void => {
  res.json({ message: "Backend running" });
});

router.post("/chat", async (req, res): Promise<void> => {
  const { message, history } = req.body as {
    message?: unknown;
    history?: Array<{ role: string; content: string }>;
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "A 'message' string is required in the request body." });
    return;
  }

  const safeHistory = Array.isArray(history)
    ? history
        .filter(
          (h) =>
            h &&
            typeof h === "object" &&
            (h.role === "user" || h.role === "assistant") &&
            typeof h.content === "string"
        )
        .slice(-10)
    : [];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...safeHistory.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ],
  });

  const reply = completion.choices[0]?.message?.content ?? "";

  req.log.info({ messageLength: message.length, replyLength: reply.length }, "Chat request completed");

  res.json({ reply });
});

export default router;
