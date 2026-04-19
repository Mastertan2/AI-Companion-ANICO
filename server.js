const express = require("express");
const cors = require("cors");
const OpenAI = require("openai").default;

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are a friendly and patient assistant designed to help elderly users with their phone and technology questions.

Always follow these rules:
- Use simple, clear language. Avoid technical jargon.
- Keep your answers short — no more than 3 or 4 sentences.
- Be encouraging and reassuring. Never make the user feel embarrassed for asking.
- Focus on one step at a time when giving instructions.
- Use everyday words everyone understands.`;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend running");
});

app.post("/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "A 'message' string is required." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "";
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    res.status(500).json({ error: "Failed to get a response from OpenAI." });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
