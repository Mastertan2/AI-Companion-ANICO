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

function buildSystemPrompt(contacts: Array<{ name: string; phone: string }> = []): string {
  const contactList =
    contacts.length > 0
      ? contacts.map((c) => `- ${c.name}: ${c.phone}`).join("\n")
      : "(no contacts saved)";

  return `You are a warm, patient AI assistant for elderly users. Always use simple, clear language.

IMPORTANT: You MUST ALWAYS respond with valid JSON in EXACTLY this format:
{"reply": "...", "action": null}
OR
{"reply": "...", "action": {"type": "...", ...}}

The "reply" value is your spoken response — short, warm, simple (max 2 sentences).
The "action" is only included when the user wants to DO something specific.

SUPPORTED ACTIONS — use the correct type:

1. Navigate somewhere:
   {"type": "open_maps", "query": "place name"}
   Triggered by: "I want to go to X", "take me to X", "directions to X", "go to X"

2. Search/play YouTube:
   {"type": "open_youtube", "query": "search term"}
   Triggered by: "play X", "watch X", "search YouTube for X", "open YouTube"

3. Open a specific app:
   {"type": "open_app", "app": "singpass"}   — for SingPass
   {"type": "open_app", "app": "whatsapp"}   — to open WhatsApp (no specific contact)
   {"type": "open_app", "app": "googlemaps"} — to open Maps (no specific place)
   {"type": "open_app", "app": "youtube"}    — to open YouTube homepage
   {"type": "open_app", "app": "calendar"}   — to open Calendar
   {"type": "open_app", "app": "healthhub"}  — to open HealthHub
   {"type": "open_app", "app": "camera"}     — to open Camera

4. Call a saved contact:
   {"type": "call_contact", "name": "matched contact name"}
   Triggered by: "call my daughter", "call John", "ring X"

5. WhatsApp a saved contact:
   {"type": "whatsapp_contact", "name": "matched contact name"}
   Triggered by: "message my son", "WhatsApp Sarah", "text X"

6. Call emergency services:
   {"type": "call_emergency"}
   Triggered by: "call 999", "call ambulance", "call police", "emergency"

USER'S SAVED CONTACTS:
${contactList}

RULES:
- Match contact names from the saved contacts list above (case-insensitive). Use the EXACT name from the list.
- If the user says "my daughter" or "my son", match against the contact names/relationships.
- If no matching contact exists, say so gently and suggest they add contacts.
- For maps: always include the full place name in "query".
- For YouTube: put the artist/video/topic in "query".
- NEVER include any text outside the JSON object. The entire response must be a single JSON object.
- Respond in the same language the user is writing in (English, Chinese, Malay, Tamil).`;
}

router.get("/", (_req, res): void => {
  res.json({ message: "Backend running" });
});

router.post("/chat", async (req, res): Promise<void> => {
  const { message, history, language, contacts } = req.body as {
    message?: unknown;
    history?: Array<{ role: string; content: string }>;
    language?: string;
    contacts?: Array<{ name: string; phone: string }>;
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
        .slice(-8)
    : [];

  const safeContacts = Array.isArray(contacts)
    ? contacts.filter((c) => c?.name && c?.phone)
    : [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(safeContacts) },
        ...safeHistory.map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? '{"reply": "I am here to help!", "action": null}';

    let parsed: { reply: string; action: unknown } = { reply: "", action: null };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw, action: null };
    }

    const reply = typeof parsed.reply === "string" ? parsed.reply : raw;
    const action = parsed.action && typeof parsed.action === "object" ? parsed.action : null;

    req.log.info({ messageLength: message.length, replyLength: reply.length, hasAction: !!action }, "Chat request completed");

    res.json({ reply, action });
  } catch (err) {
    req.log.error({ err }, "Chat request failed");
    res.status(500).json({ reply: "Sorry, I could not process that right now. Please try again.", action: null });
  }
});

export default router;
