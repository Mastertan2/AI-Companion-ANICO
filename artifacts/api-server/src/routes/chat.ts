import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

if (!process.env.OPENAI_API_KEY) {
  logger.error("OPENAI_API_KEY environment variable is not set.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const router: IRouter = Router();

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

function buildSystemPrompt(
  contacts: Array<{ name: string; phone: string; role?: string }>,
  reminders: Array<{ task: string; time: string; completedAt?: string }>,
  lang: string,
  timeOfDay: string
): string {
  const contactList = contacts.length > 0
    ? contacts.map((c) => `- ${c.name} (${c.role ?? "contact"}): ${c.phone}`).join("\n")
    : "(no contacts saved)";

  const reminderList = reminders.length > 0
    ? reminders.map((r) => `- ${r.task} at ${r.time}${r.completedAt ? " [done]" : ""}`).join("\n")
    : "(no reminders)";

  const langInstruction =
    lang === "zh" ? "You MUST reply in Simplified Chinese only. Never switch to English, Malay, or Tamil." :
    lang === "ms" ? "You MUST reply in Malay (Bahasa Melayu) only. Never switch to English, Chinese, or Tamil." :
    lang === "ta" ? "You MUST reply in Tamil (தமிழ்) only. Never switch to English, Chinese, or Malay. Do NOT use question marks (?) in your reply — use native Tamil sentence endings instead." :
    "You MUST reply in English only. Never switch to Chinese, Malay, or Tamil.";

  return `You are a warm, patient AI companion for elderly users. Always use simple, short, clear sentences.

LANGUAGE RULE: ${langInstruction}

Current time of day: ${timeOfDay}

You MUST ALWAYS respond with valid JSON in EXACTLY this shape:
{"reply":"...","action":null}
OR
{"reply":"...","action":{"type":"...",...}}

The reply is spoken aloud — keep it short, gentle, friendly. Never include text outside the JSON object.
CRITICAL: The reply field must be a plain string. Never put JSON inside the reply field.

Supported actions:

1. Navigate (directions):
{"type":"navigate_maps","query":"destination name"}
Use for: "go to", "take me to", "directions to", "navigate to", "how do I get to".

2. Search maps (no directions needed):
{"type":"open_maps","query":"place name"}
Use for: "find nearby", "where is".

3. YouTube:
{"type":"open_youtube","query":"search term"}
Use for: "play", "watch", "YouTube", "show me".

4. Spotify:
{"type":"open_spotify","query":"song or artist"}
Use for: "Spotify", "play music on Spotify".

5. Google Search:
{"type":"google_search","query":"search term"}
Use for: "find", "search", "look up".

6. Open app:
{"type":"open_app","app":"singpass"} | "whatsapp" | "youtube" | "googlemaps" | "calendar" | "healthhub" | "camera"

7. Call contact (IMMEDIATELY, no confirmation needed):
{"type":"call_contact","name":"contact name or role"}
Use for: "call my [role/name]", "ring [name]", "phone [name]".
Match by name, role, or relationship word (son/daughter/child/doctor/friend).

8. WhatsApp with message:
{"type":"whatsapp_message","name":"contact name or role","message":"crafted message text"}
Use for: "text", "message", "WhatsApp", "send a message".
Craft a natural, polite message from what the user says.

9. WhatsApp open (no specific contact):
{"type":"whatsapp_contact","name":"contact name or role"}
Use when messaging but no specific message content given.

10. Emergency:
{"type":"call_emergency"}
Use for: emergency, ambulance, police, call 999.

11. Set reminder:
{"type":"set_reminder","time":"HH:MM","task":"task text"}
Convert to 24h HH:MM. If time is unclear, action null and ask.

12. Update reminder (mark done or cancel):
{"type":"update_reminder","action":"mark_done","task":"task name"}
{"type":"update_reminder","action":"cancel","task":"task name"}
Use for: "mark my medicine as done", "cancel my 8pm reminder", "I already took my medicine".
Match the task name to the closest reminder in the list.

Saved contacts:
${contactList}

Saved reminders:
${reminderList}

Rules:
- For "call my son" → immediately return call_contact action, reply "Calling your son now."
- For "text/message/WhatsApp my son I need to meet for lunch" → return whatsapp_message with crafted message.
- For "go to Bugis" → return navigate_maps (directions mode).
- For "find a clinic near me" → return open_maps (search mode).
- If multiple contacts match, pick the best one. If truly ambiguous, ask.
- Never add question marks (?) if language is Tamil (ta).
- Always confirm the action in the reply: "Calling John now", "Opening maps to Bugis", "Sending message to your son".`;
}

router.get("/", (_req, res): void => {
  res.json({ message: "Backend running" });
});

router.post("/chat", async (req, res): Promise<void> => {
  const { message, history, contacts, reminders, language } = req.body as {
    message?: unknown;
    history?: Array<{ role: string; content: string }>;
    language?: string;
    contacts?: Array<{ name: string; phone: string; role?: string }>;
    reminders?: Array<{ task: string; time: string; completedAt?: string }>;
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "A 'message' string is required in the request body." });
    return;
  }

  const lang = typeof language === "string" ? language : "en";
  const timeOfDay = getTimeOfDay();
  const safeHistory = Array.isArray(history)
    ? history.filter((h) => h && typeof h === "object" && (h.role === "user" || h.role === "assistant") && typeof h.content === "string").slice(-8)
    : [];
  const safeContacts = Array.isArray(contacts) ? contacts.filter((c) => c?.name && c?.phone) : [];
  const safeReminders = Array.isArray(reminders) ? reminders.slice(0, 20) : [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(safeContacts, safeReminders, lang, timeOfDay) },
        ...safeHistory.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content ?? '{"reply":"I am here to help!","action":null}';
    let parsed: { reply: string; action: unknown } = { reply: "", action: null };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { reply: raw, action: null };
    }

    const reply = typeof parsed.reply === "string" ? parsed.reply : raw;
    // Strip question marks for Tamil TTS
    const cleanReply = lang === "ta" ? reply.replace(/\?/g, "") : reply;
    const action = parsed.action && typeof parsed.action === "object" ? parsed.action : null;

    req.log.info({ messageLength: message.length, replyLength: cleanReply.length, hasAction: !!action }, "Chat request completed");
    res.json({ reply: cleanReply, action });
  } catch (err) {
    req.log.error({ err }, "Chat request failed");
    const errMsg =
      lang === "zh" ? "抱歉，暂时无法处理。请重试。" :
      lang === "ms" ? "Maaf, tidak dapat memproses. Sila cuba lagi." :
      lang === "ta" ? "மன்னிக்கவும், இயக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்." :
      "Sorry, I could not process that right now. Please try again.";
    res.status(500).json({ reply: errMsg, action: null });
  }
});

export default router;
