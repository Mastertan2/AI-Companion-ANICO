import { Router, type IRouter } from "express";

const router: IRouter = Router();

type ContactRole = "child" | "friend" | "doctor";

interface AlertContact {
  name?: string;
  phone?: string;
  role?: ContactRole;
}

interface AlertBody {
  userName?: string;
  message?: string;
  contacts?: AlertContact[];
  includedData?: Record<string, unknown>;
}

function cleanPhone(phone: string): string {
  return phone.replace(/[\s()-]/g, "");
}

function buildSmsBody(message: string, includedData?: Record<string, unknown>): string {
  const details: string[] = [];
  if (includedData?.checkInStatus) details.push(`Last check-in: ${includedData.checkInStatus}`);
  if (includedData?.status) details.push(`Status: ${includedData.status}`);
  if (includedData?.lastActivity) details.push(`Last activity: ${includedData.lastActivity}`);
  if (includedData?.location) details.push(`Location: ${includedData.location}`);
  if (Array.isArray(includedData?.reminders) && includedData.reminders.length > 0) {
    details.push(`Reminders: ${includedData.reminders.length}`);
  }
  return details.length > 0 ? `${message}\n\n${details.join("\n")}` : message;
}

async function sendTwilioSms(to: string, body: string): Promise<Response> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || !from) {
    throw new Error("SMS_NOT_CONFIGURED");
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams();
  params.set("To", to);
  params.set("From", from);
  params.set("Body", body);

  return fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
}

router.post("/alert", async (req, res): Promise<void> => {
  const body = req.body as AlertBody;
  const message = typeof body.message === "string" && body.message.trim()
    ? body.message.trim()
    : `Hi, I haven’t heard from ${body.userName || "your loved one"} for a while. Please check on them.`;
  const childContacts = Array.isArray(body.contacts)
    ? body.contacts.filter((c) => c.role === "child" && typeof c.phone === "string" && c.phone.trim())
    : [];

  if (childContacts.length === 0) {
    res.status(400).json({ error: "No child contacts provided for alert delivery." });
    return;
  }

  const smsBody = buildSmsBody(message, body.includedData);

  try {
    const results = await Promise.all(
      childContacts.map(async (contact) => {
        const to = cleanPhone(contact.phone!);
        const response = await sendTwilioSms(to, smsBody);
        return { name: contact.name, phone: to, ok: response.ok, status: response.status };
      })
    );

    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      req.log.error({ failed }, "Some SMS alerts failed");
      res.status(502).json({ sent: results.length - failed.length, failed });
      return;
    }

    req.log.info({ count: results.length }, "SMS alerts sent");
    res.json({ sent: results.length });
  } catch (err) {
    if (err instanceof Error && err.message === "SMS_NOT_CONFIGURED") {
      req.log.warn("SMS alert requested but Twilio secrets are not configured");
      res.status(503).json({ error: "SMS provider is not configured. Add Twilio secrets to enable automatic SMS alerts." });
      return;
    }
    req.log.error({ err }, "SMS alert failed");
    res.status(500).json({ error: "Failed to send SMS alert." });
  }
});

export default router;
