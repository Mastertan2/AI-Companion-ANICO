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

function getTodayDateStr(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function getTomorrowDateStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function buildSystemPrompt(
  contacts: Array<{ name: string; phone: string; role?: string }>,
  reminders: Array<{ task: string; time: string; date?: string; completedAt?: string }>,
  lang: string,
  timeOfDay: string
): string {
  const contactList = contacts.length > 0
    ? contacts.map((c) => `- ${c.name} (${c.role ?? "contact"}): ${c.phone}`).join("\n")
    : "(no contacts saved)";

  const reminderList = reminders.length > 0
    ? reminders.map((r) => `- ${r.task} at ${r.time}${r.date ? ` on ${r.date}` : ""}${r.completedAt ? " [done]" : ""}`).join("\n")
    : "(no reminders)";

  const langInstruction =
    lang === "zh" ? "You MUST reply in Simplified Chinese only. Never switch to English, Malay, or Tamil." :
    lang === "ms" ? "You MUST reply in Malay (Bahasa Melayu) only. Never switch to English, Chinese, or Tamil." :
    lang === "ta" ? "You MUST reply in Tamil (தமிழ்) only. Never switch to English, Chinese, or Malay. CRITICAL: Do NOT use question marks (?) anywhere in your reply — end questions with a comma or just omit the mark entirely." :
    "You MUST reply in English only. Never switch to Chinese, Malay, or Tamil.";

  const todayStr = getTodayDateStr();
  const tomorrowStr = getTomorrowDateStr();

  return `You are a warm, patient AI companion for elderly users. Always use simple, short, clear sentences.

LANGUAGE RULE: ${langInstruction}

Current time of day: ${timeOfDay}
Today's date: ${todayStr}
Tomorrow's date: ${tomorrowStr}

You MUST ALWAYS respond with valid JSON in EXACTLY this shape:
{"reply":"...","action":null}
OR
{"reply":"...","action":{"type":"...",...}}

The reply is spoken aloud — keep it short, gentle, friendly. Never include text outside the JSON object.
CRITICAL: The reply field must be a plain string. Never put JSON inside the reply field.

Supported actions:

1. Navigate (directions mode — auto-open turn-by-turn):
{"type":"navigate_maps","query":"destination name"}
Use for: "go to", "take me to", "directions to", "navigate to".

2. Search maps (no directions):
{"type":"open_maps","query":"place name"}
Use for: "find nearby", "where is".

3. YouTube:
{"type":"open_youtube","query":"search term"}
Use for: "play", "watch", "YouTube".

4. Spotify:
{"type":"open_spotify","query":"song or artist"}
Use for: "Spotify", "play music on Spotify".

5. Google Search:
{"type":"google_search","query":"search term"}
Use for: "find", "search", "look up".

6. Open app:
{"type":"open_app","app":"singpass"} | "whatsapp" | "youtube" | "googlemaps" | "calendar" | "healthhub" | "camera" | "clock"

7. Call contact (triggers immediately):
{"type":"call_contact","name":"contact name or role"}

8. WhatsApp with pre-filled message:
{"type":"whatsapp_message","name":"contact name or role","message":"crafted message"}
Use when a specific message is given.

9. WhatsApp open (no specific message):
{"type":"whatsapp_contact","name":"contact name or role"}

10. Emergency:
{"type":"call_emergency"}
Use for: emergency, ambulance, police, call 999.

11. Set reminder WITH optional date:
{"type":"set_reminder","time":"HH:MM","task":"task text","date":"YYYY-MM-DD"}
- Convert time to 24h HH:MM format.
- "today" → use ${todayStr}
- "tomorrow" → use ${tomorrowStr}
- If no date mentioned, omit the date field.
- If time unclear, ask for it.

12. Update reminder (done/cancel by voice):
{"type":"update_reminder","action":"mark_done","task":"task name"}
{"type":"update_reminder","action":"cancel","task":"task name"}

13. Set alarm:
{"type":"set_alarm","time":"HH:MM","label":"alarm label"}
Use for: "set alarm", "wake me up", "alarm for 7am".
Convert to 24h HH:MM. Reply with a confirmation like "I will try to open the clock app for you to set the alarm."

Saved contacts:
${contactList}

Saved reminders:
${reminderList}

Rules:
- For "call my son" → call_contact, reply "Calling your son now."
- For "text/WhatsApp my son I need lunch tomorrow" → whatsapp_message with crafted polite message.
- For "go to Bugis" → navigate_maps.
- For "find a clinic" → open_maps.
- For "set alarm at 7am" → set_alarm, reply with confirmation.
- Always confirm the action in the reply: "Calling John now", "Opening maps to Bugis", "Setting reminder for 8 PM tomorrow".
- Do NOT add question marks (?) if language is Tamil.`;
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
    reminders?: Array<{ task: string; time: string; date?: string; completedAt?: string }>;
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
      temperature: 0.35,
    });

    const raw = completion.choices[0]?.message?.content ?? '{"reply":"I am here to help!","action":null}';
    let parsed: { reply: string; action: unknown } = { reply: "", action: null };
    try { parsed = JSON.parse(raw); } catch { parsed = { reply: raw, action: null }; }

    const reply = typeof parsed.reply === "string" ? parsed.reply : raw;
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
