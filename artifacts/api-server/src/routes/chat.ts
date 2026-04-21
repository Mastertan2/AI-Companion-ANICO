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

function parseReminder(message: string): { task: string; time: string } | null {
  const lower = message.toLowerCase();
  if (!lower.includes("remind")) return null;

  const timeMatch = lower.match(/\b(\d{1,2})(?::|\.?)(\d{2})?\s*(am|pm)?\b/);
  if (!timeMatch) return null;

  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2] ?? "00");
  const meridiem = timeMatch[3];

  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;

  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const beforeTime = message.slice(0, message.toLowerCase().indexOf(timeMatch[0])).trim();
  const taskMatch = beforeTime.match(/remind me to\s+(.+)$/i) || beforeTime.match(/remind me\s+(.+)$/i);
  const task = (taskMatch?.[1] ?? beforeTime.replace(/remind me/i, "")).replace(/\s+(at|by|on)$/i, "").trim();
  if (!task) return null;

  return { task, time };
}

function parseSpotify(message: string): string | null {
  const lower = message.toLowerCase();
  if (!lower.includes("spotify")) return null;
  const query = message
    .replace(/spotify/gi, "")
    .replace(/play/gi, "")
    .replace(/music/gi, "")
    .replace(/song/gi, "")
    .replace(/\bon\b/gi, "")
    .trim();
  return query || "music";
}

function buildSystemPrompt(contacts: Array<{ name: string; phone: string; role?: string }> = []): string {
  const contactList = contacts.length > 0
    ? contacts.map((c) => `- ${c.name} (${c.role ?? "contact"}): ${c.phone}`).join("\n")
    : "(no contacts saved)";

  return `You are a warm, patient AI caregiving assistant for elderly users. Always use simple, clear language.

You MUST ALWAYS respond with valid JSON in EXACTLY this shape:
{"reply":"...","action":null}
OR
{"reply":"...","action":{"type":"...",...}}

The reply is spoken aloud, so keep it short and gentle. Never include text outside the JSON object.

Supported actions:
1. Maps navigation:
{"type":"open_maps","query":"place name"}
Use for: "go to", "take me to", "directions to", "navigate to".

2. YouTube:
{"type":"open_youtube","query":"search term"}
Use for: "play", "watch", "YouTube".

3. Spotify:
{"type":"open_spotify","query":"song artist topic"}
Use for: "play music on Spotify", "Spotify".

4. Google Search:
{"type":"google_search","query":"search term"}
Use for: "find", "search", "look up" when it is not a place or video/music request.

5. Open app:
{"type":"open_app","app":"singpass"}
{"type":"open_app","app":"whatsapp"}
{"type":"open_app","app":"googlemaps"}
{"type":"open_app","app":"youtube"}
{"type":"open_app","app":"calendar"}
{"type":"open_app","app":"healthhub"}
{"type":"open_app","app":"camera"}

6. Call contact:
{"type":"call_contact","name":"exact saved contact name"}
Use for: "call my daughter", "call John".

7. WhatsApp contact:
{"type":"whatsapp_contact","name":"exact saved contact name"}
Use for: "message my son", "WhatsApp Sarah", "text John".

8. Emergency:
{"type":"call_emergency"}
Use for: emergency, ambulance, police, call 999.

9. Reminder:
{"type":"set_reminder","time":"HH:MM","task":"task text"}
Use for: "remind me to take medicine at 8pm". Convert time to 24-hour HH:MM. If the time is unclear, action must be null and ask for the time.

Saved contacts:
${contactList}

Rules:
- Match contacts by exact name, relationship role, or obvious relationship words like daughter/son/child/doctor/friend.
- If there are multiple possible contacts, set action null and ask which person.
- If no contact matches, set action null and ask the user to add the contact.
- For "Play Jay Chou", prefer YouTube unless the user specifically says Spotify.
- For "Find receipt", use google_search.
- Respond in the user's language (English, Chinese, Malay, Tamil).`;
}

router.get("/", (_req, res): void => {
  res.json({ message: "Backend running" });
});

router.post("/chat", async (req, res): Promise<void> => {
  const { message, history, contacts } = req.body as {
    message?: unknown;
    history?: Array<{ role: string; content: string }>;
    language?: string;
    contacts?: Array<{ name: string; phone: string; role?: string }>;
  };

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "A 'message' string is required in the request body." });
    return;
  }

  const reminder = parseReminder(message);
  if (reminder) {
    res.json({
      reply: `Okay, I will remind you to ${reminder.task} at ${reminder.time}.`,
      action: { type: "set_reminder", time: reminder.time, task: reminder.task },
    });
    return;
  }

  const spotifyQuery = parseSpotify(message);
  if (spotifyQuery) {
    res.json({
      reply: `Okay, I will open Spotify for ${spotifyQuery}.`,
      action: { type: "open_spotify", query: spotifyQuery },
    });
    return;
  }

  const safeHistory = Array.isArray(history)
    ? history.filter((h) => h && typeof h === "object" && (h.role === "user" || h.role === "assistant") && typeof h.content === "string").slice(-8)
    : [];

  const safeContacts = Array.isArray(contacts)
    ? contacts.filter((c) => c?.name && c?.phone)
    : [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(safeContacts) },
        ...safeHistory.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
        { role: "user", content: message },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? '{"reply":"I am here to help!","action":null}';
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
