import { Router, type IRouter } from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";
import { logger } from "../lib/logger";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router: IRouter = Router();

router.post("/transcribe", upload.single("audio"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No audio file provided." });
    return;
  }

  try {
    const audioFile = await toFile(req.file.buffer, "audio.m4a", {
      type: req.file.mimetype || "audio/m4a",
    });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    req.log.info({ length: transcription.text.length }, "Transcription complete");
    res.json({ text: transcription.text });
  } catch (err) {
    logger.error({ err }, "Transcription failed");
    res.status(500).json({ error: "Transcription failed." });
  }
});

export default router;
