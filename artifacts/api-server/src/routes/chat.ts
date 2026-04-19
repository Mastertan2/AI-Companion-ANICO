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

const SYSTEM_PROMPT = `You are a friendly and patient assistant designed to help elderly users with their phone and technology questions.

Always follow these rules:
- Use simple, clear language. Avoid technical jargon.
- Keep your answers short — no more than 3 or 4 sentences.
- Be encouraging and reassuring. Never make the user feel embarrassed for asking.
- If the user seems confused, gently offer to explain again in a different way.
- Focus on one step at a time when giving instructions.
- Use everyday words everyone understands.`;

router.get("/", (_req, res): void => {
  res.json({ message: "Backend running" });
});

router.post("/chat", async (req, res): Promise<void> => {
  const { message } = req.body as { message?: unknown };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "A 'message' string is required in the request body." });
    return;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message },
    ],
  });

  const reply = completion.choices[0]?.message?.content ?? "";

  req.log.info({ messageLength: message.length, replyLength: reply.length }, "Chat request completed");

  res.json({ reply });
});

export default router;
